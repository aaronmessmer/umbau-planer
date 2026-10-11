export interface Person {
  id: string;
  name: string;
  ha_user_id: string | null;
  role: "executor" | "rater";
}

export interface Settings {
  persons: Person[];
  level_names: string[];
  default_capacity_min: number;
  categories: string[];
  disagree_threshold: number;
  min_split_min: number;
  long_timer_min: number;
}

export interface Summary {
  estimate_min: number | null;
  rough_min: number | null;
  partial: boolean;
  booked_own_min: number;
  helper_min: number;
  booked_min: number;
  remaining_min: number;
  forecast_min: number;
  deviation_min: number | null;
  unestimated: boolean;
  has_children: boolean;
  direct_booked_min: number;
}

export interface PersonPriority {
  own: number | null;
  level: number | null;
  inherited: boolean;
  source: string | null;
}

export interface Priority {
  persons: Record<string, PersonPriority>;
  combined_value: number | null;
  combined_level: number | null;
  unrated: boolean;
  disagree: boolean;
  distance: number;
  order_index: number;
}

export interface Reason {
  kind: "sequence" | "blocked_by" | "waiting";
  task_id?: string;
  title?: string;
  text?: string;
  until?: string | null;
  via?: string;
  via_title?: string;
}

export type Status = "open" | "in_progress" | "done" | "discarded";

export interface Task {
  id: string;
  parent_id: string | null;
  order: number;
  title: string;
  notes: string;
  status: Status;
  category: string | null;
  children_mode: "any" | "sequential";
  estimate_initial_min: number | null;
  estimate_frozen_at: string | null;
  remaining_min: number | null;
  priorities: Record<string, number>;
  blocked_by: string[];
  waiting_for: string | null;
  waiting_until: string | null;
  created_at: string;
  completed_at: string | null;
  depth: number;
  project_id: string;
  has_children: boolean;
  frozen: boolean;
  summary: Summary;
  priority: Priority;
  ready: boolean;
  reasons: Reason[];
  waiting_due: boolean;
  planned_min: number;
}

export interface Block {
  id: string;
  date: string;
  start_time: string | null;
  capacity_min: number;
  reserved_for: string | null;
  closed: boolean;
  note: string;
  fill_min: number;
  overbooked: boolean;
  past: boolean;
}

export interface Entry {
  id: string;
  task_id: string;
  block_id: string | null;
  order: number;
  planned_min: number;
  fixed: boolean;
  fixed_time: string | null;
  with_whom: string | null;
  list: "unscheduled" | "reschedule" | null;
  superseded: boolean;
  origin_id: string | null;
  booked_min?: number;
}

export interface PlanWarning {
  entry_id: string;
  task_id: string;
  task_title: string;
  prerequisite_id: string;
  prerequisite_title: string;
  fixed: boolean;
  reason: "not_planned" | "fixed_after" | "order";
  date: string | null;
  block_id: string | null;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  start: string;
  end: string | null;
  helper_min: number;
  note: string;
  minutes?: number;
  day?: string;
  task_title?: string;
}

export interface State {
  rev: number;
  now: string;
  today: string;
  timezone: string;
  me: { person_id: string | null; role: string | null; can_edit: boolean; is_admin: boolean };
  settings: Settings;
  tasks: Task[];
  blocks: Block[];
  entries: Entry[];
  warnings: PlanWarning[];
  ready_ids: string[];
  disagree_ids: string[];
  timer: { running: TimeEntry | null; last_task_id: string | null; can_undo_switch: boolean };
  can_undo_rollover: boolean;
}

export interface HomeAssistant {
  callWS<T = any>(msg: Record<string, any>): Promise<T>;
  connection: {
    subscribeMessage<T = any>(cb: (msg: T) => void, msg: Record<string, any>): Promise<() => void>;
  };
  user?: { id: string; name: string; is_admin: boolean };
  themes?: { darkMode?: boolean };
}

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "duration"
  | "date"
  | "time"
  | "datetime"
  | "select"
  | "checkbox"
  | "checks"
  | "task";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string | number; label: string }[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  /** for type "task": restrict the choices */
  taskFilter?: (t: Task) => boolean;
  allowEmpty?: boolean;
}

export interface FormSpec {
  title: string;
  message?: string;
  fields?: Field[];
  values?: Record<string, any>;
  submitLabel?: string;
  danger?: boolean;
  /** extra buttons returning a named action together with the values */
  actions?: { name: string; label: string; danger?: boolean }[];
}

export interface FormResult {
  action: string;
  values: Record<string, any>;
}
