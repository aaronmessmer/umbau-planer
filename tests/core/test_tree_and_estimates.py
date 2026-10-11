from datetime import timedelta

import pytest

from custom_components.umbau_planer.core import ops
from custom_components.umbau_planer.core.models import PlannerError
from custom_components.umbau_planer.core.tree import compute_summaries

from .conftest import NOW, task


def test_sum_up_the_tree(data):
    """Abnahme 1: three levels, 2h and 3h at the bottom -> 5h everywhere above."""
    project = task(data, "Haus")
    mid = task(data, "Flur", project.id)
    a = task(data, "Leisten", mid.id, 120)
    b = task(data, "Streichen", mid.id, 180)
    s = compute_summaries(data, NOW)
    assert s[a.id]["estimate_min"] == 120
    assert s[mid.id]["estimate_min"] == 300
    assert s[project.id]["estimate_min"] == 300
    assert s[project.id]["remaining_min"] == 300
    assert b.id in data.tasks


def test_rough_estimate_next_to_sum(data):
    project = task(data, "Haus", est=600)
    task(data, "Leisten", project.id, 120)
    s = compute_summaries(data, NOW)
    assert s[project.id]["estimate_min"] == 120
    assert s[project.id]["rough_min"] == 600


def test_freeze_on_first_booking(data):
    """Abnahme 2."""
    t = task(data, "Regal", est=240)
    ops.add_time_entry(data, t.id, NOW, NOW + timedelta(minutes=30))
    assert t.estimate_frozen_at
    assert t.status == "in_progress"
    with pytest.raises(PlannerError) as err:
        ops.update_task(data, t.id, {"estimate_initial_min": 300}, now=NOW)
    assert err.value.code == "frozen"
    ops.update_task(data, t.id, {"remaining_min": 100}, now=NOW)
    assert t.remaining_min == 100
    s = compute_summaries(data, NOW + timedelta(hours=1))
    assert s[t.id]["booked_min"] == 30
    assert s[t.id]["remaining_min"] == 100
    assert s[t.id]["forecast_min"] == 130
    assert s[t.id]["deviation_min"] == -110


def test_remaining_suggestion_is_estimate_minus_booked(data):
    t = task(data, "Regal", est=60)
    ops.add_time_entry(data, t.id, NOW, NOW + timedelta(minutes=90))
    s = compute_summaries(data, NOW + timedelta(hours=2))
    assert s[t.id]["remaining_min"] == 0  # at least 0


def test_helper_minutes_count_as_effort(data):
    t = task(data, "Regal", est=120)
    ops.add_time_entry(data, t.id, NOW, NOW + timedelta(minutes=60), helper_min=60)
    s = compute_summaries(data, NOW + timedelta(hours=3))
    assert s[t.id]["booked_own_min"] == 60
    assert s[t.id]["booked_min"] == 120
    assert s[t.id]["remaining_min"] == 0


def test_direct_booking_on_parent_counts(data):
    project = task(data, "Haus")
    child = task(data, "Leisten", project.id, 60)
    ops.add_time_entry(data, project.id, NOW, NOW + timedelta(minutes=45))
    s = compute_summaries(data, NOW + timedelta(hours=2))
    assert s[project.id]["booked_min"] == 45
    assert s[child.id]["booked_min"] == 0


def test_done_sets_remaining_zero_and_parent_follows(data):
    project = task(data, "Haus")
    a = task(data, "A", project.id, 60)
    b = task(data, "B", project.id, 60)
    ops.set_status(data, a.id, "done", NOW)
    assert a.remaining_min == 0
    assert project.status == "open"
    ops.set_status(data, b.id, "discarded", NOW)
    assert project.status == "done"
    c = task(data, "C", project.id, 30)
    assert project.status == "open"
    assert c.status == "open"


def test_unestimated_flagged(data):
    t = task(data, "Ohne")
    assert compute_summaries(data, NOW)[t.id]["unestimated"] is True


def test_move_rules(data):
    project = task(data, "Haus")
    a = task(data, "A", project.id)
    b = task(data, "B", a.id)
    with pytest.raises(PlannerError):
        ops.move_task(data, a.id, b.id)
    with pytest.raises(PlannerError):
        ops.move_task(data, a.id, a.id)
    other = task(data, "Camper")
    ops.move_task(data, b.id, other.id, 0)
    assert b.parent_id == other.id


def test_reorder(data):
    p = task(data, "P")
    a, b, c = (task(data, n, p.id) for n in "abc")
    ops.move_task(data, c.id, p.id, 0)
    order = sorted([a, b, c], key=lambda t: t.order)
    assert [t.title for t in order] == ["c", "a", "b"]


def test_delete_keeps_booked_as_discarded(data):
    p = task(data, "P")
    a = task(data, "A", p.id)
    b = task(data, "B", p.id)
    ops.add_time_entry(data, a.id, NOW, NOW + timedelta(minutes=10))
    info = ops.delete_info(data, p.id)
    assert info["descendants"] == 2
    result = ops.delete_task(data, p.id, NOW)
    assert result == {"deleted": 1, "discarded": 2}
    assert b.id not in data.tasks
    assert data.tasks[a.id].status == "discarded"
    assert data.tasks[p.id].status == "discarded"


def test_delete_without_bookings_removes_references(data):
    a = task(data, "A")
    b = task(data, "B", blocked_by=[a.id])
    ops.delete_task(data, a.id, NOW)
    assert b.blocked_by == []
    assert a.id not in data.tasks
