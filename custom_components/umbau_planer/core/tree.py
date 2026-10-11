"""Task tree helpers and estimate / booking summaries (S-1 .. S-8)."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any

from .models import (
    ACTIVE_STATUSES,
    DISCARDED,
    DONE,
    FINISHED_STATUSES,
    PlannerData,
    Task,
    parse_dt,
)


def children_map(tasks: dict[str, Task]) -> dict[str | None, list[Task]]:
    """Children per parent id, sorted by order. Key None holds the projects."""
    result: dict[str | None, list[Task]] = defaultdict(list)
    for task in tasks.values():
        result[task.parent_id].append(task)
    for items in result.values():
        items.sort(key=lambda t: (t.order, t.created_at, t.id))
    return result


def ancestors(tasks: dict[str, Task], task_id: str) -> list[str]:
    """Parent ids from the direct parent up to the project."""
    result: list[str] = []
    seen = {task_id}
    current = tasks[task_id].parent_id
    while current is not None and current in tasks and current not in seen:
        result.append(current)
        seen.add(current)
        current = tasks[current].parent_id
    return result


def descendants(
    children: dict[str | None, list[Task]], task_id: str
) -> list[str]:
    result: list[str] = []
    stack = [task_id]
    while stack:
        for child in children.get(stack.pop(), []):
            result.append(child.id)
            stack.append(child.id)
    return result


def preorder(children: dict[str | None, list[Task]]) -> list[str]:
    """Task ids in display order (depth first)."""
    result: list[str] = []

    def walk(parent: str | None) -> None:
        for child in children.get(parent, []):
            result.append(child.id)
            walk(child.id)

    walk(None)
    return result


def project_of(tasks: dict[str, Task], task_id: str) -> str:
    chain = ancestors(tasks, task_id)
    return chain[-1] if chain else task_id


def entry_minutes(start: str, end: str | None, now: datetime) -> int:
    """Whole minutes of a booking; running bookings use ``now``."""
    start_dt = parse_dt(start)
    end_dt = parse_dt(end) if end else now
    return max(0, int((end_dt - start_dt).total_seconds() // 60))


def direct_bookings(
    data: PlannerData, now: datetime
) -> dict[str, tuple[int, int]]:
    """Own minutes and helper minutes booked directly per task."""
    own: dict[str, int] = defaultdict(int)
    helper: dict[str, int] = defaultdict(int)
    for entry in data.time_entries.values():
        own[entry.task_id] += entry_minutes(entry.start, entry.end, now)
        helper[entry.task_id] += entry.helper_min or 0
    return {tid: (own[tid], helper[tid]) for tid in set(own) | set(helper)}


def effective_remaining(task: Task, effort_min: int) -> int:
    """Remaining minutes of a leaf (S-4, S-7)."""
    if task.status in FINISHED_STATUSES:
        return 0
    if task.remaining_min is not None:
        return max(0, task.remaining_min)
    if task.estimate_initial_min is not None:
        return max(0, task.estimate_initial_min - effort_min)
    return 0


def compute_summaries(
    data: PlannerData, now: datetime
) -> dict[str, dict[str, Any]]:
    """Estimate / booked / remaining / forecast / deviation for every task.

    All values are summed up the tree (S-6). Discarded tasks contribute
    estimate and remaining only if time was booked on them (estimate) and
    never remaining.
    """
    children = children_map(data.tasks)
    bookings = direct_bookings(data, now)
    result: dict[str, dict[str, Any]] = {}

    def visit(task: Task) -> dict[str, Any]:
        own, helper = bookings.get(task.id, (0, 0))
        kids = children.get(task.id, [])
        sub = [visit(k) for k in kids]
        booked_own = own + sum(s["booked_own_min"] for s in sub)
        booked_helper = helper + sum(s["helper_min"] for s in sub)
        effort = booked_own + booked_helper
        direct_effort = own + helper

        rough: int | None = None
        partial = False
        if kids:
            est_parts = [s["estimate_min"] for s in sub if s["estimate_min"] is not None]
            if est_parts:
                estimate: int | None = sum(est_parts)
                partial = len(est_parts) < len(sub) or any(s["partial"] for s in sub)
                rough = task.estimate_initial_min
            else:
                estimate = task.estimate_initial_min
            remaining = sum(s["remaining_min"] for s in sub)
            if task.status in FINISHED_STATUSES:
                remaining = 0
        else:
            estimate = task.estimate_initial_min
            remaining = effective_remaining(task, direct_effort)

        if task.status == DISCARDED and effort == 0 and not kids:
            estimate = None
        forecast = effort + remaining
        deviation = forecast - estimate if estimate is not None else None
        info = {
            "estimate_min": estimate,
            "rough_min": rough,
            "partial": partial,
            "booked_own_min": booked_own,
            "helper_min": booked_helper,
            "booked_min": effort,
            "remaining_min": remaining,
            "forecast_min": forecast,
            "deviation_min": deviation,
            "unestimated": estimate is None,
            "has_children": bool(kids),
            "direct_booked_min": direct_effort,
        }
        result[task.id] = info
        return info

    for root in children.get(None, []):
        visit(root)
    return result


def is_active(task: Task) -> bool:
    return task.status in ACTIVE_STATUSES


__all__ = [
    "ancestors",
    "children_map",
    "compute_summaries",
    "descendants",
    "effective_remaining",
    "entry_minutes",
    "is_active",
    "preorder",
    "project_of",
    "DONE",
]
