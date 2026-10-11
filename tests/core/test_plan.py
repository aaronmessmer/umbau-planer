from datetime import date

import pytest

from custom_components.umbau_planer.core import ops, plan
from custom_components.umbau_planer.core.models import PlannerError

from .conftest import NOW, TODAY, task


def block(data, day, **kw):
    return ops.create_block(data, day, **kw)


def entry(data, t, b, minutes, **kw):
    # bypass the "past block" check for building test fixtures
    e = ops.add_entry(data, t.id, block_id=b.id, today=date(2000, 1, 1), now=NOW, planned_min=minutes, **kw)
    return e


def layout(data, block_id):
    return [(data.tasks[e.task_id].title, e.planned_min) for e in plan.block_entries(data.entries, block_id, False)]


def test_block_defaults_and_fill(data):
    b = block(data, "2026-10-13")
    assert b.capacity_min == 360
    t = task(data, "t", est=600)
    entry(data, t, b, 270)
    assert plan.block_fill(data.entries, b.id) == 270
    assert ops.block_overbooked(data, b.id) is False
    entry(data, t, b, 200)
    assert ops.block_overbooked(data, b.id) is True


def test_only_leaves_plannable_and_default_minutes(data):
    p = task(data, "p")
    c = task(data, "c", p.id, 90)
    with pytest.raises(PlannerError):
        ops.add_entry(data, p.id, block_id=None, today=TODAY, now=NOW)
    b = block(data, "2026-10-13")
    e1 = ops.add_entry(data, c.id, block_id=b.id, today=TODAY, now=NOW)
    assert e1.planned_min == 90
    b2 = block(data, "2026-10-14")
    e2 = ops.add_entry(data, c.id, block_id=b2.id, today=TODAY, now=NOW)
    assert e2.planned_min == 30  # nothing left to plan -> minimal default


def test_past_blocks_not_plannable(data):
    b = block(data, "2026-10-01")
    t = task(data, "t", est=60)
    with pytest.raises(PlannerError) as err:
        ops.add_entry(data, t.id, block_id=b.id, today=TODAY, now=NOW)
    assert err.value.code == "past_block"


def test_reserved_block_only_branch(data):
    camper = task(data, "Camper")
    part = task(data, "Teil", camper.id, 60)
    house = task(data, "Haus", est=60)
    b = block(data, "2026-10-13", reserved_for=camper.id)
    ops.add_entry(data, part.id, block_id=b.id, today=TODAY, now=NOW)
    with pytest.raises(PlannerError) as err:
        ops.add_entry(data, house.id, block_id=b.id, today=TODAY, now=NOW)
    assert err.value.code == "reserved"


def test_move_entry_between_blocks(data):
    b1, b2 = block(data, "2026-10-13"), block(data, "2026-10-14")
    a, c = task(data, "a", est=60), task(data, "c", est=60)
    e1 = entry(data, a, b1, 60)
    entry(data, c, b1, 60)
    ops.move_entry(data, e1.id, block_id=b2.id, index=0, today=TODAY)
    assert layout(data, b1.id) == [("c", 60)]
    assert layout(data, b2.id) == [("a", 60)]


def setup_rollover(data):
    past = block(data, "2026-10-10")
    b1 = block(data, "2026-10-13")
    b2 = block(data, "2026-10-14")
    return past, b1, b2


def test_rollover_splits_entry(data):
    """Abnahme 6: 4h occupied in a 6h block, a 4h task is split 2h + 2h."""
    past, b1, b2 = setup_rollover(data)
    first = task(data, "first", est=240)
    second = task(data, "second", est=240)
    entry(data, first, past, 240)
    entry(data, second, past, 240)
    result = plan.compute_rollover(data, TODAY, NOW)
    assert {a["task_id"] for a in result["affected"]} == {first.id, second.id}
    plan.apply_rollover(data, TODAY, NOW)
    assert layout(data, b1.id) == [("first", 240), ("second", 120)]
    assert layout(data, b2.id) == [("second", 120)]
    assert all(e.superseded for e in plan.block_entries(data.entries, past.id))


def test_rollover_no_split_below_minimum(data):
    past, b1, b2 = setup_rollover(data)
    big = task(data, "big", est=340)
    small = task(data, "small", est=40)
    entry(data, big, past, 340)
    entry(data, small, past, 40)
    plan.apply_rollover(data, TODAY, NOW)
    # 20 minutes would remain in b1: small (40) can neither fit nor be split
    assert layout(data, b1.id) == [("big", 340)]
    assert layout(data, b2.id) == [("small", 40)]


def test_rollover_uses_answered_remaining(data):
    past, b1, _ = setup_rollover(data)
    t = task(data, "t", est=240)
    entry(data, t, past, 240)
    plan.apply_rollover(data, TODAY, NOW, {t.id: 90})
    assert layout(data, b1.id) == [("t", 90)]
    assert t.remaining_min == 90


def test_rollover_skips_done_tasks_and_keeps_history(data):
    past, b1, _ = setup_rollover(data)
    done = task(data, "done", est=60)
    open_ = task(data, "open", est=60)
    entry(data, done, past, 60)
    entry(data, open_, past, 60)
    ops.set_status(data, done.id, "done", NOW)
    plan.apply_rollover(data, TODAY, NOW)
    assert layout(data, b1.id) == [("open", 60)]
    history = plan.block_entries(data.entries, past.id)
    flags = {data.tasks[e.task_id].title: e.superseded for e in history}
    assert flags == {"done": False, "open": True}


def test_fixed_entry_stays_and_reduces_capacity(data):
    """Abnahme 7 (first half)."""
    past, b1, b2 = setup_rollover(data)
    fixed_task = task(data, "fixed", est=120)
    carried = task(data, "carried", est=300)
    f = entry(data, fixed_task, b1, 120, fixed=True, fixed_time="09:00", with_whom="Papa")
    entry(data, carried, past, 300)
    plan.apply_rollover(data, TODAY, NOW)
    assert data.entries[f.id].block_id == b1.id
    assert data.entries[f.id].order == f.order
    assert data.entries[f.id].fixed_time == "09:00"
    assert layout(data, b1.id)[0][0] in ("fixed", "carried")
    assert sum(m for _, m in layout(data, b1.id)) <= 360
    assert dict(layout(data, b1.id))["carried"] == 240
    assert dict(layout(data, b2.id))["carried"] == 60


def test_unfinished_fixed_goes_to_reschedule(data):
    """Abnahme 7 (second half)."""
    past, b1, _ = setup_rollover(data)
    t = task(data, "meeting", est=120)
    entry(data, t, past, 120, fixed=True)
    plan.apply_rollover(data, TODAY, NOW)
    assert layout(data, b1.id) == []
    resched = [e for e in data.entries.values() if e.list == "reschedule"]
    assert len(resched) == 1 and resched[0].task_id == t.id
    assert resched[0].planned_min == 120


def test_reserved_block_receives_nothing(data):
    """Abnahme 8."""
    past = block(data, "2026-10-10")
    reserved_task = task(data, "Camper")
    reserved = block(data, "2026-10-13", reserved_for=reserved_task.id)
    free = block(data, "2026-10-14")
    t = task(data, "t", est=60)
    entry(data, t, past, 60)
    plan.apply_rollover(data, TODAY, NOW)
    assert layout(data, reserved.id) == []
    assert layout(data, free.id) == [("t", 60)]


def test_overflow_goes_to_unscheduled_in_order(data):
    past, b1, _ = setup_rollover(data)
    data.blocks.pop(next(b.id for b in data.blocks.values() if b.date == "2026-10-14"))
    a = task(data, "a", est=360)
    b = task(data, "b", est=60)
    c = task(data, "c", est=45)
    for t in (a, b, c):
        entry(data, t, past, t.estimate_initial_min)
    plan.apply_rollover(data, TODAY, NOW)
    assert layout(data, b1.id) == [("a", 360)]
    waiting = sorted(
        (e for e in data.entries.values() if e.list == "unscheduled"), key=lambda e: e.order
    )
    assert [(data.tasks[e.task_id].title, e.planned_min) for e in waiting] == [("b", 60), ("c", 45)]


def test_entries_of_same_task_merge(data):
    past, b1, _ = setup_rollover(data)
    t = task(data, "t", est=200)
    entry(data, t, past, 100)
    entry(data, t, b1, 100)  # already planned in the future
    plan.apply_rollover(data, TODAY, NOW, {t.id: 200})
    assert layout(data, b1.id) == [("t", 200)]


def test_rollover_undo_restores_exactly(data):
    """Abnahme 10."""
    past, b1, b2 = setup_rollover(data)
    t1, t2 = task(data, "t1", est=300), task(data, "t2", est=300)
    entry(data, t1, past, 300)
    entry(data, t2, b1, 300)
    before = sorted((e.to_dict() for e in data.entries.values()), key=lambda d: d["id"])
    remaining_before = t1.remaining_min
    plan.apply_rollover(data, TODAY, NOW, {t1.id: 250})
    assert t1.remaining_min == 250
    plan.undo_rollover(data)
    after = sorted((e.to_dict() for e in data.entries.values()), key=lambda d: d["id"])
    assert after == before
    assert t1.remaining_min == remaining_before
    with pytest.raises(PlannerError):
        plan.undo_rollover(data)


def test_manual_edit_invalidates_undo(data):
    past, b1, _ = setup_rollover(data)
    t = task(data, "t", est=60)
    entry(data, t, past, 60)
    plan.apply_rollover(data, TODAY, NOW)
    assert data.rollover_undo
    ops.create_block(data, "2026-10-20")
    assert data.rollover_undo is None


def test_warning_order_and_fixed(data):
    """Abnahme 9 and B-6."""
    b1, b2 = block(data, "2026-10-13"), block(data, "2026-10-14")
    pre = task(data, "pre", est=60)
    main = task(data, "main", est=60)
    ops.update_task(data, main.id, {"blocked_by": [pre.id]})
    e_main = entry(data, main, b1, 60)
    # prerequisite not planned at all: only fixed entries warn
    assert plan.plan_warnings(data) == []
    ops.update_entry(data, e_main.id, {"fixed": True}, TODAY)
    warnings = plan.plan_warnings(data)
    assert warnings[0]["reason"] == "not_planned"
    e_pre = entry(data, pre, b2, 60)
    kinds = {w["reason"] for w in plan.plan_warnings(data)}
    assert kinds == {"fixed_after"}
    ops.move_entry(data, e_pre.id, block_id=b1.id, index=0, today=TODAY)
    assert plan.plan_warnings(data) == []
    ops.update_entry(data, e_main.id, {"fixed": False}, TODAY)
    ops.move_entry(data, e_pre.id, block_id=b2.id, index=0, today=TODAY)
    assert plan.plan_warnings(data)[0]["reason"] == "order"


def test_preview_reports_prerequisite_slipping_behind_fixed(data):
    """F-5."""
    past = block(data, "2026-10-10")
    b1, b2 = block(data, "2026-10-13"), block(data, "2026-10-14")
    pre = task(data, "pre", est=60)
    main = task(data, "main", est=60)
    filler = task(data, "filler", est=360)
    ops.update_task(data, main.id, {"blocked_by": [pre.id]})
    entry(data, main, b2, 60, fixed=True)
    entry(data, pre, past, 60)
    # "pre" lands in b1, before the fixed entry in b2: no warning
    assert plan.compute_rollover(data, TODAY, NOW)["warnings"] == []
    # a filler that is queued first fills b1; "pre" slips to b2, behind the fixed entry
    entry(data, filler, past, 360)
    ops.move_entry(data, next(e.id for e in data.entries.values() if e.task_id == filler.id), block_id=past.id, index=0, today=date(2000, 1, 1))
    pushed = plan.compute_rollover(data, TODAY, NOW)
    assert [w["prerequisite_id"] for w in pushed["warnings"]] == [pre.id]


def test_block_series(data):
    blocks = plan.create_block_series(
        data, date(2026, 10, 12), [5, 6], count=4, start_time="08:00", note="Haus"
    )
    assert [b.date for b in blocks] == ["2026-10-17", "2026-10-18", "2026-10-24", "2026-10-25"]
    assert blocks[0].start_time == "08:00" and blocks[0].capacity_min == 360
    with pytest.raises(PlannerError):
        plan.create_block_series(data, TODAY, [], count=2)


def test_suggest_fill_by_priority_and_readiness(data):
    b = block(data, "2026-10-13")
    low = task(data, "low", est=180)
    high = task(data, "high", est=240)
    blocked = task(data, "blocked", est=60)
    ops.set_priority(data, low.id, "a", 5)
    ops.set_priority(data, high.id, "a", 1)
    ops.set_priority(data, blocked.id, "a", 1)
    ops.update_task(data, blocked.id, {"blocked_by": [low.id]})
    proposal = plan.suggest_fill(data, b.id, TODAY, NOW)
    assert [(p["title"], p["planned_min"]) for p in proposal] == [("high", 240), ("low", 120)]


def test_delete_block_moves_entries_to_unscheduled(data):
    b = block(data, "2026-10-13")
    t = task(data, "t", est=60)
    entry(data, t, b, 60)
    ops.delete_block(data, b.id)
    assert [e.list for e in data.entries.values()] == ["unscheduled"]
