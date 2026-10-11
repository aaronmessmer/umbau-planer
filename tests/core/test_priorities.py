import pytest

from custom_components.umbau_planer.core import ops
from custom_components.umbau_planer.core.models import PlannerError
from custom_components.umbau_planer.core.priorities import (
    compute_priorities,
    level_value_map,
    rescale_preview,
    sort_key,
)

from .conftest import task


def rate(data, t, a=None, b=None):
    if a:
        ops.set_priority(data, t.id, "a", a)
    if b:
        ops.set_priority(data, t.id, "b", b)


def test_linear_with_few_rated(data):
    t = task(data, "x")
    rate(data, t, 1, 5)
    p = compute_priorities(data)[t.id]
    assert p["combined_value"] == 0.5
    assert p["combined_level"] == 3.0
    assert p["disagree"] is True
    assert p["distance"] == 4


def test_inherited_levels_and_disagree_example(data):
    """Abnahme 3."""
    parent = task(data, "Regal")
    child = task(data, "Brett", parent.id)
    rate(data, parent, 1, 5)
    p = compute_priorities(data)
    assert p[parent.id]["disagree"]
    assert p[child.id]["persons"]["a"]["level"] == 1
    assert p[child.id]["persons"]["a"]["inherited"] is True
    assert p[child.id]["persons"]["b"]["own"] is None


def test_single_person_counts_alone(data):
    t = task(data, "x")
    rate(data, t, 2)
    p = compute_priorities(data)[t.id]
    assert p["combined_value"] == pytest.approx(0.25)
    assert not p["disagree"]


def test_unrated_goes_last(data):
    unrated = task(data, "u")
    rated = task(data, "r")
    rate(data, rated, 5, 5)
    prios = compute_priorities(data)
    assert prios[unrated.id]["unrated"]
    ordered = sorted([unrated, rated], key=lambda t: sort_key(prios[t.id]))
    assert ordered[0].id == rated.id


def test_tie_broken_by_tree_order(data):
    first = task(data, "first")
    second = task(data, "second")
    rate(data, first, 3, 3)
    rate(data, second, 3, 3)
    prios = compute_priorities(data)
    ordered = sorted([second, first], key=lambda t: sort_key(prios[t.id]))
    assert ordered[0].id == first.id


def test_rank_based_value_rewards_rare_levels(data):
    # person a rates 9 tasks with 1 and one task with 2: level 2 is rare
    tasks = [task(data, f"t{i}") for i in range(10)]
    for i, t in enumerate(tasks):
        ops.set_priority(data, t.id, "a", 2 if i == 9 else 1)
    values = level_value_map(data, "a")
    assert values[1] == pytest.approx(4 / 10)  # mean 0-based rank of 0..8
    assert values[2] == pytest.approx(9 / 10)


def test_level_validation(data):
    t = task(data, "x")
    with pytest.raises(PlannerError):
        ops.set_priority(data, t.id, "a", 9)
    with pytest.raises(PlannerError):
        ops.set_priority(data, t.id, "zzz", 1)


def test_rescale_levels(data):
    t = task(data, "x")
    rate(data, t, 5, 1)
    preview = rescale_preview(data, ["a", "b", "c"])
    assert {(c["person_id"], c["new"]) for c in preview} == {("a", 3)}
    ops.update_settings(data, {"level_names": ["a", "b", "c"]})
    assert t.priorities == {"a": 3, "b": 1}
