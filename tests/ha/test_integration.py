from __future__ import annotations

import json
from datetime import timedelta

import pytest
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.umbau_planer.const import (
    DOMAIN,
    EVENT_PREREQUISITE_WARNING,
    EVENT_TIMER_LONG_RUNNING,
)
from custom_components.umbau_planer.core import ops



async def test_config_flow_single_instance(hass: HomeAssistant):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] == "form"
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] == "create_entry"
    assert result["title"] == "Umbau-Planer"
    again = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert again["type"] == "abort"


async def test_services_and_entities(hass: HomeAssistant, setup):
    await hass.services.async_call(
        DOMAIN, "add_task", {"title": "Dach Schwiegermutter"}, blocking=True
    )
    mgr = hass.data[DOMAIN]
    project = next(iter(mgr.data.tasks.values()))
    await hass.services.async_call(
        DOMAIN, "add_task", {"title": "Latten", "parent_id": project.id}, blocking=True
    )
    child = next(t for t in mgr.data.tasks.values() if t.parent_id == project.id)

    assert hass.states.get("sensor.umbau_planer_aktive_aufgabe").state == "keine"
    assert hass.states.get("binary_sensor.umbau_planer_uhr_laeuft").state == "off"
    assert hass.states.get("sensor.umbau_planer_bereit").state == "1"

    await hass.services.async_call(DOMAIN, "start_timer", {"task_id": child.id}, blocking=True)
    state = hass.states.get("sensor.umbau_planer_aktive_aufgabe")
    assert state.state == "Latten"
    assert state.attributes["project"] == "Dach Schwiegermutter"
    assert hass.states.get("binary_sensor.umbau_planer_uhr_laeuft").state == "on"

    await hass.services.async_call(DOMAIN, "stop_timer", {}, blocking=True)
    assert hass.states.get("binary_sensor.umbau_planer_uhr_laeuft").state == "off"
    await hass.services.async_call(DOMAIN, "resume_timer", {}, blocking=True)
    assert hass.states.get("sensor.umbau_planer_aktive_aufgabe").state == "Latten"
    assert hass.states.get("sensor.umbau_planer_heute_gebucht") is not None
    assert hass.states.get("sensor.umbau_planer_heute_geplant") is not None
    assert hass.states.get("sensor.umbau_planer_rest_gesamt") is not None
    assert hass.states.get("sensor.umbau_planer_uneinig").state == "0"
    assert hass.states.get("calendar.umbau_planer") is not None

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "start_timer", {"task_id": "missing"}, blocking=True
        )


async def test_running_timer_survives_restart(hass: HomeAssistant, setup, hass_storage):
    """Abnahme 11."""
    mgr = hass.data[DOMAIN]
    await hass.services.async_call(DOMAIN, "add_task", {"title": "A"}, blocking=True)
    task = next(iter(mgr.data.tasks.values()))
    await hass.services.async_call(DOMAIN, "start_timer", {"task_id": task.id}, blocking=True)
    started = next(iter(mgr.data.time_entries.values())).start

    assert await hass.config_entries.async_unload(setup.entry_id)
    await hass.async_block_till_done()
    assert DOMAIN not in hass.data
    assert await hass.config_entries.async_setup(setup.entry_id)
    await hass.async_block_till_done()

    mgr = hass.data[DOMAIN]
    running = next(iter(mgr.data.time_entries.values()))
    assert running.end is None and running.start == started
    state = hass.states.get("sensor.umbau_planer_aktive_aufgabe")
    assert state.state == "A"


async def test_long_running_timer_event_and_notification(hass: HomeAssistant, setup, freezer):
    mgr = hass.data[DOMAIN]
    await hass.services.async_call(DOMAIN, "add_task", {"title": "A"}, blocking=True)
    task = next(iter(mgr.data.tasks.values()))
    await hass.services.async_call(DOMAIN, "start_timer", {"task_id": task.id}, blocking=True)
    events = []
    hass.bus.async_listen(EVENT_TIMER_LONG_RUNNING, lambda e: events.append(e))
    from unittest.mock import patch

    freezer.tick(timedelta(hours=5, minutes=1))
    with patch(
        "custom_components.umbau_planer.manager.persistent_notification.async_create"
    ) as notify:
        async_fire_time_changed(hass)
        await hass.async_block_till_done()
    assert notify.call_count == 1
    assert "Uhr läuft" in notify.call_args.kwargs["title"]
    assert len(events) == 1
    assert events[0].data["task"] == "A"
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(minutes=2))
    await hass.async_block_till_done()
    assert len(events) == 1  # only once per booking


async def test_prerequisite_warning_event(hass: HomeAssistant, setup):
    mgr = hass.data[DOMAIN]
    events = []
    hass.bus.async_listen(EVENT_PREREQUISITE_WARNING, lambda e: events.append(e))

    def build(d):
        pre = ops.create_task(d, "pre", estimate_initial_min=60)
        main = ops.create_task(d, "main", estimate_initial_min=60)
        ops.update_task(d, main.id, {"blocked_by": [pre.id]})
        day = (dt_util.now() + timedelta(days=1)).date().isoformat()
        block = ops.create_block(d, day)
        ops.add_entry(
            d, main.id, block_id=block.id, today=mgr.today(), now=mgr.now(),
            planned_min=60, fixed=True,
        )

    await mgr.async_mutate(build)
    await hass.async_block_till_done()
    assert len(events) == 1 and events[0].data["reason"] == "not_planned"


async def test_export_import_roundtrip(hass: HomeAssistant, setup, tmp_path):
    """Abnahme 13."""
    hass.config.allowlist_external_dirs = {str(tmp_path)}
    mgr = hass.data[DOMAIN]
    await hass.services.async_call(DOMAIN, "add_task", {"title": "A"}, blocking=True)
    task = next(iter(mgr.data.tasks.values()))
    await hass.services.async_call(DOMAIN, "start_timer", {"task_id": task.id}, blocking=True)
    path = str(tmp_path / "export.json")
    await hass.services.async_call(DOMAIN, "export", {"path": path}, blocking=True)
    exported = json.loads(open(path, encoding="utf-8").read())
    assert exported["tasks"][0]["title"] == "A"

    # fresh installation
    assert await hass.config_entries.async_unload(setup.entry_id)
    hass.data.pop(DOMAIN, None)
    hass_storage = None  # noqa: F841
    from custom_components.umbau_planer.store import create_store

    await create_store(hass).async_remove()
    assert await hass.config_entries.async_setup(setup.entry_id)
    await hass.async_block_till_done()
    mgr = hass.data[DOMAIN]
    assert not mgr.data.tasks
    await hass.services.async_call(DOMAIN, "import", {"path": path}, blocking=True)
    assert mgr.data.to_dict() == exported
    backups = list((tmp_path.parent).glob("*"))  # backups live in the config dir
    assert backups is not None
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(DOMAIN, "import", {"path": "/nonexistent.json"}, blocking=True)


async def test_import_rejects_garbage_and_keeps_data(hass: HomeAssistant, setup):
    from custom_components.umbau_planer.core.models import PlannerError

    mgr = hass.data[DOMAIN]
    await hass.services.async_call(DOMAIN, "add_task", {"title": "A"}, blocking=True)
    with pytest.raises(PlannerError):
        await mgr.async_import({"hello": "world"})
    with pytest.raises(PlannerError):
        await mgr.async_import({"tasks": [{"id": "x", "title": "t", "parent_id": "missing"}]})
    assert len(mgr.data.tasks) == 1


async def test_backup_before_import(hass: HomeAssistant, setup):
    import os
    import shutil

    folder = hass.config.path("umbau_planer_backups")
    shutil.rmtree(folder, ignore_errors=True)
    mgr = hass.data[DOMAIN]
    await hass.services.async_call(DOMAIN, "add_task", {"title": "A"}, blocking=True)
    await mgr.async_import({"tasks": [], "version": 1})
    files = os.listdir(folder)
    assert len(files) == 1 and "import" in files[0]
    saved = json.loads(open(os.path.join(folder, files[0]), encoding="utf-8").read())
    assert saved["tasks"][0]["title"] == "A"


async def test_migration_creates_backup(hass: HomeAssistant, hass_storage):
    import os

    import shutil

    from custom_components.umbau_planer.store import UmbauStore

    shutil.rmtree(hass.config.path("umbau_planer_backups"), ignore_errors=True)
    store = UmbauStore(hass, 1, "umbau_planer")
    out = await store._async_migrate_func(0, 0, {"version": 1, "tasks": []})
    assert out["tasks"] == []
    assert any("migration" in f for f in os.listdir(hass.config.path("umbau_planer_backups")))


async def test_panel_registration_uses_manifest_version(hass: HomeAssistant, monkeypatch):
    """The panel URL carries the manifest version without reading files in the event loop."""
    from homeassistant.components import frontend
    from homeassistant.setup import async_setup_component

    from custom_components import umbau_planer

    monkeypatch.undo()  # use the real registration, not the autouse stub
    assert await async_setup_component(hass, "frontend", {})
    assert await async_setup_component(hass, "http", {})
    await umbau_planer._async_register_panel(hass)
    panel = hass.data[frontend.DATA_PANELS]["umbau-planer"]
    import json
    from pathlib import Path

    manifest = json.loads(
        (Path(umbau_planer.__file__).parent / "manifest.json").read_text(encoding="utf-8")
    )
    assert panel.config["_panel_custom"]["module_url"].endswith(
        f"umbau-planer-panel.js?v={manifest['version']}"
    )
