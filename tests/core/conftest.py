from __future__ import annotations

from datetime import date, datetime, timezone

import pytest

from custom_components.umbau_planer.core import ops
from custom_components.umbau_planer.core.models import (
    PlannerData,
    Person,
    ROLE_EXECUTOR,
    ROLE_RATER,
)

NOW = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)
TODAY = date(2026, 10, 12)


@pytest.fixture
def data() -> PlannerData:
    d = PlannerData()
    d.settings.persons = [
        Person(id="a", name="Aaron", role=ROLE_EXECUTOR, ha_user_id="u1"),
        Person(id="b", name="Bea", role=ROLE_RATER, ha_user_id="u2"),
    ]
    return d


def task(data: PlannerData, title: str, parent: str | None = None, est: int | None = None, **kw):
    return ops.create_task(data, title, parent, now=NOW, estimate_initial_min=est, **kw)
