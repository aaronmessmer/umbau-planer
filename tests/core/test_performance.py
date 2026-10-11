"""Q-4: the derived values for 1000 tasks and 5000 bookings must be cheap."""
import random
import time
from datetime import timedelta

from custom_components.umbau_planer.core import plan
from custom_components.umbau_planer.core.models import PlannerData, TimeEntry, to_iso
from custom_components.umbau_planer.core.priorities import compute_priorities
from custom_components.umbau_planer.core.readiness import compute_readiness
from custom_components.umbau_planer.core.tree import compute_summaries

from .conftest import NOW, TODAY


def test_derived_values_for_large_data_set(data: PlannerData):
    from custom_components.umbau_planer.core import ops

    random.seed(1)
    ids: list[str] = []
    for p in range(10):
        root = ops.create_task(data, f"P{p}", now=NOW)
        ids.append(root.id)
        for i in range(99):
            t = ops.create_task(
                data, f"T{p}-{i}", random.choice(ids[-30:]), now=NOW, estimate_initial_min=60
            )
            ids.append(t.id)
    cursor = NOW - timedelta(days=400)
    for _ in range(5000):
        entry = TimeEntry(
            task_id=random.choice(ids), start=to_iso(cursor), end=to_iso(cursor + timedelta(minutes=30))
        )
        data.time_entries[entry.id] = entry
        cursor += timedelta(minutes=45)
    assert len(data.tasks) == 1000

    started = time.perf_counter()
    compute_summaries(data, NOW)
    compute_priorities(data)
    compute_readiness(data, TODAY)
    plan.plan_warnings(data)
    assert time.perf_counter() - started < 1.0
