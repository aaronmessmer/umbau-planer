import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { UpBase } from "./base";
import { fmtDur, fmtHours } from "./format";
import "./entry";
import type { Block } from "./types";

export const MIME_ENTRY = "application/x-up-entry";
export const MIME_BLOCK = "application/x-up-block";

/** A work block with its entries; target for dragged entries (B-3). */
export class UpBlock extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      .block {
        border: 1px solid var(--divider-color);
        border-left: 5px solid var(--primary-color);
        border-radius: 10px;
        padding: 8px 10px;
        margin: 0 0 10px;
        background: var(--card-background-color, #fff);
      }
      .block.past {
        border-left-color: var(--secondary-text-color);
        background: var(--secondary-background-color);
      }
      .block.reserved {
        border-left-color: var(--warning-color, #ffa600);
      }
      .head {
        cursor: grab;
      }
      .gap {
        min-height: 6px;
      }
      .gap.over {
        background: var(--primary-color);
        opacity: 0.4;
        border-radius: 3px;
      }
    `,
  ];

  @property({ attribute: false }) block!: Block;
  @property({ type: Boolean }) compact = false;
  @state() private over = false;
  @state() private overIdx: number | null = null;

  private async edit(): Promise<void> {
    const b = this.block;
    const res = await this.api.ui.form({
      title: "Block bearbeiten",
      fields: [
        { key: "date", label: "Datum", type: "date", required: true },
        { key: "start_time", label: "Startzeit (optional)", type: "time" },
        { key: "cap", label: "Kapazität", type: "duration", required: true },
        { key: "note", label: "Notiz (z. B. Ort)", type: "text" },
        {
          key: "reserved_for",
          label: "Reserviert für Projekt / Aufgabe",
          type: "task",
          allowEmpty: true,
          hint: "In einen reservierten Block rückt beim Nachrücken nichts nach.",
        },
      ],
      values: { date: b.date, start_time: b.start_time, cap: b.capacity_min, note: b.note, reserved_for: b.reserved_for },
      actions: [{ name: "delete", label: "Block löschen", danger: true }],
      submitLabel: "Speichern",
    });
    if (!res) return;
    if (res.action === "delete") {
      const ok = await this.api.ui.confirm(
        "Block löschen",
        "Die Einträge des Blocks wandern in die Liste „nicht eingeplant“.",
        true,
        "Löschen",
      );
      if (ok) await this.api.op("block_delete", { block_id: b.id });
      return;
    }
    await this.api.op("block_update", {
      block_id: b.id,
      fields: {
        date: res.values.date,
        start_time: res.values.start_time,
        capacity_min: res.values.cap,
        note: res.values.note,
        reserved_for: res.values.reserved_for,
      },
    });
  }

  private async addEntry(): Promise<void> {
    const b = this.block;
    const res = await this.api.ui.form({
      title: "Aufgabe einplanen",
      fields: [
        {
          key: "task",
          label: "Aufgabe",
          type: "task",
          required: true,
          taskFilter: (t) => {
            if (t.has_children || t.status === "done" || t.status === "discarded") return false;
            if (!b.reserved_for) return true;
            let cur = t as typeof t | undefined;
            while (cur) {
              if (cur.id === b.reserved_for) return true;
              cur = this.task(cur.parent_id);
            }
            return false;
          },
        },
        { key: "min", label: "Geplante Dauer (leer = Vorschlag)", type: "duration" },
      ],
      submitLabel: "Einplanen",
    });
    if (res) await this.api.op("entry_add", { task_id: res.values.task, block_id: b.id, planned_min: res.values.min });
  }

  private async suggest(): Promise<void> {
    const sug = await this.api.ws<any[]>("suggest_fill", { block_id: this.block.id });
    if (!sug?.length) return this.api.ui.toast("Keine passenden bereiten Aufgaben gefunden.");
    const ok = await this.api.ui.confirm(
      "Befüllung nach Priorität",
      sug.map((s) => `• ${s.title} – ${fmtDur(s.planned_min)}`).join("\n"),
      false,
      "Übernehmen",
    );
    if (ok) await this.api.op("entries_add_many", { block_id: this.block.id, items: sug });
  }

  private onDragOver(ev: DragEvent, idx: number | null): void {
    if (!ev.dataTransfer?.types.includes(MIME_ENTRY) || this.block.past) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.over = true;
    this.overIdx = idx;
  }

  private async onDrop(ev: DragEvent, idx: number | null): Promise<void> {
    const id = ev.dataTransfer?.getData(MIME_ENTRY);
    this.over = false;
    this.overIdx = null;
    if (!id) return;
    ev.preventDefault();
    ev.stopPropagation();
    const dragged = this.st.entries.find((e) => e.id === id);
    let index = idx;
    if (dragged && dragged.block_id === this.block.id && idx !== null) {
      const cur = this.entriesOf(this.block.id).findIndex((e) => e.id === id);
      if (cur !== -1 && cur < idx) index = idx - 1;
    }
    await this.api.op("entry_move", { entry_id: id, block_id: this.block.id, index });
  }

  render() {
    const b = this.block;
    const entries = this.entriesOf(b.id);
    const pct = Math.min(100, Math.round((b.fill_min / Math.max(1, b.capacity_min)) * 100));
    return html`<div
      class="block ${b.past ? "past" : ""} ${b.reserved_for ? "reserved" : ""} ${this.over ? "drop-target" : ""}"
      @dragover=${(e: DragEvent) => this.onDragOver(e, null)}
      @dragleave=${() => ((this.over = false), (this.overIdx = null))}
      @drop=${(e: DragEvent) => this.onDrop(e, null)}
    >
      <div
        class="row head"
        draggable=${this.canEdit && !b.past ? "true" : "false"}
        @dragstart=${(e: DragEvent) => e.dataTransfer?.setData(MIME_BLOCK, b.id)}
      >
        <b>${b.date.split("-").reverse().slice(0, 2).join(".")}.${b.start_time ? ` ab ${b.start_time}` : ""}</b>
        ${b.closed ? html`<span class="chip">abgeschlossen</span>` : b.past ? html`<span class="chip">vergangen</span>` : nothing}
        ${b.reserved_for ? html`<span class="chip warn">reserviert: ${this.ttl(b.reserved_for)}</span>` : nothing}
        ${b.note ? html`<span class="muted small">${b.note}</span>` : nothing}
        <span class="right ${b.overbooked ? "chip err" : "muted small"}"
          >${fmtHours(b.fill_min)} / ${fmtHours(b.capacity_min)}${b.overbooked ? " – überbucht" : ""}</span
        >
      </div>
      <div class="bar ${b.overbooked ? "over" : ""}" style="margin:4px 0"><span style="width:${pct}%"></span></div>
      ${entries.map(
        (e, i) => html`<div class="gap ${this.over && this.overIdx === i ? "over" : ""}"
            @dragover=${(ev: DragEvent) => this.onDragOver(ev, i)}
            @drop=${(ev: DragEvent) => this.onDrop(ev, i)}></div>
          <up-entry
            .st=${this.st}
            .api=${this.api}
            .entry=${e}
            draggable=${this.canEdit && !b.past && !e.superseded ? "true" : "false"}
            @dragstart=${(ev: DragEvent) => ev.dataTransfer?.setData(MIME_ENTRY, e.id)}
          ></up-entry>`,
      )}
      ${!entries.length ? html`<div class="muted small">Leer.</div>` : nothing}
      ${this.canEdit
        ? html`<div class="row" style="margin-top:4px">
            ${!b.past ? html`<button @click=${() => this.addEntry()}>+ Aufgabe</button>` : nothing}
            ${!b.past && !this.compact ? html`<button @click=${() => this.suggest()}>Vorschlag</button>` : nothing}
            ${!b.closed ? html`<button @click=${() => this.api.op("block_close", { block_id: b.id })}>Abschließen</button>` : nothing}
            <button class="right" @click=${() => this.edit()}>Bearbeiten</button>
          </div>`
        : nothing}
    </div>`;
  }
}
customElements.define("up-block", UpBlock);
