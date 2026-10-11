"""Priorities per person and the combined priority (P-1 .. P-9)."""
from __future__ import annotations

from typing import Any

from .models import ACTIVE_STATUSES, PlannerData
from .tree import ancestors, children_map, preorder

MIN_EXPLICIT_FOR_RANK = 5


def effective_level(
    data: PlannerData, task_id: str, person_id: str
) -> tuple[int | None, bool, str | None]:
    """(level, inherited, source_task_id) following P-3."""
    task = data.tasks[task_id]
    level = task.priorities.get(person_id)
    if level is not None:
        return level, False, task_id
    for anc in ancestors(data.tasks, task_id):
        level = data.tasks[anc].priorities.get(person_id)
        if level is not None:
            return level, True, anc
    return None, False, None


def level_value_map(data: PlannerData, person_id: str) -> dict[int, float]:
    """Level -> 0..1 for one person (P-4, P-5)."""
    levels = data.settings.levels
    explicit = sorted(
        t.priorities[person_id]
        for t in data.tasks.values()
        if t.status in ACTIVE_STATUSES and t.priorities.get(person_id) is not None
    )
    count = len(explicit)

    def linear(level: int) -> float:
        return (level - 1) / (levels - 1) if levels > 1 else 0.0

    if count < MIN_EXPLICIT_FOR_RANK:
        return {lvl: linear(lvl) for lvl in range(1, levels + 1)}

    anchors: dict[int, float] = {}
    index = 0
    while index < count:
        end = index
        while end + 1 < count and explicit[end + 1] == explicit[index]:
            end += 1
        mean_rank = (index + end) / 2  # ranks start at 0
        anchors[explicit[index]] = mean_rank / count
        index = end + 1

    result: dict[int, float] = {}
    present = sorted(anchors)
    for lvl in range(1, levels + 1):
        if lvl in anchors:
            result[lvl] = anchors[lvl]
            continue
        lower = [p for p in present if p < lvl]
        upper = [p for p in present if p > lvl]
        if lower and upper:
            lo, hi = lower[-1], upper[0]
            frac = (lvl - lo) / (hi - lo)
            result[lvl] = anchors[lo] + frac * (anchors[hi] - anchors[lo])
        elif lower:
            result[lvl] = anchors[lower[-1]]
        elif upper:
            result[lvl] = anchors[upper[0]]
        else:
            result[lvl] = linear(lvl)
    return result


def value_to_level(value: float, levels: int) -> float:
    """Combined value (0..1) on the level scale, one decimal (P-7)."""
    return round(1 + value * (levels - 1), 1)


def compute_priorities(data: PlannerData) -> dict[str, dict[str, Any]]:
    """Per task: own and effective levels, combined value, sort rank, flags."""
    persons = data.settings.persons
    levels = data.settings.levels
    threshold = data.settings.disagree_threshold
    value_maps = {p.id: level_value_map(data, p.id) for p in persons}
    children = children_map(data.tasks)
    order_index = {tid: i for i, tid in enumerate(preorder(children))}
    result: dict[str, dict[str, Any]] = {}
    for task in data.tasks.values():
        per_person: dict[str, dict[str, Any]] = {}
        values: list[float] = []
        effective: list[int] = []
        for person in persons:
            level, inherited, source = effective_level(data, task.id, person.id)
            per_person[person.id] = {
                "own": task.priorities.get(person.id),
                "level": level,
                "inherited": inherited,
                "source": source,
            }
            if level is not None:
                effective.append(level)
                values.append(value_maps[person.id].get(level, 0.0))
        combined = sum(values) / len(values) if values else None
        disagree = (
            len(effective) >= 2 and max(effective) - min(effective) >= threshold
        )
        result[task.id] = {
            "persons": per_person,
            "combined_value": combined,
            "combined_level": value_to_level(combined, levels) if combined is not None else None,
            "unrated": combined is None,
            "disagree": disagree,
            "distance": (max(effective) - min(effective)) if len(effective) >= 2 else 0,
            "order_index": order_index.get(task.id, 0),
        }
    return result


def sort_key(prio: dict[str, Any]) -> tuple[int, float, int]:
    """Sort key: rated first by combined value, then tree order (P-9)."""
    return (
        1 if prio["combined_value"] is None else 0,
        prio["combined_value"] if prio["combined_value"] is not None else 0.0,
        prio["order_index"],
    )


def rescale_level(level: int, old_levels: int, new_levels: int) -> int:
    if old_levels <= 1 or new_levels <= 1:
        return 1
    return int(round(1 + (level - 1) * (new_levels - 1) / (old_levels - 1)))


def rescale_preview(
    data: PlannerData, new_level_names: list[str]
) -> list[dict[str, Any]]:
    """Changes a new level count would cause (P-1)."""
    old = data.settings.levels
    new = len(new_level_names)
    changes = []
    if old == new:
        return changes
    for task in data.tasks.values():
        for person_id, level in task.priorities.items():
            target = rescale_level(level, old, new)
            if target != level:
                changes.append(
                    {
                        "task_id": task.id,
                        "person_id": person_id,
                        "old": level,
                        "new": target,
                    }
                )
    return changes
