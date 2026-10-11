"""Readiness (D-1 .. D-10), dependency graph and cycle detection."""
from __future__ import annotations

from datetime import date
from typing import Any

from .models import (
    ACTIVE_STATUSES,
    FINISHED_STATUSES,
    MODE_SEQUENTIAL,
    PlannerData,
    Task,
)
from .tree import ancestors, children_map, descendants


def _finished(task: Task | None) -> bool:
    return task is None or task.status in FINISHED_STATUSES


def sequential_predecessors(
    children: dict[str | None, list[Task]], tasks: dict[str, Task], task: Task
) -> list[Task]:
    """Siblings standing before ``task`` under a sequential parent (D-2)."""
    if task.parent_id is None or task.parent_id not in tasks:
        return []
    if tasks[task.parent_id].children_mode != MODE_SEQUENTIAL:
        return []
    result = []
    for sibling in children.get(task.parent_id, []):
        if sibling.id == task.id:
            break
        result.append(sibling)
    return result


def _own_blockers(
    data: PlannerData, children: dict[str | None, list[Task]], task: Task
) -> list[dict[str, Any]]:
    """Reasons that hold on this task itself (not inherited)."""
    reasons: list[dict[str, Any]] = []
    for pred in sequential_predecessors(children, data.tasks, task):
        if not _finished(pred):
            reasons.append(
                {"kind": "sequence", "task_id": pred.id, "title": pred.title}
            )
            break
    for blocker_id in task.blocked_by:
        blocker = data.tasks.get(blocker_id)
        if blocker is not None and not _finished(blocker):
            reasons.append(
                {"kind": "blocked_by", "task_id": blocker.id, "title": blocker.title}
            )
    if task.waiting_for:
        reasons.append(
            {"kind": "waiting", "text": task.waiting_for, "until": task.waiting_until}
        )
    return reasons


def compute_readiness(
    data: PlannerData, today: date | None = None
) -> dict[str, dict[str, Any]]:
    """Per task: ready flag and reasons (own and inherited) per D-6 / D-8."""
    children = children_map(data.tasks)
    own: dict[str, list[dict[str, Any]]] = {
        tid: _own_blockers(data, children, task) for tid, task in data.tasks.items()
    }
    result: dict[str, dict[str, Any]] = {}
    for tid, task in data.tasks.items():
        reasons = list(own[tid])
        for anc in ancestors(data.tasks, tid):
            for reason in own[anc]:
                inherited = dict(reason)
                inherited["via"] = anc
                inherited["via_title"] = data.tasks[anc].title
                reasons.append(inherited)
        active = task.status in ACTIVE_STATUSES
        due = bool(
            task.waiting_for
            and task.waiting_until
            and today is not None
            and task.waiting_until <= today.isoformat()
        )
        result[tid] = {
            "ready": active and not reasons,
            "reasons": reasons,
            "waiting_due": due,
            "leaf": not children.get(tid),
        }
    return result


# ---------------------------------------------------------------- dependency graph


def dependency_edges(data: PlannerData) -> dict[str, set[str]]:
    """Edges X -> Y meaning "X needs Y to be done first".

    Includes explicit blockers, sequential order, completion of parents after
    children and the blockers inherited from ancestors (D-7).
    """
    children = children_map(data.tasks)
    direct: dict[str, set[str]] = {tid: set() for tid in data.tasks}
    for tid, task in data.tasks.items():
        for blocker in task.blocked_by:
            if blocker in data.tasks:
                direct[tid].add(blocker)
        for pred in sequential_predecessors(children, data.tasks, task):
            direct[tid].add(pred.id)
    edges: dict[str, set[str]] = {tid: set(deps) for tid, deps in direct.items()}
    for tid, task in data.tasks.items():
        for kid in children.get(tid, []):
            edges[tid].add(kid.id)
        for anc in ancestors(data.tasks, tid):
            edges[tid] |= direct[anc]
    return edges


def has_cycle(data: PlannerData) -> bool:
    edges = dependency_edges(data)
    state: dict[str, int] = {}
    for start in edges:
        if state.get(start):
            continue
        stack = [(start, iter(edges[start]))]
        state[start] = 1
        while stack:
            node, it = stack[-1]
            advanced = False
            for nxt in it:
                if nxt == node:
                    return True
                status = state.get(nxt, 0)
                if status == 1:
                    return True
                if status == 0:
                    state[nxt] = 1
                    stack.append((nxt, iter(edges[nxt])))
                    advanced = True
                    break
            if not advanced:
                state[node] = 2
                stack.pop()
    return False


def prerequisites(
    data: PlannerData,
    task_id: str,
    children: dict[str | None, list[Task]] | None = None,
) -> list[str]:
    """Open leaf tasks that must be finished before ``task_id`` (own and inherited).

    A prerequisite that has sub-tasks is replaced by its open leaves.
    """
    if children is None:
        children = children_map(data.tasks)
    # only explicit / sequential prerequisites, not "parent needs its children"
    raw: set[str] = set()
    chain = [task_id, *ancestors(data.tasks, task_id)]
    for node in chain:
        task = data.tasks[node]
        raw.update(b for b in task.blocked_by if b in data.tasks)
        raw.update(p.id for p in sequential_predecessors(children, data.tasks, task))
    own_branch = set(descendants(children, task_id)) | {task_id}
    result: list[str] = []
    for req in raw:
        if req in own_branch:
            continue
        task = data.tasks[req]
        if _finished(task):
            continue
        if children.get(req):
            leaves = [
                d
                for d in descendants(children, req)
                if not children.get(d) and not _finished(data.tasks[d])
            ]
            result.extend(leaves)
        else:
            result.append(req)
    return sorted(set(result))
