"""Umbau-Planer: plan renovation work in blocks and track the real working time."""
from __future__ import annotations

import json
import logging
from pathlib import Path

import voluptuous as vol
from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv

from . import websocket_api
from .const import (
    DOMAIN,
    NAME,
    PANEL_COMPONENT,
    PANEL_URL_PATH,
    SERVICE_ADD_TASK,
    SERVICE_EXPORT,
    SERVICE_IMPORT,
    SERVICE_RESUME_TIMER,
    SERVICE_START_TIMER,
    SERVICE_STOP_TIMER,
    STATIC_URL,
)
from .core import ops
from .core.models import PlannerError
from .manager import PlannerManager
from .store import async_load_data, create_store

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor", "binary_sensor", "calendar"]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
FRONTEND_DIR = Path(__file__).parent / "frontend"
PANEL_FILE = "umbau-planer-panel.js"


def _version() -> str:
    try:
        manifest = json.loads((Path(__file__).parent / "manifest.json").read_text())
        return str(manifest.get("version", "0"))
    except (OSError, ValueError):
        return "0"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = create_store(hass)
    data = await async_load_data(store)
    manager = PlannerManager(hass, store, data)
    hass.data[DOMAIN] = manager
    manager.async_start()

    websocket_api.async_register(hass)
    await _async_register_panel(hass)
    _async_register_services(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        manager: PlannerManager = hass.data.pop(DOMAIN)
        manager.async_stop()
        for service in (
            SERVICE_START_TIMER,
            SERVICE_STOP_TIMER,
            SERVICE_RESUME_TIMER,
            SERVICE_ADD_TASK,
            SERVICE_EXPORT,
            SERVICE_IMPORT,
        ):
            hass.services.async_remove(DOMAIN, service)
        from homeassistant.components import frontend

        frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
    return unloaded


async def _async_register_panel(hass: HomeAssistant) -> None:
    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False)]
        )
    except RuntimeError:
        _LOGGER.debug("Static path already registered")
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_COMPONENT,
        sidebar_title=NAME,
        sidebar_icon="mdi:hammer-wrench",
        module_url=f"{STATIC_URL}/{PANEL_FILE}?v={_version()}",
        embed_iframe=False,
        require_admin=False,
        config={},
    )


def _manager(hass: HomeAssistant) -> PlannerManager:
    manager = hass.data.get(DOMAIN)
    if manager is None:
        raise ServiceValidationError("Der Umbau-Planer ist nicht geladen.")
    return manager


def _async_register_services(hass: HomeAssistant) -> None:
    async def run(call: ServiceCall, func):
        manager = _manager(hass)
        try:
            return await manager.async_mutate(func(manager))
        except PlannerError as err:
            raise ServiceValidationError(err.message) from err

    async def start_timer(call: ServiceCall) -> None:
        task_id = call.data["task_id"]
        await run(call, lambda m: lambda d: ops.start_timer(d, task_id, m.now()))

    async def stop_timer(call: ServiceCall) -> None:
        await run(call, lambda m: lambda d: ops.stop_timer(d, m.now()))

    async def resume_timer(call: ServiceCall) -> None:
        await run(call, lambda m: lambda d: ops.resume_timer(d, m.now()))

    async def add_task(call: ServiceCall) -> None:
        title = call.data["title"]
        parent = call.data.get("parent_id")
        await run(call, lambda m: lambda d: ops.create_task(d, title, parent, now=m.now()))

    async def export(call: ServiceCall) -> None:
        manager = _manager(hass)
        path = call.data.get("path") or hass.config.path(
            f"umbau_planer_export_{manager.now():%Y%m%d_%H%M%S}.json"
        )
        if not hass.config.is_allowed_path(path):
            raise ServiceValidationError(f"Der Pfad {path} ist nicht erlaubt.")
        payload = json.dumps(manager.export_data(), ensure_ascii=False, indent=1)

        def write() -> None:
            Path(path).write_text(payload, encoding="utf-8")

        try:
            await hass.async_add_executor_job(write)
        except OSError as err:
            raise HomeAssistantError(f"Schreiben fehlgeschlagen: {err}") from err

    async def import_(call: ServiceCall) -> None:
        manager = _manager(hass)
        path = call.data["path"]
        if not hass.config.is_allowed_path(path):
            raise ServiceValidationError(f"Der Pfad {path} ist nicht erlaubt.")

        def read() -> dict:
            return json.loads(Path(path).read_text(encoding="utf-8"))

        try:
            payload = await hass.async_add_executor_job(read)
        except (OSError, ValueError) as err:
            raise ServiceValidationError(f"Datei nicht lesbar: {err}") from err
        try:
            await manager.async_import(payload)
        except PlannerError as err:
            raise ServiceValidationError(err.message) from err

    hass.services.async_register(
        DOMAIN, SERVICE_START_TIMER, start_timer, vol.Schema({vol.Required("task_id"): cv.string})
    )
    hass.services.async_register(DOMAIN, SERVICE_STOP_TIMER, stop_timer, vol.Schema({}))
    hass.services.async_register(DOMAIN, SERVICE_RESUME_TIMER, resume_timer, vol.Schema({}))
    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_TASK,
        add_task,
        vol.Schema(
            {vol.Required("title"): cv.string, vol.Optional("parent_id"): cv.string}
        ),
    )
    hass.services.async_register(
        DOMAIN, SERVICE_EXPORT, export, vol.Schema({vol.Optional("path"): cv.string})
    )
    hass.services.async_register(
        DOMAIN, SERVICE_IMPORT, import_, vol.Schema({vol.Required("path"): cv.string})
    )
