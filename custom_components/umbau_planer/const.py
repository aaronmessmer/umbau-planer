"""Constants of the Umbau-Planer integration."""
from __future__ import annotations

DOMAIN = "umbau_planer"
NAME = "Umbau-Planer"

STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1
BACKUP_DIR = "umbau_planer_backups"
BACKUPS_KEPT = 20

PANEL_URL_PATH = "umbau-planer"
PANEL_COMPONENT = "umbau-planer-panel"
STATIC_URL = "/umbau_planer_static"

EVENT_TIMER_LONG_RUNNING = "umbau_planer_timer_long_running"
EVENT_PREREQUISITE_WARNING = "umbau_planer_prerequisite_warning"

SERVICE_START_TIMER = "start_timer"
SERVICE_STOP_TIMER = "stop_timer"
SERVICE_RESUME_TIMER = "resume_timer"
SERVICE_ADD_TASK = "add_task"
SERVICE_EXPORT = "export"
SERVICE_IMPORT = "import"
