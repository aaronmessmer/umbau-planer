import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { UpBase } from "./base";
import { fmtDur, parseDur } from "./format";

interface LayoutEntry {
  id: string;
  task_id: string;
  title: string;
  planned_min: number;
  fixed: boolean;
  superseded: boolean;
}

interface Preview {
  affected: { task_id: string; title: string; suggested_min: number; remaining_min: number }[];
  before: Record<string, LayoutEntry[]>;
  after: Record<string, LayoutEntry[]>;
  warnings: { task_title: string; prerequisite_title: string; date: string | null }[];
  removed: string[];
}

function durText(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

/** The "Nachrücken" flow: ask remaining times, preview before/after, apply (N-1 .. N-8). */
export class UpRolloverDialog extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
      }
      .dialog {
        background: var(--card-background-color, #fff);
        border-radius: 14px;
        padding: 16px;
        width: min(760px, 100%);
        max-height: 94vh;
        overflow: auto;
      }
      .cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      @media (max-width: 560px) {
        .cols {
          grid-template-columns: 1fr;
        }
      }
      .col h4 {
        margin: 4px 0;
      }
      .item {
        font-size: 13px;
        padding: 2px 0;
        border-bottom: 1px dashed var(--divider-color);
      }
      .item.sup {
        opacity: 0.6;
      }
      input.dur {
        width: 80px;
        text-align: right;
      }
    `,
  ];

  @property({ attribute: false }) done!: () => void;
  @state() private preview: Preview | null = null;
  @state() private answers: Record<string, string> = {};
  @state() private busy = false;

  connectedCallback(): void {
    super.connectedCallback();
    void this.refresh(true);
  }

  private parsedAnswers(): Record<string, number> | null {
    const out: Record<string, number> = {};
    for (const [id, text] of Object.entries(this.answers)) {
      const v = parseDur(text);
      if (v === null || Number.isNaN(v) || v < 0) {
        this.api.ui.toast("Ungültige Restzeit, z. B. 1:30 oder 90 min", { kind: "error" });
        return null;
      }
      out[id] = v;
    }
    return out;
  }

  private async refresh(initial = false): Promise<void> {
    const remaining = initial ? {} : this.parsedAnswers();
    if (remaining === null) return;
    const res = await this.api.ws<Preview>("rollover_preview", { remaining });
    if (!res) return this.done();
    this.preview = res;
    if (initial) {
      this.answers = Object.fromEntries(res.affected.map((a) => [a.task_id, durText(a.remaining_min)]));
    }
  }

  private async apply(): Promise<void> {
    const remaining = this.parsedAnswers();
    if (remaining === null) return;
    this.busy = true;
    const res = await this.api.op("rollover_apply", { remaining });
    this.busy = false;
    if (res) {
      this.api.ui.toast("Nachgerückt", {
        action: { label: "Rückgängig", run: () => void this.api.op("rollover_undo") },
        timeout: 12000,
      });
    }
    this.done();
  }

  private label(key: string): string {
    if (key === "unscheduled") return "Nicht eingeplant";
    if (key === "reschedule") return "Neu terminieren";
    const b = this.blockById(key);
    return b ? `${b.date}${b.start_time ? " " + b.start_time : ""}${b.note ? " – " + b.note : ""}` : key;
  }

  private column(title: string, layout: Record<string, LayoutEntry[]>, key: string) {
    const items = layout[key] ?? [];
    return html`<div class="col">
      <h4>${title}</h4>
      ${items.length
        ? items.map((e) => html`<div class="item ${e.superseded ? "sup" : ""}">${e.fixed ? "📌 " : ""}${e.title} – ${fmtDur(e.planned_min)}${e.superseded ? " (nachgerückt)" : ""}</div>`)
        : html`<div class="muted small">leer</div>`}
    </div>`;
  }

  render() {
    const p = this.preview;
    const changedKeys = p
      ? Object.keys(p.after).filter((k) => JSON.stringify(p.before[k]?.map((e) => [e.task_id, e.planned_min, e.superseded])) !== JSON.stringify(p.after[k]?.map((e) => [e.task_id, e.planned_min, e.superseded])))
      : [];
    return html`<div class="backdrop">
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>Nachrücken</h2>
        ${!p
          ? html`<div class="muted">Lade …</div>`
          : html`
              <div class="muted small">
                Unerledigtes aus vergangenen und abgeschlossenen Blöcken wird vor die noch offenen Einträge gestellt und ab dem nächsten
                offenen Block neu verteilt. Fixierte Einträge und reservierte Blöcke bleiben unberührt.
              </div>
              ${p.affected.length
                ? html`<h3>Restzeit der betroffenen Aufgaben</h3>
                    ${p.affected.map(
                      (a) => html`<div class="row" style="margin:3px 0">
                        <span class="grow">${a.title}</span>
                        <input
                          class="dur"
                          .value=${this.answers[a.task_id] ?? ""}
                          @input=${(e: any) => (this.answers = { ...this.answers, [a.task_id]: e.target.value })}
                          title="Restzeit – aktualisiert die Restschätzung der Aufgabe"
                        />
                      </div>`,
                    )}
                    <div class="row"><button @click=${() => this.refresh()}>Vorschau aktualisieren</button></div>`
                : html`<div class="muted" style="margin:8px 0">Es gibt keine unerledigten Einträge in vergangenen Blöcken. Offene Einträge werden trotzdem neu verteilt.</div>`}
              ${p.warnings.length
                ? html`<div class="warning-box">
                    ${p.warnings.map((w) => html`<div>⚠ „${w.task_title}“ (fixiert${w.date ? " am " + w.date : ""}): Voraussetzung „${w.prerequisite_title}“ würde hinter den Termin rutschen.</div>`)}
                  </div>`
                : nothing}
              ${p.removed.length ? html`<div class="muted small">${p.removed.length} Eintrag/Einträge erledigter Aufgaben werden entfernt.</div>` : nothing}
              <h3>Plan vorher und nachher</h3>
              ${changedKeys.length
                ? changedKeys.map(
                    (k) => html`<div class="card"><b>${this.label(k)}</b>
                      <div class="cols">${this.column("Vorher", p.before, k)}${this.column("Nachher", p.after, k)}</div></div>`,
                  )
                : html`<div class="muted">Der Plan ändert sich nicht.</div>`}
              <div class="row" style="justify-content:flex-end;margin-top:12px">
                <button @click=${() => this.done()}>Abbrechen</button>
                <button class="primary" ?disabled=${this.busy} @click=${() => this.apply()}>Nachrücken anwenden</button>
              </div>
            `}
      </div>
    </div>`;
  }
}
customElements.define("up-rollover-dialog", UpRolloverDialog);
