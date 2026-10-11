"""Binary sensor: is the clock running?"""
from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import UmbauEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities([ClockRunningSensor(hass.data[DOMAIN])])


class ClockRunningSensor(UmbauEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.RUNNING

    def __init__(self, manager) -> None:
        super().__init__(manager, "uhr_laeuft", "Uhr läuft", "binary_sensor")

    @property
    def is_on(self) -> bool:
        return self.manager.metrics()["running"]
