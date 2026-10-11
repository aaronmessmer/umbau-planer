"""Calendar entity: work blocks as events."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, NAME
from .core import plan
from .entity import UmbauEntity
from .manager import PlannerManager


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities([UmbauCalendar(hass.data[DOMAIN])])


def _fmt(minutes: int) -> str:
    return f"{minutes // 60}:{minutes % 60:02d} h"


class UmbauCalendar(UmbauEntity, CalendarEntity):
    _attr_icon = "mdi:calendar-clock"

    def __init__(self, manager: PlannerManager) -> None:
        super().__init__(manager, "kalender", NAME, "calendar")
        self.entity_id = f"calendar.{DOMAIN}"
        self._attr_unique_id = f"{DOMAIN}_calendar"

    def _event(self, block) -> CalendarEvent:
        data = self.manager.data
        entries = plan.block_entries(data.entries, block.id, include_superseded=False)
        lines = [
            f"{_fmt(e.planned_min)} {data.tasks[e.task_id].title}"
            + (" (fix)" if e.fixed else "")
            + (f" mit {e.with_whom}" if e.with_whom else "")
            for e in entries
            if e.task_id in data.tasks
        ]
        description = "\n".join(lines) or "Keine Einträge"
        if block.note:
            description = f"{block.note}\n{description}"
        summary = "Arbeitsblock"
        if block.reserved_for and block.reserved_for in data.tasks:
            summary += f": {data.tasks[block.reserved_for].title}"
        day = date.fromisoformat(block.date)
        if block.start_time:
            hour, minute = (int(x) for x in block.start_time.split(":"))
            start = datetime(day.year, day.month, day.day, hour, minute, tzinfo=dt_util.get_default_time_zone())
            end = start + timedelta(minutes=block.capacity_min)
            return CalendarEvent(start=start, end=end, summary=summary, description=description)
        return CalendarEvent(
            start=day, end=day + timedelta(days=1), summary=summary, description=description
        )

    def _events(self) -> list[tuple[datetime, datetime, CalendarEvent]]:
        result = []
        for block in self.manager.data.blocks.values():
            event = self._event(block)
            start = event.start_datetime_local
            end = event.end_datetime_local
            result.append((start, end, event))
        result.sort(key=lambda item: item[0])
        return result

    @property
    def event(self) -> CalendarEvent | None:
        now = dt_util.now()
        for _start, end, event in self._events():
            if end > now:
                return event
        return None

    async def async_get_events(
        self, hass: HomeAssistant, start_date: datetime, end_date: datetime
    ) -> list[CalendarEvent]:
        return [
            event
            for start, end, event in self._events()
            if end > start_date and start < end_date
        ]
