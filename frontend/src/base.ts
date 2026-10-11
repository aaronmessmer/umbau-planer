import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import type { Api } from "./api";
import { sharedStyles } from "./styles";
import type { Block, Entry, Person, State, Task } from "./types";

/** Base class of all views: gives access to the state and a few lookups. */
export class UpBase extends LitElement {
  static styles = [sharedStyles];

  @property({ attribute: false }) st!: State;
  @property({ attribute: false }) api!: Api;

  private _cacheState?: State;
  private _byId = new Map<string, Task>();
  private _children = new Map<string | null, Task[]>();

  private _index(): void {
    if (this._cacheState === this.st) return;
    this._cacheState = this.st;
    this._byId = new Map(this.st.tasks.map((t) => [t.id, t]));
    this._children = new Map();
    for (const t of this.st.tasks) {
      const list = this._children.get(t.parent_id) ?? [];
      list.push(t);
      this._children.set(t.parent_id, list);
    }
  }

  task(id: string | null | undefined): Task | undefined {
    this._index();
    return id ? this._byId.get(id) : undefined;
  }

  childrenOf(id: string | null): Task[] {
    this._index();
    return this._children.get(id) ?? [];
  }

  ttl(id: string | null | undefined): string {
    return this.task(id)?.title ?? "?";
  }

  projectTitle(id: string): string {
    const t = this.task(id);
    return t ? this.ttl(t.project_id) : "?";
  }

  get canEdit(): boolean {
    return this.st.me.can_edit;
  }

  get persons(): Person[] {
    return this.st.settings.persons;
  }

  get levels(): string[] {
    return this.st.settings.level_names;
  }

  blockById(id: string | null): Block | undefined {
    return this.st.blocks.find((b) => b.id === id);
  }

  entriesOf(blockId: string): Entry[] {
    return this.st.entries.filter((e) => e.block_id === blockId).sort((a, b) => a.order - b.order);
  }

  listEntries(list: "unscheduled" | "reschedule"): Entry[] {
    return this.st.entries
      .filter((e) => e.block_id === null && e.list === list)
      .sort((a, b) => a.order - b.order);
  }

  /** Reason text for tasks that are not ready (D-8, D-9). */
  reasonText(t: Task): string {
    return t.reasons
      .map((r) => {
        const via = r.via_title ? ` (über „${r.via_title}“)` : "";
        if (r.kind === "waiting") {
          return `wartet auf ${r.text}${r.until ? ` bis ${r.until}` : ""}${via}`;
        }
        if (r.kind === "sequence") return `„${r.title}“ muss zuerst erledigt werden${via}`;
        return `blockiert durch „${r.title}“${via}`;
      })
      .join("; ");
  }

  /** Start the stopwatch on a task; blocked tasks only get a hint (D-9). */
  async startTimer(taskId: string): Promise<void> {
    const t = this.task(taskId);
    if (t && !t.ready && t.status !== "done" && t.status !== "discarded" && t.reasons.length) {
      this.api.ui.toast(`Hinweis: ${this.reasonText(t)}`, { kind: "warn", timeout: 6000 });
    }
    const was = this.st.timer.running;
    const res = await this.api.op<{ can_undo: boolean }>("timer_start", { task_id: taskId });
    if (res?.can_undo && was) {
      this.api.ui.toast(`Gewechselt zu „${this.ttl(taskId)}“`, {
        action: {
          label: "Rückgängig",
          run: () => void this.api.op("timer_undo_switch"),
        },
        timeout: 8000,
      });
    }
  }
}
