from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from custom_components.umbau_planer.core import ops, stats, timer
from custom_components.umbau_planer.core.models import PlannerData, PlannerError, parse_dt

from .conftest import NOW, task

BERLIN = ZoneInfo("Europe/Berlin")


def test_switch_has_no_gap_or_overlap(data):
    """Abnahme 12."""
    a, b = task(data, "a"), task(data, "b")
    ops.start_timer(data, a.id, NOW)
    later = NOW + timedelta(minutes=47)
    second = ops.start_timer(data, b.id, later)
    entries = sorted(data.time_entries.values(), key=lambda e: e.start)
    assert entries[0].end == entries[1].start == second.start
    assert sum(1 for e in data.time_entries.values() if e.end is None) == 1


def test_start_same_task_is_noop(data):
    a = task(data, "a")
    first = ops.start_timer(data, a.id, NOW)
    again = ops.start_timer(data, a.id, NOW + timedelta(minutes=5))
    assert first.id == again.id and len(data.time_entries) == 1


def test_undo_switch(data):
    a, b = task(data, "a", est=60), task(data, "b", est=60)
    ops.start_timer(data, a.id, NOW)
    ops.start_timer(data, b.id, NOW + timedelta(minutes=10))
    assert b.estimate_frozen_at and b.status == "in_progress"
    ops.undo_switch(data)
    assert b.estimate_frozen_at is None and b.status == "open"
    running = timer.running_entry(data)
    assert running and running.task_id == a.id and len(data.time_entries) == 1


def test_stop_resume_and_options(data):
    a = task(data, "a", est=60)
    ops.start_timer(data, a.id, NOW)
    ops.stop_timer(data, NOW + timedelta(minutes=20), remaining_min=15)
    assert a.remaining_min == 15
    with pytest.raises(PlannerError):
        ops.stop_timer(data, NOW)
    resumed = ops.resume_timer(data, NOW + timedelta(minutes=30))
    assert resumed.task_id == a.id and len(data.time_entries) == 2
    ops.stop_timer(data, NOW + timedelta(minutes=40), mark_done=True)
    assert a.status == "done" and a.remaining_min == 0


def test_running_timer_survives_restart(data):
    """Abnahme 11: only the start is stored, elapsed time is derived."""
    a = task(data, "a")
    ops.start_timer(data, a.id, NOW)
    reloaded = PlannerData.from_dict(data.to_dict())
    entry = timer.running_entry(reloaded)
    later = NOW + timedelta(hours=1, minutes=5)
    from custom_components.umbau_planer.core.tree import entry_minutes

    assert entry_minutes(entry.start, entry.end, later) == 65


def test_overlap_and_range_validation(data):
    a = task(data, "a")
    ops.add_time_entry(data, a.id, NOW, NOW + timedelta(hours=1))
    with pytest.raises(PlannerError) as err:
        ops.add_time_entry(data, a.id, NOW + timedelta(minutes=30), NOW + timedelta(hours=2))
    assert err.value.code == "overlap"
    with pytest.raises(PlannerError) as err:
        ops.add_time_entry(data, a.id, NOW + timedelta(hours=3), NOW + timedelta(hours=2))
    assert err.value.code == "invalid_range"
    # touching is fine
    ops.add_time_entry(data, a.id, NOW + timedelta(hours=1), NOW + timedelta(hours=2))


def test_edit_and_reassign_booking(data):
    a, b = task(data, "a"), task(data, "b")
    e = ops.add_time_entry(data, a.id, NOW, NOW + timedelta(hours=1))
    ops.update_time_entry(
        data, e.id, {"task_id": b.id, "end": (NOW + timedelta(minutes=90)).isoformat(), "helper_min": 30}
    )
    assert e.task_id == b.id and e.helper_min == 30
    ops.delete_time_entry(data, e.id)
    assert not data.time_entries


def test_long_running_alert(data):
    a = task(data, "a")
    e = ops.start_timer(data, a.id, datetime(2026, 10, 12, 8, 0, tzinfo=BERLIN))
    now = datetime(2026, 10, 12, 12, 59, tzinfo=BERLIN)
    assert timer.timer_alert(e, now, 300, BERLIN) is None
    assert timer.timer_alert(e, now + timedelta(minutes=2), 300, BERLIN) == "duration"
    e2 = timer.running_entry(data)
    e2.start = datetime(2026, 10, 12, 23, 0, tzinfo=BERLIN).astimezone(timezone.utc).isoformat()
    assert timer.timer_alert(e2, datetime(2026, 10, 13, 0, 5, tzinfo=BERLIN), 300, BERLIN) == "midnight"


def test_totals_split_at_midnight(data):
    a = task(data, "a")
    start = datetime(2026, 10, 12, 23, 30, tzinfo=BERLIN)
    ops.add_time_entry(data, a.id, start, start + timedelta(hours=1), helper_min=15)
    days = timer.totals_by_day(data, NOW, BERLIN)
    assert days["2026-10-12"]["own"] == 30 and days["2026-10-13"]["own"] == 30
    assert days["2026-10-12"]["helper"] == 15
    weeks = timer.totals_by_week(days)
    assert weeks["2026-W42"]["own"] == 60


def _done(data, title, est, effort, cat=None, minutes_ago=0):
    t = task(data, title, est=est, category=cat)
    start = NOW - timedelta(days=30) + timedelta(hours=len(data.tasks) * 2)
    ops.add_time_entry(data, t.id, start, start + timedelta(minutes=effort))
    ops.set_status(data, t.id, "done", start + timedelta(minutes=effort))
    return t


def test_estimate_factor_median_and_projection(data):
    for i in range(5):
        _done(data, f"e{i}", 60, 120, "Elektrik")  # factor 2.0
    _done(data, "m1", 60, 60, "Malen")  # factor 1.0, too few samples
    open_el = task(data, "open-el", est=60, category="Elektrik")
    open_ma = task(data, "open-ma", est=60, category="Malen")
    open_none = task(data, "open-none")
    ev = stats.compute_evaluation(data, NOW, BERLIN)
    assert ev["overall"]["count"] == 6
    assert ev["by_category"]["Elektrik"]["median"] == 2.0
    assert ev["by_category"]["Elektrik"]["count"] == 5
    assert ev["by_category"]["Malen"]["median"] == 1.0
    projects = {p["title"]: p for p in ev["projects"]}
    # Elektrik uses 2.0, Malen falls back to the overall median (2.0)
    assert projects["open-el"]["forecast_min"] == 120
    assert projects["open-ma"]["forecast_min"] == 120
    assert [u["title"] for u in ev["unestimated"]] == ["open-none"]
    assert projects["open-el"]["forecast_blocks"] == round(120 / 360, 1)
    assert open_el and open_ma and open_none


def test_unestimated_not_in_factors(data):
    t = task(data, "noest")
    ops.add_time_entry(data, t.id, NOW, NOW + timedelta(minutes=30))
    ops.set_status(data, t.id, "done", NOW)
    assert stats.estimate_factors(data, NOW) == []


def test_block_plan_vs_booked(data):
    from custom_components.umbau_planer.core import plan
    from datetime import date

    t = task(data, "t", est=240)
    b = ops.create_block(data, "2026-10-10")
    ops.add_entry(data, t.id, block_id=b.id, today=date(2000, 1, 1), now=NOW, planned_min=240)
    start = datetime(2026, 10, 10, 9, 0, tzinfo=BERLIN)
    ops.add_time_entry(data, t.id, start, start + timedelta(minutes=100))
    plan.apply_rollover(data, date(2026, 10, 12), NOW)
    ev = stats.compute_evaluation(data, NOW, BERLIN)
    assert ev["blocks"][0]["planned_min"] == 240
    assert ev["blocks"][0]["booked_min"] == 100
    assert ev["blocks"][0]["rolled_over"] == 1
    assert parse_dt(ev["trend"][0]["completed_at"]) if ev["trend"] else True


def test_export_import_roundtrip(data):
    t = task(data, "t", est=60)
    ops.set_priority(data, t.id, "a", 2)
    ops.start_timer(data, t.id, NOW)
    b = ops.create_block(data, "2026-10-13")
    ops.add_entry(data, t.id, block_id=b.id, today=NOW.date(), now=NOW)
    blob = data.to_dict()
    again = PlannerData.from_dict(blob)
    assert again.to_dict() == blob
