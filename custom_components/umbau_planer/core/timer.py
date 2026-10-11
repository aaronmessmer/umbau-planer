"""Stopwatch helpers (T-1 .. T-11) that do not need Home Assistant."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, tzinfo
from typing import Any

from .models import PlannerData, PlannerError, TimeEntry, parse_dt


def running_entry(data: PlannerData) -> TimeEntry | None:
    for entry in data.time_entries.values():
        if entry.end is None:
            return entry
    return None


def validate_booking(
    data: PlannerData,
    start: datetime,
    end: datetime | None,
    ignore_id: str | None = None,
) -> None:
    """T-6: end after start, no overlap with other bookings."""
    if end is not None and end <= start:
        raise PlannerError("invalid_range", "Das Ende muss nach dem Beginn liegen.")
    for other in data.time_entries.values():
        if other.id == ignore_id:
            continue
        o_start = parse_dt(other.start)
        o_end = parse_dt(other.end) if other.end else None
        starts_before_other_ends = o_end is None or start < o_end
        other_starts_before_end = end is None or o_start < end
        if starts_before_other_ends and other_starts_before_end:
            raise PlannerError(
                "overlap", "Die Buchung überschneidet sich mit einer anderen."
            )


def timer_alert(
    entry: TimeEntry, now: datetime, threshold_min: int, tz: tzinfo
) -> str | None:
    """T-7: reason why a running clock needs attention, else None."""
    if entry.end is not None:
        return None
    start = parse_dt(entry.start)
    if now - start >= timedelta(minutes=threshold_min):
        return "duration"
    if start.astimezone(tz).date() != now.astimezone(tz).date():
        return "midnight"
    return None


def split_by_day(
    start: datetime, end: datetime, tz: tzinfo
) -> list[tuple[str, int]]:
    """Whole minutes per local calendar day."""
    result: list[tuple[str, int]] = []
    cursor = start.astimezone(tz)
    stop = end.astimezone(tz)
    while cursor < stop:
        next_midnight = (cursor + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        chunk_end = min(stop, next_midnight)
        minutes = int((chunk_end - cursor).total_seconds() // 60)
        result.append((cursor.date().isoformat(), minutes))
        cursor = chunk_end
    return result


def totals_by_day(
    data: PlannerData, now: datetime, tz: tzinfo
) -> dict[str, dict[str, int]]:
    """T-11: own and helper minutes per local day."""
    days: dict[str, dict[str, int]] = defaultdict(lambda: {"own": 0, "helper": 0})
    for entry in data.time_entries.values():
        start = parse_dt(entry.start)
        end = parse_dt(entry.end) if entry.end else now
        if end <= start:
            continue
        for day, minutes in split_by_day(start, end, tz):
            days[day]["own"] += minutes
        days[start.astimezone(tz).date().isoformat()]["helper"] += entry.helper_min or 0
    return dict(days)


def totals_by_week(days: dict[str, dict[str, int]]) -> dict[str, dict[str, int]]:
    weeks: dict[str, dict[str, int]] = defaultdict(lambda: {"own": 0, "helper": 0})
    for day, values in days.items():
        year, week, _ = datetime.fromisoformat(day).isocalendar()
        key = f"{year}-W{week:02d}"
        weeks[key]["own"] += values["own"]
        weeks[key]["helper"] += values["helper"]
    return dict(weeks)


def minutes_on_day_for_task(
    data: PlannerData, day: str, tz: tzinfo, now: datetime
) -> dict[str, int]:
    """Own minutes per task on one local day (for planned vs booked, B-7)."""
    result: dict[str, int] = defaultdict(int)
    for entry in data.time_entries.values():
        start = parse_dt(entry.start)
        end = parse_dt(entry.end) if entry.end else now
        if end <= start:
            continue
        for d, minutes in split_by_day(start, end, tz):
            if d == day:
                result[entry.task_id] += minutes
    return dict(result)


def entry_dict(entry: TimeEntry) -> dict[str, Any]:
    return entry.to_dict()
