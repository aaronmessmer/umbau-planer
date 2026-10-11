import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { UpBase } from "./base";
import { fmtDur, parseDur } from "./format";
import type { Entry } from "./types";

const WARN_TEXT: Record<string, string> = {
  not_planned: "ist nicht eingeplant",
  fixed_after: "liegt erst nach diesem Termin",
  order: "liegt im Plan erst danach",
};

/** One plan entry (task in a block or in a waiting list). */
export class UpEntry extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      :host {
        display: block;
      }
      .entry {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 4px 8px;
        margin: 4px 0;
        background: var(--card-background-color, #fff);
      }
      .entry.fixed {
        border-left: 4px solid var(--primary-color);
      }
      .entry.superseded {
        opacity: 0.6;
      }
      .entry .t {
        flex: 1 1 120px;
        min-width: 90px;
        font-weight: 500;
        cursor: default;
      }
      input.dur {
        width: 62px;
        text-align: right;
      }
      .more {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed var(--divider-color);
      }
    `,
  ];

  @property({ attribute: false }) entry!: Entry;
  @property({ type: Boolean }) readonly = false;
  @state() private more = false;

  private async patch(fields: Record<string, any>): Promise<void> {
    await this.api.op("entry_update", { entry_id: this.entry.id, fields });
  }

  private async moveTo(): Promise<void> {
    const e = this.entry;
    const blocks = this.st.blocks.filter((b) => !b.past && b.id !== e.block_id);
    const res = await this.api.ui.form({
      title: `„${this.ttl(e.task_id)}“ verschieben`,
      fields: [
        {
          key: "to",
          label: "Ziel",
          type: "select",
          options: [
            ...blocks.map((b) => ({
              value: b.id,
              label: `${b.date}${b.start_time ? " " + b.start_time : ""} (${fmtDur(b.fill_min)} / ${fmtDur(b.capacity_min)})`,
            })),
            ...(e.block_id ? [{ value: "unscheduled", label: "Liste „nicht eingeplant“" }] : []),
          ],
        },
      ],
      values: { to: blocks[0]?.id ?? "unscheduled" },
      submitLabel: "Verschieben",
    });
    if (!res) return;
    const to = res.values.to as string;
    if (to === "unscheduled") await this.api.op("entry_move", { entry_id: e.id, block_id: null, list: "unscheduled" });
    else await this.api.op("entry_move", { entry_id: e.id, block_id: to, index: null });
  }

  private async removeEntry(): Promise<void> {
    await this.api.op("entry_delete", { entry_id: this.entry.id });
  }

  render() {
    const e = this.entry;
    const t = this.task(e.task_id);
    if (!t) return nothing;
    const edit = this.canEdit && !this.readonly && !e.superseded;
    const warnings = this.st.warnings.filter((w) => w.entry_id === e.id);
    const block = this.blockById(e.block_id);
    const past = !!block?.past;
    const blocked = !t.ready && t.reasons.length && t.status !== "done" && t.status !== "discarded";
    return html`<div class="entry ${e.fixed ? "fixed" : ""} ${e.superseded ? "superseded" : ""}">
      <div class="row">
        ${edit && block
          ? html`<button
              class="icon"
              title=${e.fixed ? "Fixierung lösen" : "Fixieren (wird beim Nachrücken nie verschoben)"}
              @click=${() => this.patch({ fixed: !e.fixed })}
            >
              ${e.fixed ? "📌" : "📍"}
            </button>`
          : e.fixed
            ? html`<span title="fixiert">📌</span>`
            : nothing}
        <span class="t" title=${t.title}>${t.title}</span>
        <input
          class="inline dur"
          .value=${`${Math.floor(e.planned_min / 60)}:${String(e.planned_min % 60).padStart(2, "0")}`}
          ?disabled=${!edit}
          title="Geplante Dauer"
          @change=${(ev: any) => {
            const v = parseDur(ev.target.value);
            if (v === null || Number.isNaN(v) || v <= 0) {
              this.api.ui.toast("Ungültige Dauer", { kind: "error" });
              ev.target.value = fmtDur(e.planned_min);
              return;
            }
            this.patch({ planned_min: v });
          }}
        />
        ${past && e.booked_min !== undefined
          ? html`<span class="chip ${e.booked_min >= e.planned_min ? "ok" : ""}" title="An diesem Tag gebucht">gebucht ${fmtDur(e.booked_min)}</span>`
          : nothing}
        ${!e.superseded && !past && this.canEdit
          ? html`<button class="icon" title="Uhr starten" @click=${() => this.startTimer(e.task_id)}>▶</button>`
          : nothing}
        <button class="icon" title="Mehr" @click=${() => (this.more = !this.more)}>${this.more ? "▴" : "⋯"}</button>
      </div>
      <div class="row" style="gap:4px;margin-top:2px">
        ${e.superseded ? html`<span class="chip" title="Dieser Eintrag wurde nachgerückt">nachgerückt</span>` : nothing}
        ${e.fixed_time ? html`<span class="chip">ab ${e.fixed_time}</span>` : nothing}
        ${e.with_whom ? html`<span class="chip">mit ${e.with_whom}</span>` : nothing}
        <span class="chip small">${this.projectTitle(e.task_id)}</span>
        ${blocked ? html`<span class="chip warn" title=${this.reasonText(t)}>🔒 ${this.reasonText(t)}</span>` : nothing}
        ${t.status === "done" ? html`<span class="chip ok">erledigt</span>` : nothing}
      </div>
      ${warnings.map(
        (w) => html`<div class="warning-box">
          ⚠ Voraussetzung „${w.prerequisite_title}“ ${WARN_TEXT[w.reason] ?? ""}${w.fixed ? " (fixierter Termin)" : ""}.
        </div>`,
      )}
      ${this.more
        ? html`<div class="more">
            ${block && !e.superseded
              ? html`<div class="row">
                  <label class="small muted">Uhrzeit</label>
                  <input type="time" .value=${e.fixed_time ?? ""} ?disabled=${!edit || !e.fixed} @change=${(ev: any) => this.patch({ fixed_time: ev.target.value || null })} />
                  <label class="small muted">Mit wem</label>
                  <input .value=${e.with_whom ?? ""} ?disabled=${!edit} placeholder="z. B. Papa" @change=${(ev: any) => this.patch({ with_whom: ev.target.value })} />
                </div>
                ${!e.fixed && edit ? html`<div class="muted small">Uhrzeit und „mit wem“ gelten für fixierte Einträge.</div>` : nothing}`
              : nothing}
            ${edit
              ? html`<div class="row" style="margin-top:6px">
                  <button @click=${() => this.moveTo()}>${block ? "In anderen Block …" : "Einplanen in …"}</button>
                  <button class="danger" @click=${() => this.removeEntry()}>Entfernen</button>
                </div>`
              : nothing}
          </div>`
        : nothing}
    </div>`;
  }
}
customElements.define("up-entry", UpEntry);
