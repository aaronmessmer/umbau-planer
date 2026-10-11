"""Sensors of the Umbau-Planer."""
from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import UmbauEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    manager = hass.data[DOMAIN]
    async_add_entities(
        [
            ActiveTaskSensor(manager),
            HoursSensor(manager, "heute_gebucht", "Heute gebucht", "booked_today_min"),
            HoursSensor(manager, "heute_geplant", "Heute geplant", "planned_today_min"),
            RestSensor(manager),
            CountSensor(manager, "bereit", "Bereit", "ready_count"),
            CountSensor(manager, "uneinig", "Uneinig", "disagree_count"),
        ]
    )


class ActiveTaskSensor(UmbauEntity, SensorEntity):
    _attr_icon = "mdi:hammer-wrench"

    def __init__(self, manager) -> None:
        super().__init__(manager, "aktive_aufgabe", "Aktive Aufgabe", "sensor")

    @property
    def native_value(self) -> str:
        return self.manager.metrics()["active"]["title"] or "keine"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        active = self.manager.metrics()["active"]
        if not active.get("task_id"):
            return {"project": None, "started": None, "elapsed_min": 0}
        return {
            "task_id": active["task_id"],
            "project": active["project"],
            "started": active["started"],
            "elapsed_min": active["elapsed_min"],
        }


class HoursSensor(UmbauEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.DURATION
    _attr_native_unit_of_measurement = UnitOfTime.HOURS
    _attr_suggested_display_precision = 2

    def __init__(self, manager, key: str, name: str, metric: str) -> None:
        super().__init__(manager, key, name, "sensor")
        self._metric = metric

    @property
    def native_value(self) -> float:
        return round(self.manager.metrics()[self._metric] / 60, 2)


class RestSensor(HoursSensor):
    _attr_icon = "mdi:progress-clock"

    def __init__(self, manager) -> None:
        super().__init__(manager, "rest_gesamt", "Rest gesamt", "rest_total_min")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"projekte": self.manager.metrics()["rest_by_project"]}


class CountSensor(UmbauEntity, SensorEntity):
    _attr_native_unit_of_measurement = "Aufgaben"

    def __init__(self, manager, key: str, name: str, metric: str) -> None:
        super().__init__(manager, key, name, "sensor")
        self._metric = metric

    @property
    def native_value(self) -> int:
        return self.manager.metrics()[self._metric]
