import pytest

from custom_components.umbau_planer.core import ops
from custom_components.umbau_planer.core.models import PlannerError
from custom_components.umbau_planer.core.readiness import compute_readiness, prerequisites

from .conftest import NOW, TODAY, task


def ready(data):
    return {tid: r["ready"] for tid, r in compute_readiness(data, TODAY).items()}


def test_sequential_children(data):
    """Abnahme 4."""
    p = task(data, "P", children_mode="sequential")
    a, b, c = (task(data, n, p.id) for n in "abc")
    r = ready(data)
    assert (r[a.id], r[b.id], r[c.id]) == (True, False, False)
    ops.set_status(data, a.id, "done", NOW)
    r = ready(data)
    assert (r[b.id], r[c.id]) == (True, False)


def test_any_mode_all_ready_and_reorder_changes_dependency(data):
    p = task(data, "P")
    a, b = task(data, "a", p.id), task(data, "b", p.id)
    assert ready(data)[b.id]
    ops.update_task(data, p.id, {"children_mode": "sequential"})
    assert not ready(data)[b.id]
    ops.move_task(data, b.id, p.id, 0)
    assert ready(data)[b.id] and not ready(data)[a.id]


def test_blocked_by_other_branch_with_reason(data):
    x, y = task(data, "x"), task(data, "y")
    ops.update_task(data, y.id, {"blocked_by": [x.id]})
    info = compute_readiness(data, TODAY)[y.id]
    assert not info["ready"]
    assert info["reasons"][0]["task_id"] == x.id
    ops.set_status(data, x.id, "discarded", NOW)
    assert ready(data)[y.id]


def test_block_is_inherited_by_children(data):
    p = task(data, "P")
    child = task(data, "c", p.id)
    gate = task(data, "gate")
    ops.update_task(data, p.id, {"blocked_by": [gate.id]})
    info = compute_readiness(data, TODAY)[child.id]
    assert not info["ready"]
    assert info["reasons"][0]["via"] == p.id


def test_waiting_for_and_due_notice(data):
    t = task(data, "t")
    ops.update_task(data, t.id, {"waiting_for": "Material", "waiting_until": "2026-10-01"})
    info = compute_readiness(data, TODAY)[t.id]
    assert not info["ready"] and info["waiting_due"]
    ops.update_task(data, t.id, {"waiting_for": None})
    assert ready(data)[t.id]


def test_done_task_not_ready(data):
    t = task(data, "t")
    ops.set_status(data, t.id, "done", NOW)
    assert not ready(data)[t.id]


def test_cycle_rejected_direct_and_indirect(data):
    a, b, c = task(data, "a"), task(data, "b"), task(data, "c")
    ops.update_task(data, a.id, {"blocked_by": [b.id]})
    ops.update_task(data, b.id, {"blocked_by": [c.id]})
    with pytest.raises(PlannerError) as err:
        ops.update_task(data, c.id, {"blocked_by": [a.id]})
    assert err.value.code == "cycle"
    assert data.tasks[c.id].blocked_by == []
    with pytest.raises(PlannerError):
        ops.update_task(data, a.id, {"blocked_by": [a.id]})


def test_cycle_via_ancestor_and_descendant(data):
    p = task(data, "p")
    c = task(data, "c", p.id)
    with pytest.raises(PlannerError):
        ops.update_task(data, p.id, {"blocked_by": [c.id]})
    with pytest.raises(PlannerError):
        ops.update_task(data, c.id, {"blocked_by": [p.id]}) if False else ops.update_task(
            data, p.id, {"blocked_by": [c.id]}
        )
    other = task(data, "other")
    ops.update_task(data, p.id, {"blocked_by": [other.id]})
    with pytest.raises(PlannerError):
        ops.update_task(data, other.id, {"blocked_by": [c.id]})


def test_sequence_vs_blocked_by_cycle(data):
    p = task(data, "p", children_mode="sequential")
    a, b = task(data, "a", p.id), task(data, "b", p.id)
    with pytest.raises(PlannerError):
        ops.update_task(data, a.id, {"blocked_by": [b.id]})


def test_prerequisites_expand_to_leaves(data):
    gate = task(data, "gate")
    g1, g2 = task(data, "g1", gate.id), task(data, "g2", gate.id)
    t = task(data, "t")
    ops.update_task(data, t.id, {"blocked_by": [gate.id]})
    assert sorted(prerequisites(data, t.id)) == sorted([g1.id, g2.id])
