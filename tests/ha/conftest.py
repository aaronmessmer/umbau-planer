from __future__ import annotations

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.umbau_planer.const import DOMAIN


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield


@pytest.fixture(autouse=True)
def no_panel_side_effects(monkeypatch):
    """The sidebar panel needs the frontend integration; skip it in unit setups."""
    from custom_components import umbau_planer

    async def fake_register(hass):
        return None

    monkeypatch.setattr(umbau_planer, "_async_register_panel", fake_register)


@pytest.fixture
def config_entry() -> MockConfigEntry:
    return MockConfigEntry(domain=DOMAIN, title="Umbau-Planer", data={}, unique_id=DOMAIN)


@pytest.fixture
async def setup(hass, config_entry):
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    return config_entry
