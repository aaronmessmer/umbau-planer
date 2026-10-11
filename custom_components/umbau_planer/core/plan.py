"""Work blocks, plan warnings, roll-over (N-1 .. N-9) and fill suggestions."""
from __future__ import annotations

from dataclasses import replace
from datetime import date, datetime, timedelta
from typing import Any

from .models import (
    ACTIVE_STATUSES,
    LIST_RESCHEDULE,
    LIST_UNSCHEDULED,
    PlanEntry,
    PlannerData,
    PlannerError,
    WorkBlock,
    to_iso,
)
from .priorities import compute_priorities, sort_key
from .readiness import compute_readiness, prerequisites
from .tree import (
    children_map,
    compute_summaries,
    descendants,
)


# ------------------------------------------------------------------ basics


def block_is_past(block: WorkBlock, today: date) -> bool:
    return block.closed or block.date < today.isoformat()


def sorted_blocks(blocks: dict[str, WorkBlock]) -> list[WorkBlock]:
    return sorted(blocks.values(), key=lambda b: b.sort_key)


def block_entries(
    entries: dict[str, PlanEntry], block_id: str, include_superseded: bool = True
) -> list[PlanEntry]:
    result = [
        e
        for e in entries.values()
        if e.block_id == block_id and (include_superseded or not e.superseded)
    ]
    return sorted(result, key=lambda e: (e.order, e.id))


def block_fill(entries: dict[str, PlanEntry], block_id: str) -> int:
    """Planned minutes in a block (B-4); superseded history is excluded."""
    return sum(e.planned_min for e in block_entries(entries, block_id, False))


def planned_per_task(
    data: PlannerData, today: date, entries: dict[str, PlanEntry] | None = None
) -> dict[str, int]:
    """Minutes planned in open (not past) blocks per task (B-5)."""
    entries = data.entries if entries is None else entries
    result: dict[str, int] = {}
    for entry in entries.values():
        if entry.superseded or entry.block_id is None:
            continue
        block = data.blocks.get(entry.block_id)
        if block is None or block_is_past(block, today):
            continue
        result[entry.task_id] = result.get(entry.task_id, 0) + entry.planned_min
    return result


def renumber(entries: dict[str, PlanEntry], block_id: str | None, lst: str | None = None) -> None:
    items = sorted(
        (
            e
            for e in entries.values()
            if e.block_id == block_id and (block_id is not None or e.list == lst)
        ),
        key=lambda e: (e.order, e.id),
    )
    for idx, entry in enumerate(items):
        entry.order = idx


# ------------------------------------------------------------------ warnings


def plan_warnings(
    data: PlannerData,
    entries: dict[str, PlanEntry] | None = None,
) -> list[dict[str, Any]]:
    """B-6 (order) and F-4 (fixed entries) warnings."""
    entries = data.entries if entries is None else entries
    children = children_map(data.tasks)
    active: dict[str, list[tuple[tuple, PlanEntry]]] = {}
    for entry in entries.values():
        if entry.superseded or entry.block_id is None:
            continue
        block = data.blocks.get(entry.block_id)
        if block is None:
            continue
        active.setdefault(entry.task_id, []).append(
            ((block.sort_key, entry.order), entry)
        )
    prereq_cache: dict[str, list[str]] = {}
    warnings: list[dict[str, Any]] = []
    for task_id, items in active.items():
        task = data.tasks.get(task_id)
        if task is None or task.status not in ACTIVE_STATUSES:
            continue
        if task_id not in prereq_cache:
            prereq_cache[task_id] = prerequisites(data, task_id, children)
        for pos, entry in items:
            for req_id in prereq_cache[task_id]:
                req_items = active.get(req_id, [])
                if not req_items:
                    if entry.fixed:
                        warnings.append(_warning(data, entry, req_id, "not_planned"))
                    continue
                if max(p for p, _ in req_items) > pos:
                    kind = "fixed_after" if entry.fixed else "order"
                    warnings.append(_warning(data, entry, req_id, kind))
    return warnings


def _warning(
    data: PlannerData, entry: PlanEntry, req_id: str, reason: str
) -> dict[str, Any]:
    block = data.blocks.get(entry.block_id) if entry.block_id else None
    return {
        "entry_id": entry.id,
        "task_id": entry.task_id,
        "task_title": data.tasks[entry.task_id].title,
        "prerequisite_id": req_id,
        "prerequisite_title": data.tasks[req_id].title,
        "fixed": entry.fixed,
        "reason": reason,
        "date": block.date if block else None,
        "block_id": entry.block_id,
    }


# ------------------------------------------------------------------ layout helpers


def _layout(
    data: PlannerData, entries: dict[str, PlanEntry]
) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    for block in sorted_blocks(data.blocks):
        out[block.id] = [
            {
                "id": e.id,
                "task_id": e.task_id,
                "title": data.tasks[e.task_id].title if e.task_id in data.tasks else "?",
                "planned_min": e.planned_min,
                "fixed": e.fixed,
                "superseded": e.superseded,
            }
            for e in block_entries(entries, block.id)
        ]
    for name in (LIST_UNSCHEDULED, LIST_RESCHEDULE):
        out[name] = [
            {
                "id": e.id,
                "task_id": e.task_id,
                "title": data.tasks[e.task_id].title if e.task_id in data.tasks else "?",
                "planned_min": e.planned_min,
                "fixed": e.fixed,
                "superseded": e.superseded,
            }
            for e in sorted(
                (x for x in entries.values() if x.block_id is None and x.list == name),
                key=lambda x: (x.order, x.id),
            )
        ]
    return out


# ------------------------------------------------------------------ roll-over


def rollover_affected(
    data: PlannerData, today: date, now: datetime
) -> list[dict[str, Any]]:
    """Unfinished tasks with entries in past blocks and their remaining time (N-2)."""
    summaries = compute_summaries(data, now)
    seen: dict[str, dict[str, Any]] = {}
    for entry in data.entries.values():
        if entry.superseded or entry.block_id is None:
            continue
        block = data.blocks.get(entry.block_id)
        task = data.tasks.get(entry.task_id)
        if block is None or task is None or not block_is_past(block, today):
            continue
        if task.status not in ACTIVE_STATUSES:
            continue
        if task.id not in seen:
            seen[task.id] = {
                "task_id": task.id,
                "title": task.title,
                "suggested_min": summaries[task.id]["remaining_min"],
            }
    return sorted(seen.values(), key=lambda a: a["title"].lower())


def compute_rollover(
    data: PlannerData,
    today: date,
    now: datetime,
    remaining: dict[str, int] | None = None,
) -> dict[str, Any]:
    """Compute (without applying) the plan after "Nachrücken"."""
    remaining = dict(remaining or {})
    min_split = max(1, data.settings.min_split_min)
    affected = rollover_affected(data, today, now)
    answers = {
        a["task_id"]: max(0, int(remaining.get(a["task_id"], a["suggested_min"])))
        for a in affected
    }

    old_entries = data.entries
    entries: dict[str, PlanEntry] = {eid: replace(e) for eid, e in old_entries.items()}
    blocks = sorted_blocks(data.blocks)
    block_by_id = data.blocks
    open_blocks = [b for b in blocks if not block_is_past(b, today)]
    layout_blocks = [b for b in open_blocks if not b.reserved_for]
    open_ids = {b.id for b in open_blocks}
    layout_ids = {b.id for b in layout_blocks}

    def task_active(task_id: str) -> bool:
        task = data.tasks.get(task_id)
        return task is not None and task.status in ACTIVE_STATUSES

    # planned time per task in open blocks (before the roll-over)
    future_planned: dict[str, int] = {}
    for e in old_entries.values():
        if not e.superseded and e.block_id in open_ids:
            future_planned[e.task_id] = future_planned.get(e.task_id, 0) + e.planned_min

    # 1. carried entries from past blocks
    past_by_task: dict[str, list[PlanEntry]] = {}
    for e in entries.values():
        if e.superseded or e.block_id is None:
            continue
        block = block_by_id.get(e.block_id)
        if block is None or block_is_past(block, today) is False:
            continue
        if e.task_id in answers:
            past_by_task.setdefault(e.task_id, []).append(e)

    carried: list[tuple[tuple, PlanEntry]] = []
    reschedule: list[PlanEntry] = []
    for task_id, items in past_by_task.items():
        items.sort(key=lambda e: (block_by_id[e.block_id].sort_key, e.order))  # type: ignore[index]
        pool = max(0, answers[task_id] - future_planned.get(task_id, 0))
        for index, old in enumerate(items):
            last = index == len(items) - 1
            take = pool if last else min(old.planned_min, pool)
            pool -= take
            old.superseded = True
            if take <= 0:
                continue
            new = PlanEntry(
                task_id=task_id,
                planned_min=take,
                with_whom=old.with_whom,
                origin_id=old.id,
            )
            if old.fixed:
                new.list = LIST_RESCHEDULE
                reschedule.append(new)
            else:
                carried.append(
                    ((block_by_id[old.block_id].sort_key, old.order), new)  # type: ignore[index]
                )
    carried.sort(key=lambda item: item[0])
    queue: list[PlanEntry] = [e for _, e in carried]

    # 2. non-fixed entries in open, non-reserved blocks
    removed: list[str] = []
    future: list[PlanEntry] = []
    for e in list(entries.values()):
        if e.superseded or e.block_id not in layout_ids or e.fixed:
            continue
        if task_active(e.task_id):
            future.append(e)
        else:
            removed.append(e.id)
            del entries[e.id]
    future.sort(key=lambda e: (block_by_id[e.block_id].sort_key, e.order))  # type: ignore[index]
    queue.extend(future)

    # 3. already unscheduled entries try again at the end of the queue
    previously_unscheduled = sorted(
        (
            e
            for e in entries.values()
            if e.block_id is None and e.list == LIST_UNSCHEDULED and task_active(e.task_id)
        ),
        key=lambda e: (e.order, e.id),
    )
    queue.extend(previously_unscheduled)
    for e in previously_unscheduled:
        del entries[e.id]

    # 4. lay the queue out over the blocks
    cap_left: dict[str, int] = {}
    for block in layout_blocks:
        fixed = sum(
            e.planned_min
            for e in entries.values()
            if e.block_id == block.id and e.fixed and not e.superseded
        )
        cap_left[block.id] = block.capacity_min - fixed
    # remove old non-fixed entries from the layout blocks, we re-place them
    for e in future:
        entries.pop(e.id, None)

    placed: dict[str, list[PlanEntry]] = {b.id: [] for b in layout_blocks}
    leftover: list[PlanEntry] = []
    pointer = 0
    for item in queue:
        minutes = item.planned_min
        first = True
        while minutes > 0:
            if pointer >= len(layout_blocks):
                part = replace(item, planned_min=minutes) if first else PlanEntry(
                    task_id=item.task_id,
                    planned_min=minutes,
                    with_whom=item.with_whom,
                    origin_id=item.origin_id,
                )
                part.block_id = None
                part.list = LIST_UNSCHEDULED
                leftover.append(part)
                break
            block = layout_blocks[pointer]
            free = cap_left[block.id]
            if minutes <= free:
                amount = minutes
            elif free >= min_split and minutes - free >= min_split:
                amount = free
            else:
                pointer += 1
                continue
            existing = next(
                (p for p in placed[block.id] if p.task_id == item.task_id), None
            )
            if existing is not None:
                existing.planned_min += amount
            else:
                if first:
                    entry = item
                else:
                    entry = PlanEntry(
                        task_id=item.task_id,
                        with_whom=item.with_whom,
                        origin_id=item.origin_id,
                    )
                entry.block_id = block.id
                entry.list = None
                entry.planned_min = amount
                placed[block.id].append(entry)
            cap_left[block.id] -= amount
            minutes -= amount
            first = False
            if cap_left[block.id] <= 0:
                pointer += 1
    # merge duplicates in the leftover list
    merged: list[PlanEntry] = []
    for e in leftover:
        same = next((m for m in merged if m.task_id == e.task_id), None)
        if same:
            same.planned_min += e.planned_min
        else:
            merged.append(e)
    for block in layout_blocks:
        used = {
            e.order
            for e in entries.values()
            if e.block_id == block.id and not e.superseded
        }
        cursor = 0
        for e in placed[block.id]:
            while cursor in used:
                cursor += 1
            e.order = cursor
            cursor += 1
            entries[e.id] = e
    for lst, items in (
        (LIST_RESCHEDULE, reschedule),
        (LIST_UNSCHEDULED, merged),
    ):
        base = max(
            [x.order for x in entries.values() if x.block_id is None and x.list == lst]
            + [-1]
        )
        for idx, e in enumerate(items):
            e.block_id = None
            e.list = lst
            e.order = base + 1 + idx
            entries[e.id] = e
    # carried entries that got a new place but whose "first" object was fresh are
    # already registered above; make sure each queue object is registered
    for block in layout_blocks:
        renumber(entries, block.id)

    old_warn = {
        (w["entry_id"], w["prerequisite_id"])
        for w in plan_warnings(data, old_entries)
        if w["fixed"]
    }
    new_warn = [w for w in plan_warnings(data, entries) if w["fixed"]]
    f5 = [w for w in new_warn if (w["entry_id"], w["prerequisite_id"]) not in old_warn]

    return {
        "affected": [
            dict(a, remaining_min=answers[a["task_id"]]) for a in affected
        ],
        "answers": answers,
        "entries": entries,
        "removed": removed,
        "before": _layout(data, old_entries),
        "after": _layout(data, entries),
        "warnings": f5,
    }


def apply_rollover(
    data: PlannerData,
    today: date,
    now: datetime,
    remaining: dict[str, int] | None = None,
) -> dict[str, Any]:
    result = compute_rollover(data, today, now, remaining)
    undo = {
        "entries": [e.to_dict() for e in data.entries.values()],
        "remaining": {
            tid: data.tasks[tid].remaining_min for tid in result["answers"]
        },
        "applied_at": to_iso(now),
    }
    data.entries = result["entries"]
    for tid, minutes in result["answers"].items():
        data.tasks[tid].remaining_min = minutes
    data.rollover_undo = undo
    return {
        "warnings": result["warnings"],
        "affected": result["affected"],
        "removed": result["removed"],
    }


def undo_rollover(data: PlannerData) -> None:
    undo = data.rollover_undo
    if not undo:
        raise PlannerError("no_undo", "Es gibt nichts rückgängig zu machen.")
    data.entries = {d["id"]: PlanEntry.from_dict(d) for d in undo["entries"]}
    for tid, minutes in undo["remaining"].items():
        if tid in data.tasks:
            data.tasks[tid].remaining_min = minutes
    data.rollover_undo = None


# ------------------------------------------------------------------ stage 2


def create_block_series(
    data: PlannerData,
    start_date: date,
    weekdays: list[int],
    *,
    count: int | None = None,
    until: date | None = None,
    start_time: str | None = None,
    capacity_min: int | None = None,
    note: str = "",
) -> list[WorkBlock]:
    """Create blocks on the given weekdays (0 = Monday), starting at ``start_date``."""
    if not weekdays:
        raise PlannerError("invalid", "Mindestens ein Wochentag ist nötig.")
    if count is None and until is None:
        raise PlannerError("invalid", "Anzahl oder Enddatum ist nötig.")
    capacity = capacity_min or data.settings.default_capacity_min
    result: list[WorkBlock] = []
    day = start_date
    limit = 400
    while len(result) < limit:
        if until is not None and day > until:
            break
        if count is not None and len(result) >= count:
            break
        if day.weekday() in weekdays:
            block = WorkBlock(
                date=day.isoformat(),
                start_time=start_time,
                capacity_min=capacity,
                note=note,
            )
            result.append(block)
        day += timedelta(days=1)
        if (day - start_date).days > 3 * 366:
            break
    for block in result:
        data.blocks[block.id] = block
    return result


def suggest_fill(
    data: PlannerData, block_id: str, today: date, now: datetime
) -> list[dict[str, Any]]:
    """Propose entries for a block, by combined priority (stage 2)."""
    block = data.blocks.get(block_id)
    if block is None:
        raise PlannerError("not_found", "Block nicht gefunden.")
    children = children_map(data.tasks)
    summaries = compute_summaries(data, now)
    readiness = compute_readiness(data, today)
    prios = compute_priorities(data)
    planned = planned_per_task(data, today)
    min_split = max(1, data.settings.min_split_min)

    allowed: set[str] | None = None
    if block.reserved_for and block.reserved_for in data.tasks:
        allowed = {block.reserved_for, *descendants(children, block.reserved_for)}

    already = {e.task_id for e in block_entries(data.entries, block.id, False)}
    free = block.capacity_min - block_fill(data.entries, block.id)
    candidates = [
        t
        for t in data.tasks.values()
        if t.status in ACTIVE_STATUSES
        and not children.get(t.id)
        and readiness[t.id]["ready"]
        and (allowed is None or t.id in allowed)
    ]
    candidates.sort(key=lambda t: sort_key(prios[t.id]))
    proposals: list[dict[str, Any]] = []
    for task in candidates:
        if free <= 0:
            break
        need = summaries[task.id]["remaining_min"] - planned.get(task.id, 0)
        if need <= 0 or task.id in already:
            continue
        if need <= free:
            amount = need
        elif free >= min_split and need - free >= min_split:
            amount = free
        else:
            continue
        proposals.append(
            {"task_id": task.id, "title": task.title, "planned_min": amount}
        )
        free -= amount
    return proposals


__all__ = [
    "apply_rollover",
    "block_entries",
    "block_fill",
    "block_is_past",
    "compute_rollover",
    "create_block_series",
    "plan_warnings",
    "planned_per_task",
    "renumber",
    "rollover_affected",
    "sorted_blocks",
    "suggest_fill",
    "undo_rollover",
]
