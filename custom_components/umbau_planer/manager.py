"""Runtime manager: owns the data, persists it, derives views and fires events."""
from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import date, datetime, timedelta
from typing import Any, TypeVar

from homeassistant.components import persistent_notification
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import EVENT_PREREQUISITE_WARNING, EVENT_TIMER_LONG_RUNNING, NAME
from .core import ops, plan, stats, timer
from .core.migrate import migrate, validate_structure
from .core.models import (
    ACTIVE_STATUSES,
    SCHEMA_VERSION,
    PlannerData,
    PlannerError,
    parse_dt,
)
from .core.priorities import compute_priorities, sort_key
from .core.readiness import compute_readiness
from .core.tree import (
    ancestors,
    children_map,
    compute_summaries,
    entry_minutes,
    preorder,
    project_of,
)
from .store import UmbauStore, async_backup

_LOGGER = logging.getLogger(__name__)
T = TypeVar("T")


class PlannerManager:
    """Holds :class:`PlannerData` and everything derived from it."""

    def __init__(self, hass: HomeAssistant, store: UmbauStore, data: PlannerData) -> None:
        self.hass = hass
        self.store = store
        self.data = data
        self.rev = 0
        self._listeners: list[Callable[[], None]] = []
        self._alerted: set[str] = set()
        self._warned: set[tuple[str, str]] = set()
        self._unsub_tick: CALLBACK_TYPE | None = None
        self._cache: tuple[Any, dict[str, Any]] | None = None

    # ------------------------------------------------------------ lifecycle

    @callback
    def async_start(self) -> None:
        self._warned = {
            (w["entry_id"], w["prerequisite_id"])
            for w in plan.plan_warnings(self.data)
            if w["fixed"]
        }
        self._unsub_tick = async_track_time_interval(
            self.hass, self._async_tick, timedelta(minutes=1)
        )

    @callback
    def async_stop(self) -> None:
        if self._unsub_tick:
            self._unsub_tick()
            self._unsub_tick = None

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> CALLBACK_TYPE:
        self._listeners.append(listener)

        @callback
        def remove() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return remove

    @callback
    def _notify(self) -> None:
        for listener in list(self._listeners):
            try:
                listener()
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Listener failed")

    # ------------------------------------------------------------ time helpers

    @property
    def tz(self):
        return dt_util.get_default_time_zone()

    def now(self) -> datetime:
        return dt_util.utcnow()

    def today(self) -> date:
        return dt_util.now().date()

    # ------------------------------------------------------------ mutation

    async def async_mutate(self, func: Callable[[PlannerData], T]) -> T:
        """Run ``func`` on the data; roll back on error, persist and notify on success."""
        snapshot = self.data.to_dict()
        try:
            result = func(self.data)
        except Exception:
            self.data = PlannerData.from_dict(snapshot)
            raise
        await self._async_after_change()
        return result

    async def _async_after_change(self) -> None:
        self.rev += 1
        self._cache = None
        await self.store.async_save(self.data.to_dict())
        self._check_warnings()
        self._check_timer_alert()
        self._notify()

    # ------------------------------------------------------------ events

    def _check_warnings(self) -> None:
        current = {
            (w["entry_id"], w["prerequisite_id"]): w
            for w in plan.plan_warnings(self.data)
            if w["fixed"]
        }
        for key, warning in current.items():
            if key not in self._warned:
                self.hass.bus.async_fire(
                    EVENT_PREREQUISITE_WARNING,
                    {
                        "task_id": warning["task_id"],
                        "task": warning["task_title"],
                        "prerequisite_id": warning["prerequisite_id"],
                        "prerequisite": warning["prerequisite_title"],
                        "date": warning["date"],
                        "reason": warning["reason"],
                    },
                )
        self._warned = set(current)

    def _check_timer_alert(self) -> None:
        running = timer.running_entry(self.data)
        for entry_id in list(self._alerted):
            if running is None or running.id != entry_id:
                self._alerted.discard(entry_id)
                persistent_notification.async_dismiss(
                    self.hass, f"umbau_planer_timer_{entry_id}"
                )
        if running is None or running.id in self._alerted:
            return
        reason = timer.timer_alert(
            running, self.now(), self.data.settings.long_timer_min, self.tz
        )
        if reason is None:
            return
        self._alerted.add(running.id)
        task = self.data.tasks.get(running.task_id)
        title = task.title if task else "?"
        minutes = entry_minutes(running.start, None, self.now())
        persistent_notification.async_create(
            self.hass,
            f"Die Uhr läuft seit {minutes // 60} h {minutes % 60} min auf „{title}“. "
            "Bitte ausstempeln, falls die Arbeit beendet ist.",
            title=f"{NAME}: Uhr läuft lange",
            notification_id=f"umbau_planer_timer_{running.id}",
        )
        self.hass.bus.async_fire(
            EVENT_TIMER_LONG_RUNNING,
            {
                "task_id": running.task_id,
                "task": title,
                "started": running.start,
                "elapsed_min": minutes,
                "reason": reason,
            },
        )

    async def _async_tick(self, _now: datetime) -> None:
        self._cache = None
        self._check_timer_alert()
        self._notify()

    # ------------------------------------------------------------ derived data

    def _computed(self) -> dict[str, Any]:
        now = self.now()
        key = (self.rev, now.replace(second=0, microsecond=0), self.today())
        if self._cache and self._cache[0] == key:
            return self._cache[1]
        data = self.data
        value = {
            "summaries": compute_summaries(data, now),
            "priorities": compute_priorities(data),
            "readiness": compute_readiness(data, self.today()),
            "children": children_map(data.tasks),
        }
        self._cache = (key, value)
        return value

    def metrics(self) -> dict[str, Any]:
        """Values for the Home Assistant entities."""
        data = self.data
        now = self.now()
        comp = self._computed()
        today = self.today().isoformat()
        days = timer.totals_by_day(data, now, self.tz)
        planned_today = sum(
            e.planned_min
            for e in data.entries.values()
            if not e.superseded
            and e.block_id in data.blocks
            and data.blocks[e.block_id].date == today
        )
        roots = comp["children"].get(None, [])
        rest_by_project = {
            r.title: round(comp["summaries"][r.id]["remaining_min"] / 60, 2)
            for r in roots
            if r.status in ACTIVE_STATUSES
        }
        ready = [
            tid
            for tid, info in comp["readiness"].items()
            if info["ready"] and info["leaf"]
        ]
        running = timer.running_entry(data)
        active: dict[str, Any] = {"title": None}
        if running:
            task = data.tasks.get(running.task_id)
            active = {
                "title": task.title if task else "?",
                "task_id": running.task_id,
                "project": data.tasks[project_of(data.tasks, running.task_id)].title
                if task
                else None,
                "started": running.start,
                "elapsed_min": entry_minutes(running.start, None, now),
            }
        return {
            "active": active,
            "running": running is not None,
            "booked_today_min": days.get(today, {}).get("own", 0),
            "planned_today_min": planned_today,
            "rest_total_min": sum(
                comp["summaries"][r.id]["remaining_min"]
                for r in roots
                if r.status in ACTIVE_STATUSES
            ),
            "rest_by_project": rest_by_project,
            "ready_count": len(ready),
            "disagree_count": sum(
                1
                for tid, p in comp["priorities"].items()
                if p["disagree"] and data.tasks[tid].status in ACTIVE_STATUSES
            ),
        }

    def build_state(self, user_id: str | None, is_admin: bool) -> dict[str, Any]:
        data = self.data
        now = self.now()
        today = self.today()
        comp = self._computed()
        summaries, prios, ready = comp["summaries"], comp["priorities"], comp["readiness"]
        planned = plan.planned_per_task(data, today)
        person = ops.person_for_user(data, user_id)
        order = preorder(comp["children"])

        tasks_out = []
        for tid in order:
            task = data.tasks[tid]
            tasks_out.append(
                {
                    **task.to_dict(),
                    "depth": len(ancestors(data.tasks, tid)),
                    "project_id": project_of(data.tasks, tid),
                    "has_children": bool(comp["children"].get(tid)),
                    "frozen": bool(task.estimate_frozen_at),
                    "summary": summaries[tid],
                    "priority": prios[tid],
                    "ready": ready[tid]["ready"],
                    "reasons": ready[tid]["reasons"],
                    "waiting_due": ready[tid]["waiting_due"],
                    "planned_min": planned.get(tid, 0),
                }
            )
        day_cache: dict[str, dict[str, int]] = {}
        entries_out = []
        for entry in data.entries.values():
            item = entry.to_dict()
            block = data.blocks.get(entry.block_id) if entry.block_id else None
            if block is not None and plan.block_is_past(block, today):
                if block.date not in day_cache:
                    day_cache[block.date] = timer.minutes_on_day_for_task(
                        data, block.date, self.tz, now
                    )
                item["booked_min"] = day_cache[block.date].get(entry.task_id, 0)
            entries_out.append(item)
        blocks_out = [
            {
                **b.to_dict(),
                "fill_min": plan.block_fill(data.entries, b.id),
                "overbooked": plan.block_fill(data.entries, b.id) > b.capacity_min,
                "past": plan.block_is_past(b, today),
            }
            for b in plan.sorted_blocks(data.blocks)
        ]
        ready_ids = sorted(
            (tid for tid, info in ready.items() if info["ready"] and info["leaf"]),
            key=lambda t: sort_key(prios[t]),
        )
        disagree_ids = sorted(
            (
                tid
                for tid, p in prios.items()
                if p["disagree"] and data.tasks[tid].status in ACTIVE_STATUSES
            ),
            key=lambda t: (-prios[t]["distance"], prios[t]["order_index"]),
        )
        running = timer.running_entry(data)
        return {
            "rev": self.rev,
            "schema_version": SCHEMA_VERSION,
            "now": now.isoformat(),
            "today": today.isoformat(),
            "timezone": str(self.tz),
            "me": {
                "person_id": person.id if person else None,
                "role": person.role if person else None,
                "can_edit": ops.can_edit(data, user_id, is_admin),
                "is_admin": is_admin,
            },
            "settings": data.settings.to_dict(),
            "tasks": tasks_out,
            "blocks": blocks_out,
            "entries": entries_out,
            "warnings": plan.plan_warnings(data),
            "ready_ids": ready_ids,
            "disagree_ids": disagree_ids,
            "timer": {
                "running": running.to_dict() if running else None,
                "last_task_id": data.last_task_id,
                "can_undo_switch": bool(data.switch_undo),
            },
            "can_undo_rollover": bool(data.rollover_undo),
        }

    def time_entries(self, start: str | None, end: str | None) -> dict[str, Any]:
        """Bookings in a local date range plus day and week totals (T-11)."""
        now = self.now()
        tz = self.tz
        items = []
        for entry in self.data.time_entries.values():
            local_day = parse_dt(entry.start).astimezone(tz).date().isoformat()
            if start and local_day < start:
                continue
            if end and local_day > end:
                continue
            item = entry.to_dict()
            item["minutes"] = entry_minutes(entry.start, entry.end, now)
            item["day"] = local_day
            task = self.data.tasks.get(entry.task_id)
            item["task_title"] = task.title if task else "?"
            items.append(item)
        items.sort(key=lambda i: i["start"], reverse=True)
        days = timer.totals_by_day(self.data, now, tz)
        return {
            "entries": items,
            "days": {d: v for d, v in days.items() if (not start or d >= start) and (not end or d <= end)},
            "weeks": timer.totals_by_week(days),
        }

    def evaluation(self) -> dict[str, Any]:
        return stats.compute_evaluation(self.data, self.now(), self.tz)

    # ------------------------------------------------------------ export / import

    def export_data(self) -> dict[str, Any]:
        return self.data.to_dict()

    async def async_import(self, payload: dict[str, Any]) -> None:
        validate_structure(payload)
        migrated = migrate(dict(payload))
        new_data = PlannerData.from_dict(migrated)
        for task in new_data.tasks.values():
            if task.parent_id is not None and task.parent_id not in new_data.tasks:
                raise PlannerError(
                    "invalid_import",
                    f"Aufgabe „{task.title}“ verweist auf eine fehlende übergeordnete Aufgabe.",
                )
        await async_backup(self.hass, "import", self.data.to_dict())
        self.data = new_data
        self._alerted.clear()
        self._warned.clear()
        await self._async_after_change()
