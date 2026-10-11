import { css, html, nothing } from "lit";
import { UpBase } from "./base";
import { fmtDur, fmtHours } from "./format";
import "./entry";

export class UpViewToday extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      .fill {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fill .bar {
        flex: 1;
      }
    `,
  ];

  private async newBlock(): Promise<void> {
    const res = await this.api.ui.form({
      title: "Block für heute",
      fields: [
        { key: "start_time", label: "Startzeit (optional)", type: "time" },
        { key: "cap", label: "Kapazität", type: "duration", required: true },
        { key: "note", label: "Notiz (z. B. Ort)", type: "text" },
      ],
      values: { cap: this.st.settings.default_capacity_min },
      submitLabel: "Anlegen",
    });
    if (!res) return;
    await this.api.op("block_create", {
      date: this.st.today,
      start_time: res.values.start_time,
      capacity_min: res.values.cap,
      note: res.values.note,
    });
  }

  private async addEntry(blockId: string): Promise<void> {
    const block = this.blockById(blockId)!;
    const allowed = block.reserved_for;
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
            if (!allowed) return true;
            let cur = t as typeof t | undefined;
            while (cur) {
              if (cur.id === allowed) return true;
              cur = this.task(cur.parent_id);
            }
            return false;
          },
        },
        { key: "min", label: "Geplante Dauer (leer = Vorschlag)", type: "duration" },
      ],
      submitLabel: "Einplanen",
    });
    if (!res) return;
    await this.api.op("entry_add", { task_id: res.values.task, block_id: blockId, planned_min: res.values.min });
  }

  private async close(blockId: string): Promise<void> {
    const ok = await this.api.ui.confirm(
      "Block abschließen",
      "Danach lässt sich der Block nicht mehr planen. Unerledigtes kannst du mit „Nachrücken“ nach vorne holen.",
      false,
      "Abschließen",
    );
    if (ok) await this.api.op("block_close", { block_id: blockId });
  }

  render() {
    const today = this.st.today;
    const blocks = this.st.blocks.filter((b) => b.date === today);
    const pastOpen = this.st.blocks.filter((b) => b.date < today || b.closed).some((b) =>
      this.st.entries.some((e) => e.block_id === b.id && !e.superseded && this.task(e.task_id)?.status !== "done" && this.task(e.task_id)?.status !== "discarded"),
    );
    const todaysWarnings = this.st.warnings.filter((w) => w.date === today);
    const booked = this.st.entries
      .filter((e) => blocks.some((b) => b.id === e.block_id) && !e.superseded)
      .reduce((a, e) => a + e.planned_min, 0);
    return html`
      <div class="row" style="margin-bottom:8px">
        <h2 style="margin:0">Heute</h2>
        <span class="muted">${fmtHours(booked)} geplant</span>
        <span class="right"></span>
        ${this.canEdit
          ? html`<button @click=${() => this.api.ui.rolloverFlow()} class=${pastOpen ? "primary" : ""}>Nachrücken …</button>`
          : nothing}
        ${this.st.can_undo_rollover && this.canEdit
          ? html`<button @click=${() => this.api.op("rollover_undo")}>Nachrücken rückgängig</button>`
          : nothing}
      </div>
      ${pastOpen
        ? html`<div class="warning-box">In vergangenen Blöcken ist Unerledigtes. „Nachrücken“ verteilt es auf die kommenden Blöcke.</div>`
        : nothing}
      ${todaysWarnings.map(
        (w) => html`<div class="warning-box">⚠ „${w.task_title}“ (heute${w.fixed ? ", fixiert" : ""}): Voraussetzung „${w.prerequisite_title}“ ist nicht rechtzeitig eingeplant.</div>`,
      )}
      ${blocks.length
        ? blocks.map((b) => {
            const pct = Math.min(100, Math.round((b.fill_min / Math.max(1, b.capacity_min)) * 100));
            return html`<div class="card">
              <div class="row">
                <b>${b.start_time ? `Block ab ${b.start_time}` : "Arbeitsblock"}</b>
                ${b.reserved_for ? html`<span class="chip">reserviert: ${this.ttl(b.reserved_for)}</span>` : nothing}
                ${b.closed ? html`<span class="chip">abgeschlossen</span>` : nothing}
                ${b.note ? html`<span class="muted">${b.note}</span>` : nothing}
              </div>
              <div class="fill" style="margin:6px 0">
                <div class="bar ${b.overbooked ? "over" : ""}"><span style="width:${pct}%"></span></div>
                <span class=${b.overbooked ? "chip err" : ""}>${fmtHours(b.fill_min)} von ${fmtHours(b.capacity_min)}</span>
              </div>
              ${b.overbooked ? html`<div class="error-box">Überbucht um ${fmtDur(b.fill_min - b.capacity_min)}</div>` : nothing}
              ${this.entriesOf(b.id)
                .filter((e) => !e.superseded)
                .map((e) => html`<up-entry .st=${this.st} .api=${this.api} .entry=${e}></up-entry>`)}
              ${!this.entriesOf(b.id).length ? html`<div class="muted">Noch nichts eingeplant.</div>` : nothing}
              ${this.canEdit
                ? html`<div class="row" style="margin-top:6px">
                    ${!b.closed ? html`<button @click=${() => this.addEntry(b.id)}>+ Aufgabe</button>` : nothing}
                    ${!b.closed
                      ? html`<button
                          @click=${async () => {
                            const sug = await this.api.ws<any[]>("suggest_fill", { block_id: b.id });
                            if (!sug?.length) return this.api.ui.toast("Keine passenden bereiten Aufgaben gefunden.");
                            const ok = await this.api.ui.confirm(
                              "Befüllung vorschlagen",
                              sug.map((s) => `• ${s.title} – ${fmtDur(s.planned_min)}`).join("\n"),
                              false,
                              "Übernehmen",
                            );
                            if (ok) await this.api.op("entries_add_many", { block_id: b.id, items: sug });
                          }}
                        >
                          Vorschlag nach Priorität
                        </button>`
                      : nothing}
                    ${!b.closed ? html`<button class="right" @click=${() => this.close(b.id)}>Block abschließen</button>` : nothing}
                  </div>`
                : nothing}
            </div>`;
          })
        : html`<div class="card empty">
            Heute ist kein Arbeitsblock angelegt.
            ${this.canEdit ? html`<div><button class="primary" @click=${() => this.newBlock()}>Block für heute anlegen</button></div>` : nothing}
          </div>`}
      ${blocks.length && this.canEdit ? html`<button @click=${() => this.newBlock()}>+ weiterer Block heute</button>` : nothing}
    `;
  }
}
customElements.define("up-view-today", UpViewToday);
