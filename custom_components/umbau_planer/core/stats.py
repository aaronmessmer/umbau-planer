"""Evaluation of estimates against reality (W-1 .. W-7)."""
from __future__ import annotations

import statistics
from datetime import datetime, tzinfo
from typing import Any

from .models import ACTIVE_STATUSES, DONE, PlannerData
from .plan import block_entries
from .timer import minutes_on_day_for_task
from .tree import children_map, compute_summaries, project_of

MIN_CATEGORY_SAMPLES = 5
TREND_TASKS = 30
UNCATEGORISED = "Ohne Gewerk"


def _factor_stats(factors: list[float]) -> dict[str, Any]:
    if not factors:
        return {"count": 0, "median": None, "stdev": None, "min": None, "max": None}
    return {
        "count": len(factors),
        "median": round(statistics.median(factors), 3),
        "stdev": round(statistics.pstdev(factors), 3) if len(factors) > 1 else 0.0,
        "min": round(min(factors), 3),
        "max": round(max(factors), 3),
    }


def estimate_factors(
    data: PlannerData, now: datetime
) -> list[dict[str, Any]]:
    """W-1: factor per finished leaf task with estimate and booked effort."""
    summaries = compute_summaries(data, now)
    kids = children_map(data.tasks)
    rows = []
    for task in data.tasks.values():
        if task.status != DONE or kids.get(task.id):
            continue
        info = summaries[task.id]
        if not task.estimate_initial_min or info["booked_min"] <= 0:
            continue
        rows.append(
            {
                "task_id": task.id,
                "title": task.title,
                "category": task.category or UNCATEGORISED,
                "project_id": project_of(data.tasks, task.id),
                "estimate_min": task.estimate_initial_min,
                "effort_min": info["booked_min"],
                "factor": info["booked_min"] / task.estimate_initial_min,
                "completed_at": task.completed_at or "",
            }
        )
    return rows


def compute_evaluation(
    data: PlannerData, now: datetime, tz: tzinfo
) -> dict[str, Any]:
    rows = estimate_factors(data, now)
    summaries = compute_summaries(data, now)
    kids = children_map(data.tasks)

    overall = [r["factor"] for r in rows]
    by_category: dict[str, list[float]] = {}
    by_project: dict[str, list[float]] = {}
    for r in rows:
        by_category.setdefault(r["category"], []).append(r["factor"])
        by_project.setdefault(r["project_id"], []).append(r["factor"])

    overall_median = statistics.median(overall) if overall else 1.0

    def factor_for(category: str | None) -> tuple[float, str]:
        cat = category or UNCATEGORISED
        samples = by_category.get(cat, [])
        if len(samples) >= MIN_CATEGORY_SAMPLES:
            return statistics.median(samples), "category"
        return overall_median, "overall"

    # W-3 trend over the last finished tasks
    ordered = sorted(rows, key=lambda r: r["completed_at"])[-TREND_TASKS:]
    trend = []
    for idx, row in enumerate(ordered):
        window = [r["factor"] for r in ordered[max(0, idx - 4) : idx + 1]]
        trend.append(
            {
                "task_id": row["task_id"],
                "title": row["title"],
                "completed_at": row["completed_at"],
                "factor": round(row["factor"], 3),
                "rolling_median": round(statistics.median(window), 3),
            }
        )

    # W-4 / W-5 projection per project
    projects: dict[str, dict[str, Any]] = {}
    capacity = data.settings.default_capacity_min or 360
    for task in data.tasks.values():
        if task.parent_id is not None:
            continue
        projects[task.id] = {
            "project_id": task.id,
            "title": task.title,
            "remaining_min": 0,
            "forecast_min": 0.0,
            "factor": _factor_stats(by_project.get(task.id, [])),
        }
    unestimated: list[dict[str, Any]] = []
    for task in data.tasks.values():
        if kids.get(task.id):
            continue
        info = summaries[task.id]
        if task.status in ACTIVE_STATUSES:
            if task.estimate_initial_min is None:
                unestimated.append(_unest(data, task.id, "open"))
            remaining = info["remaining_min"]
            if remaining > 0:
                factor, _ = factor_for(task.category)
                proj = projects[project_of(data.tasks, task.id)]
                proj["remaining_min"] += remaining
                proj["forecast_min"] += remaining * factor
        elif task.status == DONE and task.estimate_initial_min is None:
            unestimated.append(_unest(data, task.id, "done"))
    for proj in projects.values():
        proj["forecast_min"] = round(proj["forecast_min"])
        proj["forecast_blocks"] = round(proj["forecast_min"] / capacity, 1)
        proj["remaining_blocks"] = round(proj["remaining_min"] / capacity, 1)

    # W-6 plan vs reality per past block
    blocks_out = []
    for block in sorted(data.blocks.values(), key=lambda b: b.sort_key):
        entries = block_entries(data.entries, block.id)
        if not entries:
            continue
        day_minutes = minutes_on_day_for_task(data, block.date, tz, now)
        tasks_here = {e.task_id for e in entries}
        blocks_out.append(
            {
                "block_id": block.id,
                "date": block.date,
                "closed": block.closed,
                "planned_min": sum(e.planned_min for e in entries),
                "booked_min": sum(day_minutes.get(t, 0) for t in tasks_here),
                "rolled_over": sum(1 for e in entries if e.superseded),
            }
        )

    return {
        "overall": _factor_stats(overall),
        "by_category": {k: _factor_stats(v) for k, v in sorted(by_category.items())},
        "by_project": {
            pid: dict(_factor_stats(v), title=data.tasks[pid].title)
            for pid, v in by_project.items()
            if pid in data.tasks
        },
        "trend": trend,
        "projects": sorted(projects.values(), key=lambda p: p["title"].lower()),
        "blocks": blocks_out,
        "unestimated": sorted(unestimated, key=lambda u: u["title"].lower()),
    }


def _unest(data: PlannerData, task_id: str, state: str) -> dict[str, Any]:
    return {
        "task_id": task_id,
        "title": data.tasks[task_id].title,
        "project_id": project_of(data.tasks, task_id),
        "state": state,
    }
