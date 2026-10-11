"""Mutating operations on :class:`PlannerData`.

Every function validates the business rules of the Pflichtenheft and raises
:class:`PlannerError` on a violation. Functions never touch Home Assistant.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from .models import (
    ACTIVE_STATUSES,
    DISCARDED,
    DONE,
    FINISHED_STATUSES,
    IN_PROGRESS,
    LIST_RESCHEDULE,
    LIST_UNSCHEDULED,
    MODES,
    OPEN,
    ROLE_EXECUTOR,
    STATUSES,
    PlanEntry,
    PlannerData,
    PlannerError,
    Person,
    Settings,
    Task,
    TimeEntry,
    WorkBlock,
    to_iso,
)
from .plan import block_fill, block_is_past, renumber
from .priorities import rescale_level
from .readiness import has_cycle
from .timer import running_entry, validate_booking
from .tree import (
    ancestors,
    children_map,
    compute_summaries,
    descendants,
)

# ------------------------------------------------------------------ helpers


def get_task(data: PlannerData, task_id: str) -> Task:
    task = data.tasks.get(task_id)
    if task is None:
        raise PlannerError("not_found", "Aufgabe nicht gefunden.")
    return task


def _siblings(data: PlannerData, parent_id: str | None) -> list[Task]:
    return children_map(data.tasks).get(parent_id, [])


def _renumber_siblings(data: PlannerData, parent_id: str | None) -> None:
    for idx, sibling in enumerate(_siblings(data, parent_id)):
        sibling.order = idx


def has_bookings(data: PlannerData, task_id: str) -> bool:
    return any(e.task_id == task_id for e in data.time_entries.values())


def _touch_plan(data: PlannerData) -> None:
    """Any manual plan change invalidates the roll-over undo (N-8)."""
    data.rollover_undo = None


# ------------------------------------------------------------------ tasks

_EDITABLE = {
    "title",
    "notes",
    "category",
    "children_mode",
    "estimate_initial_min",
    "remaining_min",
    "waiting_for",
    "waiting_until",
    "blocked_by",
    "status",
}


def create_task(
    data: PlannerData,
    title: str,
    parent_id: str | None = None,
    now: datetime | None = None,
    **fields: Any,
) -> Task:
    title = (title or "").strip()
    if not title:
        raise PlannerError("invalid", "Der Titel darf nicht leer sein.")
    if parent_id is not None:
        get_task(data, parent_id)
    task = Task(title=title, parent_id=parent_id)
    if now is not None:
        task.created_at = to_iso(now)
    task.order = len(_siblings(data, parent_id))
    data.tasks[task.id] = task
    extra = {k: v for k, v in fields.items() if k in _EDITABLE and v is not None}
    try:
        if extra:
            update_task(data, task.id, extra, now=now)
    except PlannerError:
        del data.tasks[task.id]
        raise
    if parent_id is not None:
        refresh_parent_status(data, parent_id, now, new_child=True)
    return task


def update_task(
    data: PlannerData,
    task_id: str,
    fields: dict[str, Any],
    now: datetime | None = None,
) -> Task:
    task = get_task(data, task_id)
    unknown = set(fields) - _EDITABLE
    if unknown:
        raise PlannerError("invalid", f"Unbekannte Felder: {', '.join(sorted(unknown))}")
    snapshot = task.to_dict()
    try:
        for key, value in fields.items():
            if key == "title":
                value = (value or "").strip()
                if not value:
                    raise PlannerError("invalid", "Der Titel darf nicht leer sein.")
                task.title = value
            elif key == "notes":
                task.notes = value or ""
            elif key == "category":
                task.category = value or None
            elif key == "children_mode":
                if value not in MODES:
                    raise PlannerError("invalid", "Ungültiger Modus.")
                task.children_mode = value
            elif key == "estimate_initial_min":
                _set_estimate(data, task, value, now)
            elif key == "remaining_min":
                task.remaining_min = None if value is None else max(0, int(value))
            elif key == "waiting_for":
                task.waiting_for = (value or "").strip() or None
                if not task.waiting_for:
                    task.waiting_until = None
            elif key == "waiting_until":
                task.waiting_until = value or None
            elif key == "blocked_by":
                _set_blocked_by(data, task, list(value or []))
            elif key == "status":
                set_status(data, task_id, value, now)
        if has_cycle(data):
            raise PlannerError(
                "cycle", "Diese Änderung würde einen Zirkelbezug erzeugen."
            )
    except PlannerError:
        _restore_task(data, task, snapshot)
        raise
    return task


def _restore_task(data: PlannerData, task: Task, snapshot: dict[str, Any]) -> None:
    for key, value in Task.from_dict(snapshot).to_dict().items():
        setattr(task, key, value)


def _set_estimate(
    data: PlannerData, task: Task, value: int | None, now: datetime | None
) -> None:
    if value is None:
        if task.estimate_frozen_at:
            raise PlannerError(
                "frozen", "Die ursprüngliche Schätzung ist eingefroren."
            )
        task.estimate_initial_min = None
        return
    value = max(0, int(value))
    if task.estimate_frozen_at and task.estimate_initial_min != value:
        raise PlannerError("frozen", "Die ursprüngliche Schätzung ist eingefroren.")
    if task.estimate_frozen_at:
        return
    task.estimate_initial_min = value
    if has_bookings(data, task.id):
        task.estimate_frozen_at = to_iso(now) if now else None


def _set_blocked_by(data: PlannerData, task: Task, blockers: list[str]) -> None:
    for blocker in blockers:
        if blocker == task.id:
            raise PlannerError("cycle", "Eine Aufgabe kann sich nicht selbst blockieren.")
        if blocker not in data.tasks:
            raise PlannerError("not_found", "Blockierende Aufgabe nicht gefunden.")
    task.blocked_by = list(dict.fromkeys(blockers))


def set_status(
    data: PlannerData, task_id: str, status: str, now: datetime | None = None
) -> None:
    if status not in STATUSES:
        raise PlannerError("invalid", "Ungültiger Status.")
    task = get_task(data, task_id)
    targets = [task]
    if status in FINISHED_STATUSES:
        kids = children_map(data.tasks)
        for did in descendants(kids, task_id):
            sub = data.tasks[did]
            if sub.status in ACTIVE_STATUSES:
                targets.append(sub)
    for item in targets:
        _apply_status(item, status, now)
    if task.parent_id:
        refresh_parent_status(data, task.parent_id, now)


def _apply_status(task: Task, status: str, now: datetime | None) -> None:
    task.status = status
    if status == DONE:
        task.remaining_min = 0
        task.completed_at = to_iso(now) if now else task.completed_at
    elif status == DISCARDED:
        task.remaining_min = 0
        task.completed_at = to_iso(now) if now else task.completed_at
    else:
        task.completed_at = None


def refresh_parent_status(
    data: PlannerData,
    parent_id: str,
    now: datetime | None = None,
    new_child: bool = False,
) -> None:
    """A-4: parent follows its children."""
    current: str | None = parent_id
    kids_map = children_map(data.tasks)
    while current is not None:
        parent = data.tasks.get(current)
        if parent is None:
            return
        kids = kids_map.get(current, [])
        if kids:
            all_finished = all(k.status in FINISHED_STATUSES for k in kids)
            if all_finished and parent.status in ACTIVE_STATUSES:
                _apply_status(parent, DONE, now)
            elif not all_finished and parent.status == DONE:
                parent.status = OPEN
                parent.completed_at = None
                parent.remaining_min = None
            elif new_child and parent.status == DONE:
                parent.status = OPEN
                parent.completed_at = None
        current = parent.parent_id


def move_task(
    data: PlannerData,
    task_id: str,
    parent_id: str | None,
    index: int | None = None,
    now: datetime | None = None,
) -> None:
    task = get_task(data, task_id)
    if parent_id is not None:
        get_task(data, parent_id)
        kids = children_map(data.tasks)
        if parent_id == task_id or parent_id in descendants(kids, task_id):
            raise PlannerError(
                "cycle",
                "Eine Aufgabe kann nicht unter sich selbst oder einen Nachfahren verschoben werden.",
            )
    old_parent = task.parent_id
    old_order = task.order
    siblings = [s for s in _siblings(data, parent_id) if s.id != task_id]
    position = len(siblings) if index is None else max(0, min(index, len(siblings)))
    snapshot_orders = {t.id: t.order for t in data.tasks.values()}
    task.parent_id = parent_id
    siblings.insert(position, task)
    for idx, sibling in enumerate(siblings):
        sibling.order = idx
    if old_parent != parent_id:
        _renumber_siblings(data, old_parent)
    if has_cycle(data):
        task.parent_id = old_parent
        task.order = old_order
        for tid, order in snapshot_orders.items():
            data.tasks[tid].order = order
        raise PlannerError(
            "cycle", "Diese Änderung würde einen Zirkelbezug in den Abhängigkeiten erzeugen."
        )
    if old_parent and old_parent != parent_id:
        refresh_parent_status(data, old_parent, now)
    if parent_id and old_parent != parent_id:
        refresh_parent_status(data, parent_id, now, new_child=True)


def delete_info(data: PlannerData, task_id: str) -> dict[str, Any]:
    task = get_task(data, task_id)
    kids = children_map(data.tasks)
    subtree = descendants(kids, task_id)
    booked = [tid for tid in [task_id, *subtree] if has_bookings(data, tid)]
    return {
        "task_id": task_id,
        "title": task.title,
        "descendants": len(subtree),
        "with_bookings": len(booked),
    }


def delete_task(
    data: PlannerData, task_id: str, now: datetime | None = None
) -> dict[str, Any]:
    """A-3: delete, but keep (as discarded) everything that has bookings."""
    task = get_task(data, task_id)
    kids = children_map(data.tasks)
    subtree = [task_id, *descendants(kids, task_id)]
    keep: set[str] = set()
    for tid in subtree:
        if has_bookings(data, tid):
            keep.add(tid)
            keep.update(a for a in ancestors(data.tasks, tid) if a in subtree)
    delete_ids = [tid for tid in subtree if tid not in keep]
    for tid in keep:
        _apply_status(data.tasks[tid], DISCARDED, now)
    for tid in delete_ids:
        del data.tasks[tid]
    removed = set(delete_ids)
    for other in data.tasks.values():
        other.blocked_by = [b for b in other.blocked_by if b not in removed]
    for block in data.blocks.values():
        if block.reserved_for in removed:
            block.reserved_for = None
    for eid in [e.id for e in data.entries.values() if e.task_id in removed]:
        del data.entries[eid]
    if data.last_task_id in removed:
        data.last_task_id = None
    _renumber_siblings(data, task.parent_id)
    if task.parent_id and task.parent_id in data.tasks:
        refresh_parent_status(data, task.parent_id, now)
    _touch_plan(data)
    return {"deleted": len(delete_ids), "discarded": len(keep)}


# ------------------------------------------------------------------ priorities


def set_priority(
    data: PlannerData, task_id: str, person_id: str, level: int | None
) -> None:
    task = get_task(data, task_id)
    if person_id not in {p.id for p in data.settings.persons}:
        raise PlannerError("invalid", "Unbekannte Person.")
    if level is None:
        task.priorities.pop(person_id, None)
        return
    if not 1 <= int(level) <= data.settings.levels:
        raise PlannerError("invalid", "Ungültige Prioritätsstufe.")
    task.priorities[person_id] = int(level)


# ------------------------------------------------------------------ blocks


def _check_block_edit(data: PlannerData, block: WorkBlock, today: date) -> None:
    if block_is_past(block, today):
        raise PlannerError("past_block", "Dieser Block ist abgeschlossen oder vergangen.")


def create_block(
    data: PlannerData,
    day: str,
    *,
    start_time: str | None = None,
    capacity_min: int | None = None,
    note: str = "",
    reserved_for: str | None = None,
) -> WorkBlock:
    try:
        date.fromisoformat(day)
    except ValueError as err:
        raise PlannerError("invalid", "Ungültiges Datum.") from err
    if reserved_for is not None:
        get_task(data, reserved_for)
    block = WorkBlock(
        date=day,
        start_time=start_time or None,
        capacity_min=capacity_min or data.settings.default_capacity_min,
        note=note,
        reserved_for=reserved_for,
    )
    data.blocks[block.id] = block
    _touch_plan(data)
    return block


def update_block(
    data: PlannerData, block_id: str, fields: dict[str, Any], today: date
) -> WorkBlock:
    block = data.blocks.get(block_id)
    if block is None:
        raise PlannerError("not_found", "Block nicht gefunden.")
    reopening = fields.get("closed") is False
    if not reopening and "closed" not in fields:
        _check_block_edit(data, block, today)
    for key, value in fields.items():
        if key == "date":
            date.fromisoformat(value)
            block.date = value
        elif key == "start_time":
            block.start_time = value or None
        elif key == "capacity_min":
            block.capacity_min = max(1, int(value))
        elif key == "note":
            block.note = value or ""
        elif key == "closed":
            block.closed = bool(value)
        elif key == "reserved_for":
            if value is not None:
                get_task(data, value)
                allowed = {value, *descendants(children_map(data.tasks), value)}
                for entry in data.entries.values():
                    if entry.block_id == block.id and not entry.superseded:
                        if entry.task_id not in allowed:
                            raise PlannerError(
                                "invalid",
                                "Im Block liegen Einträge außerhalb der Reservierung.",
                            )
            block.reserved_for = value
        else:
            raise PlannerError("invalid", f"Unbekanntes Feld: {key}")
    _touch_plan(data)
    return block


def delete_block(data: PlannerData, block_id: str) -> None:
    block = data.blocks.get(block_id)
    if block is None:
        raise PlannerError("not_found", "Block nicht gefunden.")
    moved = [e for e in data.entries.values() if e.block_id == block_id]
    base = len([e for e in data.entries.values() if e.block_id is None and e.list == LIST_UNSCHEDULED])
    for idx, entry in enumerate(moved):
        if entry.superseded:
            del data.entries[entry.id]
            continue
        entry.block_id = None
        entry.list = LIST_UNSCHEDULED
        entry.fixed = False
        entry.order = base + idx
    del data.blocks[block_id]
    _touch_plan(data)


def close_block(data: PlannerData, block_id: str) -> None:
    block = data.blocks.get(block_id)
    if block is None:
        raise PlannerError("not_found", "Block nicht gefunden.")
    block.closed = True
    _touch_plan(data)


# ------------------------------------------------------------------ entries


def suggested_plan_minutes(
    data: PlannerData, task_id: str, today: date, now: datetime
) -> int:
    """B-2: remaining estimate minus time already planned in future blocks."""
    from .plan import planned_per_task

    summaries = compute_summaries(data, now)
    planned = planned_per_task(data, today)
    return max(0, summaries[task_id]["remaining_min"] - planned.get(task_id, 0))


def add_entry(
    data: PlannerData,
    task_id: str,
    *,
    block_id: str | None,
    today: date,
    now: datetime,
    planned_min: int | None = None,
    fixed: bool = False,
    fixed_time: str | None = None,
    with_whom: str | None = None,
    list_name: str | None = None,
) -> PlanEntry:
    task = get_task(data, task_id)
    if children_map(data.tasks).get(task_id):
        raise PlannerError(
            "invalid", "Eingeplant werden nur Aufgaben ohne Unteraufgaben."
        )
    if block_id is None:
        list_name = list_name or LIST_UNSCHEDULED
        if list_name not in (LIST_UNSCHEDULED, LIST_RESCHEDULE):
            raise PlannerError("invalid", "Ungültige Liste.")
    else:
        block = data.blocks.get(block_id)
        if block is None:
            raise PlannerError("not_found", "Block nicht gefunden.")
        _check_block_edit(data, block, today)
        _check_reservation(data, block, task_id)
        list_name = None
    if planned_min is None:
        planned_min = suggested_plan_minutes(data, task_id, today, now)
        if planned_min <= 0 and task.status in ACTIVE_STATUSES:
            planned_min = 30
    planned_min = max(1, int(planned_min))
    entry = PlanEntry(
        task_id=task_id,
        block_id=block_id,
        planned_min=planned_min,
        fixed=bool(fixed) and block_id is not None,
        fixed_time=fixed_time or None,
        with_whom=with_whom or None,
        list=list_name,
    )
    entry.order = len(
        [
            e
            for e in data.entries.values()
            if e.block_id == block_id and (block_id is not None or e.list == list_name)
        ]
    )
    data.entries[entry.id] = entry
    _touch_plan(data)
    return entry


def _check_reservation(data: PlannerData, block: WorkBlock, task_id: str) -> None:
    if not block.reserved_for:
        return
    allowed = {block.reserved_for, *descendants(children_map(data.tasks), block.reserved_for)}
    if task_id not in allowed:
        raise PlannerError(
            "reserved",
            "Dieser Block ist reserviert, es sind nur Aufgaben aus dem reservierten Ast einplanbar.",
        )


def update_entry(
    data: PlannerData, entry_id: str, fields: dict[str, Any], today: date
) -> PlanEntry:
    entry = data.entries.get(entry_id)
    if entry is None:
        raise PlannerError("not_found", "Eintrag nicht gefunden.")
    if entry.block_id:
        _check_block_edit(data, data.blocks[entry.block_id], today)
    for key, value in fields.items():
        if key == "planned_min":
            entry.planned_min = max(1, int(value))
        elif key == "fixed":
            if value and entry.block_id is None:
                raise PlannerError("invalid", "Nur Einträge in einem Block lassen sich fixieren.")
            entry.fixed = bool(value)
            if not value:
                entry.fixed_time = None
        elif key == "fixed_time":
            entry.fixed_time = value or None
        elif key == "with_whom":
            entry.with_whom = (value or "").strip() or None
        else:
            raise PlannerError("invalid", f"Unbekanntes Feld: {key}")
    _touch_plan(data)
    return entry


def move_entry(
    data: PlannerData,
    entry_id: str,
    *,
    block_id: str | None,
    index: int | None,
    today: date,
    list_name: str | None = None,
) -> None:
    entry = data.entries.get(entry_id)
    if entry is None:
        raise PlannerError("not_found", "Eintrag nicht gefunden.")
    if entry.superseded:
        raise PlannerError("past_block", "Nachgerückte Einträge sind Verlauf.")
    if entry.block_id:
        _check_block_edit(data, data.blocks[entry.block_id], today)
    if block_id is not None:
        block = data.blocks.get(block_id)
        if block is None:
            raise PlannerError("not_found", "Block nicht gefunden.")
        _check_block_edit(data, block, today)
        _check_reservation(data, block, entry.task_id)
        target_list = None
    else:
        target_list = list_name or LIST_UNSCHEDULED
        if target_list not in (LIST_UNSCHEDULED, LIST_RESCHEDULE):
            raise PlannerError("invalid", "Ungültige Liste.")
    old_block, old_list = entry.block_id, entry.list
    peers = sorted(
        (
            e
            for e in data.entries.values()
            if e.id != entry.id
            and e.block_id == block_id
            and (block_id is not None or e.list == target_list)
        ),
        key=lambda e: (e.order, e.id),
    )
    entry.block_id = block_id
    entry.list = target_list
    if block_id is None:
        entry.fixed = False
        entry.fixed_time = None
    position = len(peers) if index is None else max(0, min(index, len(peers)))
    peers.insert(position, entry)
    for idx, item in enumerate(peers):
        item.order = idx
    renumber(data.entries, old_block, old_list)
    _touch_plan(data)


def delete_entry(data: PlannerData, entry_id: str) -> None:
    entry = data.entries.get(entry_id)
    if entry is None:
        raise PlannerError("not_found", "Eintrag nicht gefunden.")
    del data.entries[entry_id]
    renumber(data.entries, entry.block_id, entry.list)
    _touch_plan(data)


def block_overbooked(data: PlannerData, block_id: str) -> bool:
    block = data.blocks[block_id]
    return block_fill(data.entries, block_id) > block.capacity_min


# ------------------------------------------------------------------ timer


def _first_booking(data: PlannerData, task: Task, start: datetime) -> None:
    """T-9 / S-3: first booking freezes the estimate and starts the task."""
    if task.estimate_initial_min is not None and not task.estimate_frozen_at:
        task.estimate_frozen_at = to_iso(start)
    if task.status == OPEN:
        task.status = IN_PROGRESS
    for anc in ancestors(data.tasks, task.id):
        parent = data.tasks[anc]
        if parent.status == OPEN:
            parent.status = IN_PROGRESS


def _task_state(task: Task) -> dict[str, Any]:
    return {
        "task_id": task.id,
        "status": task.status,
        "estimate_frozen_at": task.estimate_frozen_at,
        "completed_at": task.completed_at,
    }


def start_timer(data: PlannerData, task_id: str, now: datetime) -> TimeEntry:
    """T-1 / T-2: start a clock, ending a running one in the same instant."""
    task = get_task(data, task_id)
    current = running_entry(data)
    if current is not None and current.task_id == task_id:
        return current
    validate_booking(data, now, None, ignore_id=current.id if current else None)
    before_state = _task_state(task)
    entry = TimeEntry(task_id=task_id, start=to_iso(now))
    data.switch_undo = None
    if current is not None:
        current.end = to_iso(now)
        data.switch_undo = {
            "stopped_id": current.id,
            "started_id": entry.id,
            "task_state": before_state,
        }
    data.time_entries[entry.id] = entry
    _first_booking(data, task, now)
    data.last_task_id = task_id
    return entry


def undo_switch(data: PlannerData) -> None:
    undo = data.switch_undo
    if not undo:
        raise PlannerError("no_undo", "Es gibt nichts rückgängig zu machen.")
    started = data.time_entries.get(undo["started_id"])
    stopped = data.time_entries.get(undo["stopped_id"])
    if started is None or stopped is None or started.end is not None:
        data.switch_undo = None
        raise PlannerError("no_undo", "Der Wechsel lässt sich nicht mehr rückgängig machen.")
    del data.time_entries[started.id]
    stopped.end = None
    state = undo["task_state"]
    task = data.tasks.get(state["task_id"])
    if task is not None:
        task.status = state["status"]
        task.estimate_frozen_at = state["estimate_frozen_at"]
        task.completed_at = state["completed_at"]
    data.last_task_id = stopped.task_id
    data.switch_undo = None


def stop_timer(
    data: PlannerData,
    now: datetime,
    *,
    mark_done: bool = False,
    remaining_min: int | None = None,
) -> TimeEntry:
    """T-3 / T-10."""
    entry = running_entry(data)
    if entry is None:
        raise PlannerError("no_timer", "Es läuft keine Uhr.")
    entry.end = to_iso(now)
    data.last_task_id = entry.task_id
    data.switch_undo = None
    task = data.tasks.get(entry.task_id)
    if task is not None:
        if mark_done:
            set_status(data, task.id, DONE, now)
        elif remaining_min is not None:
            task.remaining_min = max(0, int(remaining_min))
    return entry


def resume_timer(data: PlannerData, now: datetime) -> TimeEntry:
    if running_entry(data) is not None:
        raise PlannerError("running", "Es läuft bereits eine Uhr.")
    if not data.last_task_id or data.last_task_id not in data.tasks:
        raise PlannerError("no_last_task", "Es gibt keine zuletzt gestempelte Aufgabe.")
    return start_timer(data, data.last_task_id, now)


def add_time_entry(
    data: PlannerData,
    task_id: str,
    start: datetime,
    end: datetime | None,
    *,
    helper_min: int = 0,
    note: str = "",
) -> TimeEntry:
    task = get_task(data, task_id)
    validate_booking(data, start, end)
    entry = TimeEntry(
        task_id=task_id,
        start=to_iso(start),
        end=to_iso(end) if end else None,
        helper_min=max(0, int(helper_min or 0)),
        note=note or "",
    )
    data.time_entries[entry.id] = entry
    _first_booking(data, task, start)
    return entry


def update_time_entry(
    data: PlannerData,
    entry_id: str,
    fields: dict[str, Any],
) -> TimeEntry:
    entry = data.time_entries.get(entry_id)
    if entry is None:
        raise PlannerError("not_found", "Buchung nicht gefunden.")
    start = fields.get("start", entry.start)
    end = fields.get("end", entry.end)
    from .models import parse_dt

    start_dt = parse_dt(start) if isinstance(start, str) else start
    end_dt = (parse_dt(end) if isinstance(end, str) else end) if end else None
    validate_booking(data, start_dt, end_dt, ignore_id=entry.id)
    if "task_id" in fields and fields["task_id"] != entry.task_id:
        task = get_task(data, fields["task_id"])
        entry.task_id = task.id
        _first_booking(data, task, start_dt)
    entry.start = to_iso(start_dt)
    entry.end = to_iso(end_dt) if end_dt else None
    if "helper_min" in fields:
        entry.helper_min = max(0, int(fields["helper_min"] or 0))
    if "note" in fields:
        entry.note = fields["note"] or ""
    return entry


def delete_time_entry(data: PlannerData, entry_id: str) -> None:
    if entry_id not in data.time_entries:
        raise PlannerError("not_found", "Buchung nicht gefunden.")
    del data.time_entries[entry_id]
    data.switch_undo = None


# ------------------------------------------------------------------ settings


def update_settings(
    data: PlannerData, fields: dict[str, Any]
) -> Settings:
    """Apply settings. Changing the number of levels rescales ratings (P-1)."""
    settings = data.settings
    if "level_names" in fields:
        names = [str(n).strip() for n in fields["level_names"] if str(n).strip()]
        if not 2 <= len(names) <= 10:
            raise PlannerError("invalid", "Es sind 2 bis 10 Prioritätsstufen möglich.")
        old, new = settings.levels, len(names)
        if old != new:
            for task in data.tasks.values():
                task.priorities = {
                    pid: rescale_level(lvl, old, new)
                    for pid, lvl in task.priorities.items()
                }
        settings.level_names = names
    if "persons" in fields:
        persons = [Person.from_dict(p) for p in fields["persons"]]
        for person in persons:
            if not person.name.strip():
                raise PlannerError("invalid", "Jede Person braucht einen Namen.")
        ids = {p.id for p in persons}
        for task in data.tasks.values():
            task.priorities = {k: v for k, v in task.priorities.items() if k in ids}
        settings.persons = persons
    simple_int = {
        "default_capacity_min": 1,
        "disagree_threshold": 1,
        "min_split_min": 1,
        "long_timer_min": 1,
    }
    for key, minimum in simple_int.items():
        if key in fields:
            setattr(settings, key, max(minimum, int(fields[key])))
    if "categories" in fields:
        seen: list[str] = []
        for cat in fields["categories"]:
            cat = str(cat).strip()
            if cat and cat not in seen:
                seen.append(cat)
        settings.categories = seen
    return settings


def person_for_user(data: PlannerData, ha_user_id: str | None) -> Person | None:
    for person in data.settings.persons:
        if ha_user_id and person.ha_user_id == ha_user_id:
            return person
    return None


def can_edit(data: PlannerData, ha_user_id: str | None, is_admin: bool) -> bool:
    """Executors and admins edit; raters may only rate. No persons: everybody."""
    if not data.settings.persons:
        return True
    person = person_for_user(data, ha_user_id)
    if person is None:
        return is_admin
    return person.role == ROLE_EXECUTOR

