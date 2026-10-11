import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { UpBase } from "./base";
import type { Task } from "./types";

/** Own, the other person's and the combined priority of a task (P-2, P-3, P-7). */
export class UpPrioChips extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      :host {
        display: inline-block;
      }
      .picker {
        display: flex;
        gap: 3px;
        margin-top: 4px;
        flex-wrap: wrap;
      }
      .picker button {
        min-width: 30px;
        padding: 2px 6px;
        min-height: 28px;
      }
      .picker button.sel {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      button.chipbtn {
        padding: 0 8px;
        min-height: 24px;
        border-radius: 999px;
        font-size: 12px;
      }
    `,
  ];

  @property({ attribute: false }) item!: Task;
  @property({ type: Boolean }) compact = false;
  @state() private picking = false;

  private async set(level: number | null): Promise<void> {
    this.picking = false;
    await this.api.op("priority_set", { task_id: this.item.id, level });
  }

  render() {
    const t = this.item;
    const me = this.st.me.person_id;
    const names = this.levels;
    return html`
      <span class="row" style="gap:4px">
        ${this.persons.map((p) => {
          const info = t.priority.persons[p.id];
          const mine = p.id === me;
          const label = info?.level ? `${p.name.slice(0, 1)} ${info.level}` : `${p.name.slice(0, 1)} –`;
          const title = `${p.name}: ${info?.level ? `${info.level} ${names[info.level - 1] ?? ""}` : "nicht bewertet"}${
            info?.inherited ? " (geerbt)" : ""
          }${mine ? " – antippen zum Ändern" : ""}`;
          return mine
            ? html`<button
                class="chip chipbtn ${info?.inherited ? "inherited" : ""}"
                title=${title}
                @click=${() => (this.picking = !this.picking)}
              >
                ${label}
              </button>`
            : html`<span class="chip ${info?.inherited ? "inherited" : ""}" title=${title}>${label}</span>`;
        })}
        ${t.priority.unrated
          ? html`<span class="chip warn" title="Von niemandem bewertet">unbewertet</span>`
          : html`<span
              class="chip ${t.priority.disagree ? "err" : "ok"}"
              title="Gemeinsame Priorität${t.priority.disagree ? " – uneinig" : ""}"
              >Ø ${String(t.priority.combined_level).replace(".", ",")}${t.priority.disagree ? " ≠" : ""}</span
            >`}
      </span>
      ${this.picking
        ? html`<div class="picker">
            ${names.map(
              (n, i) => html`<button
                class=${t.priorities[me ?? ""] === i + 1 ? "sel" : ""}
                title=${n}
                @click=${() => this.set(i + 1)}
              >
                ${i + 1}
              </button>`,
            )}
            <button title="Bewertung entfernen" @click=${() => this.set(null)}>–</button>
          </div>`
        : nothing}
    `;
  }
}
customElements.define("up-prio-chips", UpPrioChips);
