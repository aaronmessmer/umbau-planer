"""Persistence: Home Assistant Store with schema version, migration and backups."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import BACKUP_DIR, BACKUPS_KEPT, STORAGE_KEY, STORAGE_VERSION
from .core.migrate import migrate
from .core.models import PlannerData

_LOGGER = logging.getLogger(__name__)


def _write_backup(directory: str, reason: str, payload: dict[str, Any]) -> str:
    path = Path(directory)
    path.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    target = path / f"umbau_planer_{reason}_{stamp}.json"
    tmp = target.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(target)
    backups = sorted(path.glob("umbau_planer_*.json"))
    for old in backups[:-BACKUPS_KEPT]:
        old.unlink(missing_ok=True)
    return str(target)


class UmbauStore(Store[dict[str, Any]]):
    """Store that backs up the data before a schema migration (Q-3)."""

    async def _async_migrate_func(
        self, old_major_version: int, old_minor_version: int, old_data: dict[str, Any]
    ) -> dict[str, Any]:
        await async_backup(self.hass, "migration", old_data)
        return migrate(old_data)


async def async_backup(hass: HomeAssistant, reason: str, payload: dict[str, Any]) -> str:
    directory = hass.config.path(BACKUP_DIR)
    return await hass.async_add_executor_job(_write_backup, directory, reason, payload)


def create_store(hass: HomeAssistant) -> UmbauStore:
    return UmbauStore(hass, STORAGE_VERSION, STORAGE_KEY, atomic_writes=True)


async def async_load_data(store: UmbauStore) -> PlannerData:
    raw = await store.async_load()
    if raw is None:
        return PlannerData()
    return PlannerData.from_dict(raw)
