"""Schema migration of the stored / exported data."""
from __future__ import annotations

from typing import Any, Callable

from .models import SCHEMA_VERSION, PlannerError

# version -> function upgrading data from that version to version + 1
MIGRATIONS: dict[int, Callable[[dict[str, Any]], dict[str, Any]]] = {}


def needs_migration(data: dict[str, Any]) -> bool:
    return int(data.get("version", 1)) < SCHEMA_VERSION


def migrate(data: dict[str, Any]) -> dict[str, Any]:
    """Bring ``data`` to the current schema version."""
    version = int(data.get("version", 1))
    if version > SCHEMA_VERSION:
        raise PlannerError(
            "too_new",
            "Die Daten stammen aus einer neueren Version des Umbau-Planers.",
        )
    while version < SCHEMA_VERSION:
        data = MIGRATIONS[version](data)
        version += 1
        data["version"] = version
    return data


def validate_structure(data: Any) -> None:
    """Reject files that are clearly not an Umbau-Planer export."""
    if not isinstance(data, dict):
        raise PlannerError("invalid_import", "Die Datei enthält kein gültiges JSON-Objekt.")
    for key in ("tasks", "blocks", "entries", "time_entries"):
        if key in data and not isinstance(data[key], list):
            raise PlannerError("invalid_import", f"Feld '{key}' muss eine Liste sein.")
    if "settings" in data and not isinstance(data["settings"], dict):
        raise PlannerError("invalid_import", "Feld 'settings' muss ein Objekt sein.")
    if "tasks" not in data:
        raise PlannerError("invalid_import", "Die Datei enthält keine Aufgaben.")
    for task in data["tasks"]:
        if not isinstance(task, dict) or "id" not in task or "title" not in task:
            raise PlannerError("invalid_import", "Eine Aufgabe in der Datei ist unvollständig.")
