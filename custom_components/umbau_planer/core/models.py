"""Data model of the Umbau-Planer. Pure Python, no Home Assistant imports."""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field, fields
from datetime import datetime, timezone
from typing import Any, TypeVar

SCHEMA_VERSION = 1

# Task status
OPEN = "open"
IN_PROGRESS = "in_progress"
DONE = "done"
DISCARDED = "discarded"
STATUSES = (OPEN, IN_PROGRESS, DONE, DISCARDED)
ACTIVE_STATUSES = (OPEN, IN_PROGRESS)
FINISHED_STATUSES = (DONE, DISCARDED)

# children_mode
MODE_ANY = "any"
MODE_SEQUENTIAL = "sequential"
MODES = (MODE_ANY, MODE_SEQUENTIAL)

# plan entry lists
LIST_UNSCHEDULED = "unscheduled"
LIST_RESCHEDULE = "reschedule"
LISTS = (LIST_UNSCHEDULED, LIST_RESCHEDULE)

# roles
ROLE_EXECUTOR = "executor"
ROLE_RATER = "rater"
ROLES = (ROLE_EXECUTOR, ROLE_RATER)

DEFAULT_LEVEL_NAMES = ["Sehr hoch", "Hoch", "Mittel", "Niedrig", "Sehr niedrig"]
DEFAULT_CATEGORIES = [
    "Elektrik",
    "Sanitär",
    "Malen",
    "Holz",
    "Trockenbau",
    "Boden",
    "Sonstiges",
]

T = TypeVar("T")


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def parse_dt(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _from_dict(cls: type[T], data: dict[str, Any]) -> T:
    names = {f.name for f in fields(cls)}  # type: ignore[arg-type]
    return cls(**{k: v for k, v in data.items() if k in names})  # type: ignore[call-arg]


@dataclass
class Task:
    id: str = field(default_factory=new_id)
    parent_id: str | None = None
    order: int = 0
    title: str = ""
    notes: str = ""
    status: str = OPEN
    category: str | None = None
    children_mode: str = MODE_ANY
    estimate_initial_min: int | None = None
    estimate_frozen_at: str | None = None
    remaining_min: int | None = None
    priorities: dict[str, int] = field(default_factory=dict)
    blocked_by: list[str] = field(default_factory=list)
    waiting_for: str | None = None
    waiting_until: str | None = None  # ISO date
    created_at: str = field(default_factory=lambda: to_iso(utcnow()))
    completed_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Task":
        return _from_dict(cls, data)


@dataclass
class WorkBlock:
    id: str = field(default_factory=new_id)
    date: str = ""  # ISO date
    start_time: str | None = None  # "HH:MM"
    capacity_min: int = 360
    reserved_for: str | None = None
    closed: bool = False
    note: str = ""
    created_at: str = field(default_factory=lambda: to_iso(utcnow()))

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "WorkBlock":
        return _from_dict(cls, data)

    @property
    def sort_key(self) -> tuple[str, str, str]:
        return (self.date, self.start_time or "99:99", self.created_at)


@dataclass
class PlanEntry:
    id: str = field(default_factory=new_id)
    task_id: str = ""
    block_id: str | None = None
    order: int = 0
    planned_min: int = 0
    fixed: bool = False
    fixed_time: str | None = None
    with_whom: str | None = None
    list: str | None = None
    superseded: bool = False
    origin_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PlanEntry":
        return _from_dict(cls, data)


@dataclass
class TimeEntry:
    id: str = field(default_factory=new_id)
    task_id: str = ""
    start: str = ""
    end: str | None = None
    helper_min: int = 0
    note: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "TimeEntry":
        return _from_dict(cls, data)


@dataclass
class Person:
    id: str = field(default_factory=new_id)
    name: str = ""
    ha_user_id: str | None = None
    role: str = ROLE_EXECUTOR

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Person":
        return _from_dict(cls, data)


@dataclass
class Settings:
    persons: list[Person] = field(default_factory=list)
    level_names: list[str] = field(default_factory=lambda: list(DEFAULT_LEVEL_NAMES))
    default_capacity_min: int = 360
    categories: list[str] = field(default_factory=lambda: list(DEFAULT_CATEGORIES))
    disagree_threshold: int = 2
    min_split_min: int = 30
    long_timer_min: int = 300

    @property
    def levels(self) -> int:
        return len(self.level_names)

    def to_dict(self) -> dict[str, Any]:
        out = asdict(self)
        out["persons"] = [p.to_dict() for p in self.persons]
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Settings":
        data = dict(data)
        data["persons"] = [Person.from_dict(p) for p in data.get("persons", [])]
        return _from_dict(cls, data)


@dataclass
class PlannerData:
    tasks: dict[str, Task] = field(default_factory=dict)
    blocks: dict[str, WorkBlock] = field(default_factory=dict)
    entries: dict[str, PlanEntry] = field(default_factory=dict)
    time_entries: dict[str, TimeEntry] = field(default_factory=dict)
    settings: Settings = field(default_factory=Settings)
    rollover_undo: dict[str, Any] | None = None
    switch_undo: dict[str, Any] | None = None
    last_task_id: str | None = None  # last stamped task, for "resume"

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": SCHEMA_VERSION,
            "tasks": [t.to_dict() for t in self.tasks.values()],
            "blocks": [b.to_dict() for b in self.blocks.values()],
            "entries": [e.to_dict() for e in self.entries.values()],
            "time_entries": [t.to_dict() for t in self.time_entries.values()],
            "settings": self.settings.to_dict(),
            "rollover_undo": self.rollover_undo,
            "switch_undo": self.switch_undo,
            "last_task_id": self.last_task_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PlannerData":
        return cls(
            tasks={d["id"]: Task.from_dict(d) for d in data.get("tasks", [])},
            blocks={d["id"]: WorkBlock.from_dict(d) for d in data.get("blocks", [])},
            entries={d["id"]: PlanEntry.from_dict(d) for d in data.get("entries", [])},
            time_entries={
                d["id"]: TimeEntry.from_dict(d) for d in data.get("time_entries", [])
            },
            settings=Settings.from_dict(data.get("settings", {})),
            rollover_undo=data.get("rollover_undo"),
            switch_undo=data.get("switch_undo"),
            last_task_id=data.get("last_task_id"),
        )


class PlannerError(Exception):
    """Business rule violation; message is shown to the user."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
