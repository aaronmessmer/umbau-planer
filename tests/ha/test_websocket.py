from __future__ import annotations

from datetime import timedelta

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from custom_components.umbau_planer.const import DOMAIN


async def send(client, type_, **kwargs):
    await client.send_json_auto_id({"type": f"umbau_planer/{type_}", **kwargs})
    return await client.receive_json()


async def op(client, name, **args):
    return await send(client, "op", op=name, args=args)


async def test_state_and_task_crud(hass: HomeAssistant, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    res = await op(client, "task_create", title="Umbau Haus")
    assert res["success"]
    project = res["result"]["result"]["id"]
    res = await op(client, "task_create", title="Flur", parent_id=project, estimate_initial_min=120)
    flur = res["result"]["result"]["id"]
    await op(client, "task_create", title="Bad", parent_id=project, estimate_initial_min=180)

    state = (await send(client, "state"))["result"]
    by_title = {t["title"]: t for t in state["tasks"]}
    assert by_title["Umbau Haus"]["summary"]["estimate_min"] == 300
    assert by_title["Flur"]["depth"] == 1
    assert state["me"]["can_edit"] is True

    res = await op(client, "task_update", task_id=flur, fields={"title": ""})
    assert not res["success"] and res["error"]["code"] == "invalid"
    # the failed update did not change anything
    state = (await send(client, "state"))["result"]
    assert {t["title"] for t in state["tasks"]} == {"Umbau Haus", "Flur", "Bad"}

    info = (await send(client, "delete_info", task_id=project))["result"]
    assert info["descendants"] == 2
    res = await op(client, "task_delete", task_id=project)
    assert res["result"]["result"]["deleted"] == 3


async def test_errors_are_reported_with_german_text(hass, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    a = (await op(client, "task_create", title="A"))["result"]["result"]["id"]
    b = (await op(client, "task_create", title="B", blocked_by=[a]))["result"]["result"]["id"]
    res = await op(client, "task_update", task_id=a, fields={"blocked_by": [b]})
    assert res["error"]["code"] == "cycle"
    assert "Zirkelbezug" in res["error"]["message"]


async def test_subscription_notifies_changes(hass, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "umbau_planer/subscribe"})
    assert (await client.receive_json())["success"]
    other = await hass_ws_client(hass)
    await op(other, "task_create", title="X")
    event = await client.receive_json()
    assert event["type"] == "event" and event["event"]["rev"] >= 1


async def test_rater_can_only_set_own_priority(hass, setup, hass_ws_client, hass_admin_user, hass_read_only_user):
    mgr = hass.data[DOMAIN]
    admin = await hass_ws_client(hass)
    t = (await op(admin, "task_create", title="Regal"))["result"]["result"]["id"]
    await op(
        admin,
        "settings_update",
        fields={
            "persons": [
                {"id": "a", "name": "Aaron", "ha_user_id": hass_admin_user.id, "role": "executor"},
                {"id": "b", "name": "Bea", "ha_user_id": hass_read_only_user.id, "role": "rater"},
            ]
        },
    )
    res = await op(admin, "priority_set", task_id=t, level=1)
    assert res["success"]
    refresh = await hass.auth.async_create_refresh_token(hass_read_only_user, "https://example.com")
    rater = await hass_ws_client(hass, hass.auth.async_create_access_token(refresh))
    res = await op(rater, "priority_set", task_id=t, level=5)
    assert res["success"]
    res = await op(rater, "task_create", title="nope")
    assert not res["success"] and res["error"]["code"] == "forbidden"
    task = mgr.data.tasks[t]
    assert task.priorities == {"a": 1, "b": 5}
    state = (await send(rater, "state"))["result"]
    assert state["me"] == {"person_id": "b", "role": "rater", "can_edit": False, "is_admin": False}
    prio = next(x for x in state["tasks"] if x["id"] == t)["priority"]
    assert prio["disagree"] is True and prio["combined_level"] == 3.0


async def test_timer_flow_with_switch_undo(hass, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    a = (await op(client, "task_create", title="A", estimate_initial_min=60))["result"]["result"]["id"]
    b = (await op(client, "task_create", title="B"))["result"]["result"]["id"]
    await op(client, "timer_start", task_id=a)
    res = await op(client, "timer_start", task_id=b)
    assert res["result"]["result"]["can_undo"] is True
    state = (await send(client, "state"))["result"]
    assert state["timer"]["running"]["task_id"] == b
    await op(client, "timer_undo_switch")
    state = (await send(client, "state"))["result"]
    assert state["timer"]["running"]["task_id"] == a
    res = await op(client, "timer_stop", remaining_min=20)
    assert res["success"]
    res = await op(client, "timer_stop")
    assert res["error"]["code"] == "no_timer"
    te = (await send(client, "time_entries"))["result"]
    assert len(te["entries"]) == 1 and te["entries"][0]["task_title"] == "A"


async def test_manual_time_entry_overlap(hass, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    a = (await op(client, "task_create", title="A"))["result"]["result"]["id"]
    start = dt_util.utcnow() - timedelta(hours=3)
    res = await op(client, "time_entry_add", task_id=a, start=start.isoformat(),
                   end=(start + timedelta(hours=1)).isoformat(), helper_min=30)
    assert res["success"]
    res = await op(client, "time_entry_add", task_id=a,
                   start=(start + timedelta(minutes=30)).isoformat(),
                   end=(start + timedelta(hours=2)).isoformat())
    assert res["error"]["code"] == "overlap"


async def test_plan_and_rollover_flow(hass, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    today = dt_util.now().date()
    a = (await op(client, "task_create", title="A", estimate_initial_min=240))["result"]["result"]["id"]
    b = (await op(client, "block_create", date=(today + timedelta(days=1)).isoformat()))["result"]["result"]["id"]
    await op(client, "entry_add", task_id=a, block_id=b)
    mgr = hass.data[DOMAIN]
    # make the block part of the past, as if time had moved on
    mgr.data.blocks[b].date = (today - timedelta(days=2)).isoformat()
    state = (await send(client, "state"))["result"]
    assert state["blocks"][0]["past"] is True
    nb = (await op(client, "block_create", date=(today + timedelta(days=2)).isoformat()))["result"]["result"]["id"]
    preview = (await send(client, "rollover_preview", remaining={a: 90}))["result"]
    assert preview["affected"][0]["task_id"] == a
    assert preview["after"][nb][0]["planned_min"] == 90
    res = await op(client, "rollover_apply", remaining={a: 90})
    assert res["success"]
    state = (await send(client, "state"))["result"]
    assert state["can_undo_rollover"] is True
    assert any(e["block_id"] == nb and e["planned_min"] == 90 for e in state["entries"])
    await op(client, "rollover_undo")
    state = (await send(client, "state"))["result"]
    assert not any(e["block_id"] == nb for e in state["entries"])


async def test_series_fill_and_evaluation(hass, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    today = dt_util.now().date()
    res = await op(client, "block_series", start_date=(today + timedelta(days=1)).isoformat(),
                   weekdays=[0, 1, 2, 3, 4, 5, 6], count=3, start_time="08:00")
    ids = res["result"]["result"]["ids"]
    assert len(ids) == 3
    await op(client, "task_create", title="Wichtig", estimate_initial_min=200)
    sugg = (await send(client, "suggest_fill", block_id=ids[0]))["result"]
    assert sugg[0]["title"] == "Wichtig" and sugg[0]["planned_min"] == 200
    res = await op(client, "entries_add_many", block_id=ids[0], items=sugg)
    assert res["success"]
    ev = (await send(client, "evaluation"))["result"]
    assert ev["projects"][0]["remaining_min"] == 200
    assert (await send(client, "rescale_preview", level_names=["a", "b", "c"]))["result"] == []


async def test_import_via_websocket(hass, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    await op(client, "task_create", title="A")
    exported = (await send(client, "export"))["result"]
    await op(client, "task_create", title="B")
    res = await send(client, "import", data=exported)
    assert res["success"]
    state = (await send(client, "state"))["result"]
    assert [t["title"] for t in state["tasks"]] == ["A"]
    res = await send(client, "import", data={"foo": 1})
    assert res["error"]["code"] == "invalid_import"
