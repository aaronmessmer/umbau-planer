import { css, html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { UpBase } from "./base";
import { fmtDur, fmtSigned, parseDur } from "./format";
import "./prio-chips";
import type { Status, Task } from "./types";

const STATUS_LABEL: Record<Status, string> = {
  open: "offen",
  in_progress: "in Arbeit",
  done: "erledigt",
  discarded: "verworfen",
};

const LS_KEY = "umbau_planer_tasks_ui";

interface Ui {
  folded: string[];
  search: string;
  status: string;
  category: string;
  project: string;
  readyOnly: boolean;
  hideDone: boolean;
}

function loadUi(): Ui {
  const def: Ui = { folded: [], search: "", status: "", category: "", project: "", readyOnly: false, hideDone: false };
  try {
    return { ...def, ...JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") };
  } catch {
    return def;
  }
}

function durText(min: number | null): string {
  if (min === null) return "";
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

export class UpViewTasks extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      .toolbar {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 8px;
        align-items: center;
      }
      .toolbar input[type="search"] {
        flex: 1 1 160px;
      }
      .task {
        border-bottom: 1px solid var(--divider-color);
        padding: 4px 0;
      }
      .task.hl {
        background: color-mix(in srgb, var(--primary-color) 15%, transparent);
      }
      .task.done .title,
      .task.discarded .title {
        text-decoration: line-through;
        opacity: 0.6;
      }
      .task.drop-before {
        box-shadow: 0 -2px 0 var(--primary-color);
      }
      .task.drop-after {
        box-shadow: 0 2px 0 var(--primary-color);
      }
      .task.drop-into {
        outline: 2px dashed var(--primary-color);
      }
      .handle {
        cursor: grab;
        user-select: none;
        color: var(--secondary-text-color);
        padding: 0 2px;
      }
      .fold {
        width: 26px;
        padding: 0;
        min-width: 26px;
        border: none;
        background: none;
      }
      .title {
        flex: 1 1 140px;
        min-width: 100px;
        font-weight: 500;
      }
      .nums {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        font-size: 12px;
        color: var(--secondary-text-color);
        margin: 2px 0 0 62px;
      }
      .nums input {
        width: 64px;
        text-align: right;
      }
      .reason {
        font-size: 12px;
        color: var(--warning-color, #b26a00);
        margin: 0 0 0 62px;
      }
      .reason a {
        color: inherit;
        text-decoration: underline;
        cursor: pointer;
      }
      .details {
        margin: 6px 0 6px 40px;
        padding: 8px 10px;
        border-left: 3px solid var(--primary-color);
        background: var(--secondary-background-color);
        border-radius: 0 8px 8px 0;
      }
      .details label {
        display: block;
        font-size: 12px;
        color: var(--secondary-text-color);
        margin: 6px 0 2px;
      }
      .sumtable td {
        padding: 2px 8px 2px 0;
        border: none;
      }
      select.status {
        min-height: 28px;
        padding: 2px 4px;
        font-size: 12px;
      }
      @media (max-width: 600px) {
        .nums,
        .reason {
          margin-left: 6px;
        }
        .nums {
          gap: 4px 10px;
        }
        .details {
          margin-left: 6px;
        }
        .chips {
          margin-left: 6px !important;
        }
      }
    `,
  ];

  @state() private ui: Ui = loadUi();
  @state() private open: string | null = null;
  @state() private highlight: string | null = null;
  @state() private drop: { id: string; zone: "before" | "after" | "into" } | null = null;
  private dragId: string | null = null;

  private save(patch: Partial<Ui>): void {
    this.ui = { ...this.ui, ...patch };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.ui));
    } catch {
      /* ignore */
    }
  }

  private filtering(): boolean {
    const u = this.ui;
    return !!(u.search || u.status || u.category || u.project || u.readyOnly);
  }

  private visible(): Task[] {
    const u = this.ui;
    const all = this.st.tasks;
    const q = u.search.trim().toLowerCase();
    const matches = (t: Task): boolean => {
      if (q && !(t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q))) return false;
      if (u.status && t.status !== u.status) return false;
      if (u.category && (t.category ?? "") !== u.category) return false;
      if (u.project && t.project_id !== u.project) return false;
      if (u.readyOnly && !(t.ready && !t.has_children)) return false;
      return true;
    };
    let keep: Set<string>;
    if (this.filtering()) {
      keep = new Set();
      for (const t of all) {
        if (matches(t)) {
          let cur: Task | undefined = t;
          while (cur && !keep.has(cur.id)) {
            keep.add(cur.id);
            cur = this.task(cur.parent_id);
          }
        }
      }
    } else {
      keep = new Set(all.map((t) => t.id));
    }
    const folded = new Set(u.folded);
    const searching = this.filtering();
    return all.filter((t) => {
      if (!keep.has(t.id)) return false;
      if (u.hideDone && (t.status === "done" || t.status === "discarded")) return false;
      if (searching) return true;
      let p = this.task(t.parent_id);
      while (p) {
        if (folded.has(p.id)) return false;
        p = this.task(p.parent_id);
      }
      return true;
    });
  }

  private toggleFold(id: string): void {
    const set = new Set(this.ui.folded);
    set.has(id) ? set.delete(id) : set.add(id);
    this.save({ folded: [...set] });
  }

  private jumpTo(id: string): void {
    const set = new Set(this.ui.folded);
    let p = this.task(this.task(id)?.parent_id);
    while (p) {
      set.delete(p.id);
      p = this.task(p.parent_id);
    }
    this.save({ folded: [...set], search: "", status: "", category: "", project: "", readyOnly: false });
    this.highlight = id;
    this.updateComplete.then(() => {
      this.renderRoot.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    setTimeout(() => (this.highlight = null), 2500);
  }

  private async patchTask(t: Task, fields: Record<string, any>): Promise<void> {
    await this.api.op("task_update", { task_id: t.id, fields });
  }

  private async editDur(t: Task, field: "estimate_initial_min" | "remaining_min", ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const val = parseDur(input.value);
    if (val !== null && Number.isNaN(val)) {
      this.api.ui.toast("Ungültige Dauer, z. B. 1:30 oder 90 min", { kind: "error" });
      input.value = durText(field === "estimate_initial_min" ? t.estimate_initial_min : t.remaining_min);
      return;
    }
    await this.patchTask(t, { [field]: val });
  }

  private async addTask(parent: Task | null): Promise<void> {
    const res = await this.api.ui.form({
      title: parent ? `Unteraufgabe zu „${parent.title}“` : "Neues Projekt",
      fields: [
        { key: "title", label: "Titel", type: "text", required: true },
        { key: "estimate", label: "Schätzung", type: "duration" },
        {
          key: "category",
          label: "Gewerk",
          type: "select",
          allowEmpty: true,
          options: this.st.settings.categories.map((c) => ({ value: c, label: c })),
        },
      ],
      submitLabel: "Anlegen",
    });
    if (!res) return;
    const v = res.values;
    const created = await this.api.op<{ id: string }>("task_create", {
      title: v.title,
      parent_id: parent?.id ?? null,
      estimate_initial_min: v.estimate,
      category: v.category,
    });
    if (created && parent) {
      this.save({ folded: this.ui.folded.filter((f) => f !== parent.id) });
    }
  }

  private async quickAdd(ev: KeyboardEvent): Promise<void> {
    if (ev.key !== "Enter") return;
    const input = ev.target as HTMLInputElement;
    const title = input.value.trim();
    if (!title) return;
    input.value = "";
    await this.api.op("task_create", { title, parent_id: null });
  }

  private async removeTask(t: Task): Promise<void> {
    const info = await this.api.ws<{ descendants: number; with_bookings: number }>("delete_info", { task_id: t.id });
    if (!info) return;
    const lines = [`„${t.title}“ löschen?`];
    if (info.descendants) lines.push(`Betroffen sind ${info.descendants} Unteraufgabe${info.descendants === 1 ? "" : "n"}.`);
    if (info.with_bookings)
      lines.push(
        `${info.with_bookings} Aufgabe${info.with_bookings === 1 ? " hat" : "n haben"} Zeitbuchungen und werden nicht gelöscht, sondern auf „verworfen“ gesetzt.`,
      );
    const ok = await this.api.ui.confirm("Aufgabe löschen", lines.join("\n"), true, "Löschen");
    if (!ok) return;
    const res = await this.api.op<{ deleted: number; discarded: number }>("task_delete", { task_id: t.id });
    if (res && res.discarded) this.api.ui.toast(`${res.deleted} gelöscht, ${res.discarded} verworfen`);
  }

  private async move(t: Task): Promise<void> {
    const banned = new Set<string>([t.id]);
    for (const x of this.st.tasks) {
      let p = this.task(x.parent_id);
      while (p) {
        if (p.id === t.id) banned.add(x.id);
        p = this.task(p.parent_id);
      }
    }
    const res = await this.api.ui.form({
      title: `„${t.title}“ verschieben`,
      fields: [
        {
          key: "parent",
          label: "Unter Aufgabe (leer = als Projekt)",
          type: "task",
          allowEmpty: true,
          taskFilter: (x) => !banned.has(x.id),
        },
        {
          key: "pos",
          label: "Position",
          type: "select",
          options: [
            { value: "end", label: "Am Ende" },
            { value: "start", label: "Am Anfang" },
          ],
        },
      ],
      values: { parent: t.parent_id ?? "", pos: "end" },
      submitLabel: "Verschieben",
    });
    if (!res) return;
    await this.api.op("task_move", {
      task_id: t.id,
      parent_id: res.values.parent,
      index: res.values.pos === "start" ? 0 : null,
    });
  }

  private async plan(t: Task): Promise<void> {
    const blocks = this.st.blocks.filter((b) => !b.past);
    if (!blocks.length) {
      this.api.ui.toast("Es gibt keinen offenen Arbeitsblock. Lege im Kalender einen an.", { kind: "warn" });
      return;
    }
    const suggestion = Math.max(0, t.summary.remaining_min - t.planned_min);
    const res = await this.api.ui.form({
      title: `„${t.title}“ einplanen`,
      message: t.ready ? undefined : `Hinweis: ${this.reasonText(t)}`,
      fields: [
        {
          key: "block",
          label: "Arbeitsblock",
          type: "select",
          options: blocks.map((b) => ({
            value: b.id,
            label: `${b.date}${b.start_time ? " " + b.start_time : ""} (${fmtDur(b.fill_min)} / ${fmtDur(b.capacity_min)})${b.note ? " – " + b.note : ""}`,
          })),
        },
        { key: "min", label: "Geplante Dauer", type: "duration", required: true },
      ],
      values: { block: blocks[0].id, min: suggestion || 30 },
      submitLabel: "Einplanen",
    });
    if (!res) return;
    await this.api.op("entry_add", { task_id: t.id, block_id: res.values.block, planned_min: res.values.min });
  }

  private async addBlocker(t: Task): Promise<void> {
    const res = await this.api.ui.form({
      title: "Blockiert durch …",
      message: "Die gewählte Aufgabe muss erledigt sein, bevor diese bereit ist.",
      fields: [{ key: "other", label: "Aufgabe", type: "task", required: true, taskFilter: (x) => x.id !== t.id }],
      submitLabel: "Hinzufügen",
    });
    if (!res) return;
    await this.patchTask(t, { blocked_by: [...t.blocked_by, res.values.other] });
  }

  // ---- drag and drop (A-2) ----
  private onDragOver(ev: DragEvent, t: Task): void {
    if (!this.dragId || this.dragId === t.id) return;
    ev.preventDefault();
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const y = (ev.clientY - rect.top) / rect.height;
    const zone = y < 0.25 ? "before" : y > 0.75 ? "after" : "into";
    if (this.drop?.id !== t.id || this.drop.zone !== zone) this.drop = { id: t.id, zone };
  }

  private async onDrop(ev: DragEvent, t: Task): Promise<void> {
    ev.preventDefault();
    const zone = this.drop?.zone ?? "into";
    const dragged = this.task(this.dragId);
    this.drop = null;
    this.dragId = null;
    if (!dragged || dragged.id === t.id) return;
    if (zone === "into") {
      await this.api.op("task_move", { task_id: dragged.id, parent_id: t.id, index: null });
      this.save({ folded: this.ui.folded.filter((f) => f !== t.id) });
      return;
    }
    const siblings = this.childrenOf(t.parent_id).filter((s) => s.id !== dragged.id);
    const idx = siblings.findIndex((s) => s.id === t.id);
    await this.api.op("task_move", {
      task_id: dragged.id,
      parent_id: t.parent_id,
      index: zone === "before" ? idx : idx + 1,
    });
  }

  private row(t: Task) {
    const s = t.summary;
    const edit = this.canEdit;
    const folded = this.ui.folded.includes(t.id);
    const finished = t.status === "done" || t.status === "discarded";
    const dropClass = this.drop?.id === t.id ? `drop-${this.drop.zone}` : "";
    return html`
      <div
        class="task ${t.status} ${dropClass} ${this.highlight === t.id ? "hl" : ""}"
        data-id=${t.id}
        @dragover=${(e: DragEvent) => this.onDragOver(e, t)}
        @dragleave=${() => (this.drop = null)}
        @drop=${(e: DragEvent) => this.onDrop(e, t)}
      >
        <div class="row nowrap" style="padding-left:${this.filtering() ? 0 : t.depth * (this.clientWidth < 600 ? 10 : 18)}px">
          ${edit
            ? html`<span
                class="handle"
                draggable="true"
                title="Ziehen zum Umsortieren oder Verschieben"
                @dragstart=${(e: DragEvent) => {
                  this.dragId = t.id;
                  e.dataTransfer?.setData("text/plain", t.id);
                }}
                @dragend=${() => {
                  this.dragId = null;
                  this.drop = null;
                }}
                >⠿</span
              >`
            : nothing}
          ${t.has_children
            ? html`<button class="fold" @click=${() => this.toggleFold(t.id)} title="Ein-/Ausklappen">
                ${folded ? "▸" : "▾"}
              </button>`
            : html`<span style="width:26px"></span>`}
          <button
            class="icon"
            ?disabled=${!edit}
            title=${finished ? "Wieder öffnen" : "Als erledigt markieren"}
            @click=${() => this.patchTask(t, { status: finished ? "open" : "done" })}
          >
            ${t.status === "done" ? "☑" : t.status === "discarded" ? "⊘" : "☐"}
          </button>
          <input
            class="inline title"
            .value=${t.title}
            ?disabled=${!edit}
            @change=${(e: any) => this.patchTask(t, { title: e.target.value })}
          />
          <button class="icon" title="Uhr starten" ?disabled=${!edit} @click=${() => this.startTimer(t.id)}>▶</button>
          <button class="icon" title="Details" @click=${() => (this.open = this.open === t.id ? null : t.id)}>
            ${this.open === t.id ? "▴" : "⋯"}
          </button>
        </div>
        <div class="row chips" style="margin-left:62px;gap:4px">
          ${!finished
            ? t.ready
              ? html`<span class="chip ok" title="Kann jetzt begonnen werden">${t.has_children ? "bereit" : "bereit"}</span>`
              : html`<span class="chip warn" title=${this.reasonText(t)}>🔒 nicht bereit</span>`
            : html`<span class="chip">${STATUS_LABEL[t.status]}</span>`}
          ${t.status === "in_progress" ? html`<span class="chip">in Arbeit</span>` : nothing}
          ${t.category ? html`<span class="chip">${t.category}</span>` : nothing}
          ${t.waiting_due ? html`<span class="chip err">Wartezeit erreicht</span>` : nothing}
          ${s.unestimated && !finished ? html`<span class="chip" title="Keine Schätzung">ohne Schätzung</span>` : nothing}
          <up-prio-chips .st=${this.st} .api=${this.api} .item=${t}></up-prio-chips>
        </div>
        ${!t.ready && !finished && t.reasons.length
          ? html`<div class="reason">
              ${t.reasons.map((r, i) => {
                const target = r.task_id;
                const text = this.reasonText({ ...t, reasons: [r] } as Task);
                return html`${i ? "; " : ""}${target
                  ? html`<a @click=${() => this.jumpTo(target)}>${text}</a>`
                  : text}`;
              })}
            </div>`
          : nothing}
        <div class="nums">
          <span
            >Geschätzt
            ${t.has_children
              ? html`<b>${fmtDur(s.estimate_min)}</b>${s.rough_min !== null ? html` (Grob ${fmtDur(s.rough_min)})` : nothing}${s.partial
                    ? html` <span title="Nicht alle Unteraufgaben sind geschätzt">*</span>`
                    : nothing}`
              : html`<input
                    class="inline"
                    .value=${durText(t.estimate_initial_min)}
                    ?disabled=${!edit || t.frozen}
                    title=${t.frozen ? "Mit der ersten Buchung eingefroren" : "Schätzung, z. B. 1:30"}
                    placeholder="–"
                    @change=${(e: Event) => this.editDur(t, "estimate_initial_min", e)}
                  />${t.frozen ? "🔒" : ""}`}</span
          >
          <span>Gebucht <b>${fmtDur(s.booked_min)}</b></span>
          <span
            >Rest
            ${t.has_children
              ? html`<b>${fmtDur(s.remaining_min)}</b>`
              : html`<input
                  class="inline"
                  .value=${durText(s.remaining_min)}
                  ?disabled=${!edit || finished}
                  title="Restschätzung, jederzeit änderbar"
                  @change=${(e: Event) => this.editDur(t, "remaining_min", e)}
                />`}</span
          >
          <span>Prognose <b>${fmtDur(s.forecast_min)}</b>${s.deviation_min !== null
              ? html` (<span style="color:${s.deviation_min > 0 ? "var(--error-color)" : "var(--success-color)"}">${fmtSigned(s.deviation_min)}</span>)`
              : nothing}</span
          >
          ${t.planned_min ? html`<span title="In offenen Blöcken eingeplant">Eingeplant ${fmtDur(t.planned_min)}</span>` : nothing}
        </div>
        ${this.open === t.id ? this.details(t) : nothing}
      </div>
    `;
  }

  private details(t: Task) {
    const edit = this.canEdit;
    const s = t.summary;
    return html`<div class="details">
      <label>Notiz</label>
      <textarea .value=${t.notes} ?disabled=${!edit} @change=${(e: any) => this.patchTask(t, { notes: e.target.value })}></textarea>
      <div class="row">
        <div>
          <label>Status</label>
          <select ?disabled=${!edit} .value=${t.status} @change=${(e: any) => this.patchTask(t, { status: e.target.value })}>
            ${(Object.keys(STATUS_LABEL) as Status[]).map(
              (k) => html`<option value=${k} ?selected=${k === t.status}>${STATUS_LABEL[k]}</option>`,
            )}
          </select>
        </div>
        <div>
          <label>Gewerk</label>
          <select ?disabled=${!edit} @change=${(e: any) => this.patchTask(t, { category: e.target.value || null })}>
            <option value="">–</option>
            ${this.st.settings.categories.map(
              (c) => html`<option value=${c} ?selected=${c === t.category}>${c}</option>`,
            )}
          </select>
        </div>
        <div>
          <label>Unteraufgaben</label>
          <select ?disabled=${!edit} @change=${(e: any) => this.patchTask(t, { children_mode: e.target.value })}>
            <option value="any" ?selected=${t.children_mode === "any"}>beliebig</option>
            <option value="sequential" ?selected=${t.children_mode === "sequential"}>der Reihe nach</option>
          </select>
        </div>
      </div>
      <table class="sumtable">
        <tr><td>Ursprüngliche Schätzung</td><td>${fmtDur(t.estimate_initial_min)}${t.frozen ? " 🔒" : ""}</td>
            <td>Summe Unteraufgaben / Schätzung</td><td>${fmtDur(s.estimate_min)}</td></tr>
        <tr><td>Gebucht (eigene Zeit)</td><td>${fmtDur(s.booked_own_min)}</td>
            <td>Helferstunden</td><td>${fmtDur(s.helper_min)}</td></tr>
        <tr><td>Aufwand</td><td>${fmtDur(s.booked_min)}</td><td>Rest</td><td>${fmtDur(s.remaining_min)}</td></tr>
        <tr><td>Prognose</td><td>${fmtDur(s.forecast_min)}</td><td>Abweichung</td><td>${fmtSigned(s.deviation_min)}</td></tr>
      </table>
      <label>Blockiert durch</label>
      <div class="row">
        ${t.blocked_by.map((b) => {
          const bt = this.task(b);
          return html`<span class="chip">
            <a style="cursor:pointer" @click=${() => this.jumpTo(b)}>${bt?.title ?? "?"}</a>
            ${edit
              ? html`<a style="cursor:pointer" title="Entfernen" @click=${() => this.patchTask(t, { blocked_by: t.blocked_by.filter((x) => x !== b) })}>✕</a>`
              : nothing}
          </span>`;
        })}
        ${edit ? html`<button @click=${() => this.addBlocker(t)}>+ Blockade</button>` : nothing}
      </div>
      <label>Wartet auf (Material, Handwerker …)</label>
      <div class="row">
        <input
          .value=${t.waiting_for ?? ""}
          ?disabled=${!edit}
          placeholder="z. B. Lieferung Holz"
          @change=${(e: any) => this.patchTask(t, { waiting_for: e.target.value })}
        />
        <input type="date" .value=${t.waiting_until ?? ""} ?disabled=${!edit} @change=${(e: any) => this.patchTask(t, { waiting_until: e.target.value || null })} />
        ${t.waiting_for && edit
          ? html`<button @click=${() => this.patchTask(t, { waiting_for: null })}>Wartezustand aufheben</button>`
          : nothing}
      </div>
      <div class="row" style="margin-top:10px">
        ${edit && !t.has_children ? html`<button @click=${() => this.plan(t)}>Einplanen …</button>` : nothing}
        ${edit ? html`<button @click=${() => this.addTask(t)}>+ Unteraufgabe</button>` : nothing}
        ${edit ? html`<button @click=${() => this.move(t)}>Verschieben …</button>` : nothing}
        ${edit ? html`<button class="danger right" @click=${() => this.removeTask(t)}>Löschen …</button>` : nothing}
      </div>
    </div>`;
  }

  render() {
    const u = this.ui;
    const list = this.visible();
    const projects = this.st.tasks.filter((t) => t.parent_id === null);
    return html`
      <div class="toolbar">
        <input type="search" placeholder="Suchen (Titel, Notiz)" .value=${u.search} @input=${(e: any) => this.save({ search: e.target.value })} />
        <select .value=${u.status} @change=${(e: any) => this.save({ status: e.target.value })}>
          <option value="">Status: alle</option>
          ${(Object.keys(STATUS_LABEL) as Status[]).map((k) => html`<option value=${k} ?selected=${u.status === k}>${STATUS_LABEL[k]}</option>`)}
        </select>
        <select @change=${(e: any) => this.save({ category: e.target.value })}>
          <option value="">Gewerk: alle</option>
          ${this.st.settings.categories.map((c) => html`<option value=${c} ?selected=${u.category === c}>${c}</option>`)}
        </select>
        <select @change=${(e: any) => this.save({ project: e.target.value })}>
          <option value="">Projekt: alle</option>
          ${projects.map((p) => html`<option value=${p.id} ?selected=${u.project === p.id}>${p.title}</option>`)}
        </select>
        <label class="row"><input type="checkbox" .checked=${u.readyOnly} @change=${(e: any) => this.save({ readyOnly: e.target.checked })} />bereit</label>
        <label class="row"><input type="checkbox" .checked=${u.hideDone} @change=${(e: any) => this.save({ hideDone: e.target.checked })} />Erledigte ausblenden</label>
      </div>
      ${this.canEdit
        ? html`<div class="row" style="margin-bottom:8px">
            <input class="grow" placeholder="Neues Projekt … (Enter)" @keydown=${(e: KeyboardEvent) => this.quickAdd(e)} />
            <button @click=${() => this.addTask(null)}>+ Projekt …</button>
          </div>`
        : nothing}
      <div class="card">
        ${list.length
          ? list.map((t) => this.row(t))
          : html`<div class="empty">${this.st.tasks.length ? "Keine Aufgabe passt zu den Filtern." : "Noch keine Aufgaben. Lege oben ein Projekt an."}</div>`}
      </div>
    `;
  }
}
customElements.define("up-view-tasks", UpViewTasks);
