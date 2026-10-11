"""WebSocket commands used by the panel."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Callable

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN
from .core import ops, plan
from .core.models import PlannerData, PlannerError, WorkBlock, parse_dt
from .core.priorities import rescale_preview
from .manager import PlannerManager


@dataclass
class Ctx:
    now: datetime
    today: date
    person_id: str | None


def _req(args: dict[str, Any], key: str) -> Any:
    if key not in args or args[key] is None:
        raise PlannerError("invalid", f"Angabe '{key}' fehlt.")
    return args[key]


def _opt_dt(value: Any) -> datetime | None:
    return parse_dt(value) if value else None


def _pick(args: dict[str, Any], keys: tuple[str, ...]) -> dict[str, Any]:
    return {k: args[k] for k in keys if k in args}


# ------------------------------------------------------------------ operations
# Each operation: (data, ctx, args) -> JSON-serialisable result


def op_task_create(d: PlannerData, c: Ctx, a: dict) -> dict:
    fields = _pick(
        a,
        (
            "notes",
            "category",
            "children_mode",
            "estimate_initial_min",
            "remaining_min",
            "waiting_for",
            "waiting_until",
            "blocked_by",
        ),
    )
    task = ops.create_task(d, _req(a, "title"), a.get("parent_id"), now=c.now, **fields)
    return {"id": task.id}


def op_task_update(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.update_task(d, _req(a, "task_id"), dict(_req(a, "fields")), now=c.now)
    return {}


def op_task_move(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.move_task(d, _req(a, "task_id"), a.get("parent_id"), a.get("index"), now=c.now)
    return {}


def op_task_delete(d: PlannerData, c: Ctx, a: dict) -> dict:
    return ops.delete_task(d, _req(a, "task_id"), c.now)


def op_priority_set(d: PlannerData, c: Ctx, a: dict) -> dict:
    # P-2: always the caller's own person, never a person passed by the client
    if c.person_id is None:
        raise PlannerError(
            "no_person",
            "Dein Home-Assistant-Benutzer ist keiner Person zugeordnet (Einstellungen).",
        )
    ops.set_priority(d, _req(a, "task_id"), c.person_id, a.get("level"))
    return {}


def op_block_create(d: PlannerData, c: Ctx, a: dict) -> dict:
    block = ops.create_block(
        d,
        _req(a, "date"),
        start_time=a.get("start_time"),
        capacity_min=a.get("capacity_min"),
        note=a.get("note", ""),
        reserved_for=a.get("reserved_for"),
    )
    return {"id": block.id}


def op_block_update(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.update_block(d, _req(a, "block_id"), dict(_req(a, "fields")), c.today)
    return {}


def op_block_delete(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.delete_block(d, _req(a, "block_id"))
    return {}


def op_block_close(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.close_block(d, _req(a, "block_id"))
    return {}


def op_block_series(d: PlannerData, c: Ctx, a: dict) -> dict:
    try:
        start = date.fromisoformat(_req(a, "start_date"))
        until = date.fromisoformat(a["until"]) if a.get("until") else None
    except ValueError as err:
        raise PlannerError("invalid", "Ungültiges Datum.") from err
    blocks: list[WorkBlock] = plan.create_block_series(
        d,
        start,
        [int(x) for x in _req(a, "weekdays")],
        count=a.get("count"),
        until=until,
        start_time=a.get("start_time"),
        capacity_min=a.get("capacity_min"),
        note=a.get("note", ""),
    )
    return {"ids": [b.id for b in blocks]}


def op_entry_add(d: PlannerData, c: Ctx, a: dict) -> dict:
    entry = ops.add_entry(
        d,
        _req(a, "task_id"),
        block_id=a.get("block_id"),
        today=c.today,
        now=c.now,
        planned_min=a.get("planned_min"),
        fixed=bool(a.get("fixed")),
        fixed_time=a.get("fixed_time"),
        with_whom=a.get("with_whom"),
        list_name=a.get("list"),
    )
    return {"id": entry.id}


def op_entries_add_many(d: PlannerData, c: Ctx, a: dict) -> dict:
    ids = []
    block_id = _req(a, "block_id")
    for item in _req(a, "items"):
        entry = ops.add_entry(
            d,
            item["task_id"],
            block_id=block_id,
            today=c.today,
            now=c.now,
            planned_min=item.get("planned_min"),
        )
        ids.append(entry.id)
    return {"ids": ids}


def op_entry_update(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.update_entry(d, _req(a, "entry_id"), dict(_req(a, "fields")), c.today)
    return {}


def op_entry_move(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.move_entry(
        d,
        _req(a, "entry_id"),
        block_id=a.get("block_id"),
        index=a.get("index"),
        today=c.today,
        list_name=a.get("list"),
    )
    return {}


def op_entry_delete(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.delete_entry(d, _req(a, "entry_id"))
    return {}


def op_rollover_apply(d: PlannerData, c: Ctx, a: dict) -> dict:
    remaining = {k: int(v) for k, v in (a.get("remaining") or {}).items()}
    return plan.apply_rollover(d, c.today, c.now, remaining)


def op_rollover_undo(d: PlannerData, c: Ctx, a: dict) -> dict:
    plan.undo_rollover(d)
    return {}


def op_timer_start(d: PlannerData, c: Ctx, a: dict) -> dict:
    entry = ops.start_timer(d, _req(a, "task_id"), c.now)
    return {"id": entry.id, "can_undo": bool(d.switch_undo)}


def op_timer_stop(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.stop_timer(
        d, c.now, mark_done=bool(a.get("mark_done")), remaining_min=a.get("remaining_min")
    )
    return {}


def op_timer_resume(d: PlannerData, c: Ctx, a: dict) -> dict:
    entry = ops.resume_timer(d, c.now)
    return {"id": entry.id}


def op_timer_undo_switch(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.undo_switch(d)
    return {}


def op_time_entry_add(d: PlannerData, c: Ctx, a: dict) -> dict:
    entry = ops.add_time_entry(
        d,
        _req(a, "task_id"),
        parse_dt(_req(a, "start")),
        _opt_dt(a.get("end")),
        helper_min=a.get("helper_min", 0),
        note=a.get("note", ""),
    )
    return {"id": entry.id}


def op_time_entry_update(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.update_time_entry(d, _req(a, "entry_id"), dict(_req(a, "fields")))
    return {}


def op_time_entry_delete(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.delete_time_entry(d, _req(a, "entry_id"))
    return {}


def op_settings_update(d: PlannerData, c: Ctx, a: dict) -> dict:
    ops.update_settings(d, dict(_req(a, "fields")))
    return {}


OPS: dict[str, Callable[[PlannerData, Ctx, dict], dict]] = {
    name[3:]: fn for name, fn in globals().items() if name.startswith("op_")
}
# operations that a rating person may use
RATING_OPS = {"priority_set"}


# ------------------------------------------------------------------ plumbing


def _manager(hass: HomeAssistant) -> PlannerManager:
    mgr = hass.data.get(DOMAIN)
    if mgr is None:
        raise PlannerError("not_loaded", "Der Umbau-Planer ist nicht geladen.")
    return mgr


def _ctx(mgr: PlannerManager, connection: websocket_api.ActiveConnection) -> Ctx:
    person = ops.person_for_user(mgr.data, connection.user.id)
    return Ctx(mgr.now(), mgr.today(), person.id if person else None)


def _check_edit(mgr: PlannerManager, connection: websocket_api.ActiveConnection) -> None:
    if not ops.can_edit(mgr.data, connection.user.id, connection.user.is_admin):
        raise PlannerError(
            "forbidden", "Diese Person darf nur Prioritäten vergeben."
        )


def _handle(func):
    """Turn PlannerError into a websocket error."""

    async def wrapper(hass, connection, msg):
        try:
            await func(hass, connection, msg)
        except PlannerError as err:
            connection.send_error(msg["id"], err.code, err.message)

    return wrapper


@websocket_api.websocket_command({vol.Required("type"): "umbau_planer/state"})
@websocket_api.async_response
@_handle
async def ws_state(hass, connection, msg):
    mgr = _manager(hass)
    connection.send_result(
        msg["id"], mgr.build_state(connection.user.id, connection.user.is_admin)
    )


@websocket_api.websocket_command({vol.Required("type"): "umbau_planer/subscribe"})
@callback
def ws_subscribe(hass, connection, msg):
    try:
        mgr = _manager(hass)
    except PlannerError as err:
        connection.send_error(msg["id"], err.code, err.message)
        return
    last = {"rev": mgr.rev}

    @callback
    def forward() -> None:
        if mgr.rev != last["rev"]:
            last["rev"] = mgr.rev
            connection.send_message(
                websocket_api.event_message(msg["id"], {"rev": mgr.rev})
            )

    connection.subscriptions[msg["id"]] = mgr.async_add_listener(forward)
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "umbau_planer/op",
        vol.Required("op"): vol.In(sorted(OPS)),
        vol.Optional("args", default={}): dict,
    }
)
@websocket_api.async_response
@_handle
async def ws_op(hass, connection, msg):
    mgr = _manager(hass)
    op = msg["op"]
    if op not in RATING_OPS:
        _check_edit(mgr, connection)
    ctx = _ctx(mgr, connection)
    args = msg["args"]
    result = await mgr.async_mutate(lambda data: OPS[op](data, ctx, args))
    connection.send_result(msg["id"], {"result": result, "rev": mgr.rev})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "umbau_planer/time_entries",
        vol.Optional("start"): str,
        vol.Optional("end"): str,
    }
)
@websocket_api.async_response
@_handle
async def ws_time_entries(hass, connection, msg):
    mgr = _manager(hass)
    connection.send_result(msg["id"], mgr.time_entries(msg.get("start"), msg.get("end")))


@websocket_api.websocket_command({vol.Required("type"): "umbau_planer/evaluation"})
@websocket_api.async_response
@_handle
async def ws_evaluation(hass, connection, msg):
    connection.send_result(msg["id"], _manager(hass).evaluation())


@websocket_api.websocket_command({vol.Required("type"): "umbau_planer/export"})
@websocket_api.async_response
@_handle
async def ws_export(hass, connection, msg):
    connection.send_result(msg["id"], _manager(hass).export_data())


@websocket_api.websocket_command(
    {vol.Required("type"): "umbau_planer/import", vol.Required("data"): dict}
)
@websocket_api.async_response
@_handle
async def ws_import(hass, connection, msg):
    mgr = _manager(hass)
    _check_edit(mgr, connection)
    await mgr.async_import(msg["data"])
    connection.send_result(msg["id"], {"rev": mgr.rev})


@websocket_api.websocket_command(
    {vol.Required("type"): "umbau_planer/delete_info", vol.Required("task_id"): str}
)
@websocket_api.async_response
@_handle
async def ws_delete_info(hass, connection, msg):
    connection.send_result(msg["id"], ops.delete_info(_manager(hass).data, msg["task_id"]))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "umbau_planer/rollover_preview",
        vol.Optional("remaining", default={}): dict,
    }
)
@websocket_api.async_response
@_handle
async def ws_rollover_preview(hass, connection, msg):
    mgr = _manager(hass)
    remaining = {k: int(v) for k, v in msg["remaining"].items()}
    result = plan.compute_rollover(mgr.data, mgr.today(), mgr.now(), remaining)
    connection.send_result(
        msg["id"],
        {k: v for k, v in result.items() if k != "entries"},
    )


@websocket_api.websocket_command(
    {vol.Required("type"): "umbau_planer/suggest_fill", vol.Required("block_id"): str}
)
@websocket_api.async_response
@_handle
async def ws_suggest_fill(hass, connection, msg):
    mgr = _manager(hass)
    connection.send_result(
        msg["id"], plan.suggest_fill(mgr.data, msg["block_id"], mgr.today(), mgr.now())
    )


@websocket_api.websocket_command(
    {vol.Required("type"): "umbau_planer/rescale_preview", vol.Required("level_names"): [str]}
)
@websocket_api.async_response
@_handle
async def ws_rescale_preview(hass, connection, msg):
    connection.send_result(
        msg["id"], rescale_preview(_manager(hass).data, msg["level_names"])
    )


COMMANDS = (
    ws_state,
    ws_subscribe,
    ws_op,
    ws_time_entries,
    ws_evaluation,
    ws_export,
    ws_import,
    ws_delete_info,
    ws_rollover_preview,
    ws_suggest_fill,
    ws_rescale_preview,
)


def async_register(hass: HomeAssistant) -> None:
    for command in COMMANDS:
        websocket_api.async_register_command(hass, command)
