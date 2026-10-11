import { html, nothing } from "lit";
import { UpBase } from "./base";
import { fmtDur } from "./format";
import "./prio-chips";

/** "Jetzt möglich" (D-10) and "Uneinig" (P-8) share the same list layout. */
class UpTaskList extends UpBase {
  protected ids(): string[] {
    return [];
  }
  protected heading(): string {
    return "";
  }
  protected emptyText(): string {
    return "";
  }

  private async plan(id: string): Promise<void> {
    const t = this.task(id)!;
    const blocks = this.st.blocks.filter((b) => !b.past);
    if (!blocks.length) {
      this.api.ui.toast("Es gibt keinen offenen Arbeitsblock.", { kind: "warn" });
      return;
    }
    const res = await this.api.ui.form({
      title: `„${t.title}“ einplanen`,
      fields: [
        {
          key: "block",
          label: "Arbeitsblock",
          type: "select",
          options: blocks.map((b) => ({
            value: b.id,
            label: `${b.date}${b.start_time ? " " + b.start_time : ""} (${fmtDur(b.fill_min)} / ${fmtDur(b.capacity_min)})`,
          })),
        },
        { key: "min", label: "Geplante Dauer", type: "duration", required: true },
      ],
      values: { block: blocks[0].id, min: Math.max(30, t.summary.remaining_min - t.planned_min) },
      submitLabel: "Einplanen",
    });
    if (res) await this.api.op("entry_add", { task_id: id, block_id: res.values.block, planned_min: res.values.min });
  }

  render() {
    const ids = this.ids();
    return html`<h2>${this.heading()}</h2>
      ${ids.length
        ? ids.map((id) => {
            const t = this.task(id)!;
            return html`<div class="card">
              <div class="row">
                <b class="grow">${t.title}</b>
                ${this.canEdit ? html`<button @click=${() => this.startTimer(id)}>▶ Start</button>` : nothing}
                ${this.canEdit && !t.has_children ? html`<button @click=${() => this.plan(id)}>Einplanen</button>` : nothing}
              </div>
              <div class="muted small">${this.projectTitle(id)}${t.category ? ` · ${t.category}` : ""}</div>
              <div class="row" style="margin-top:4px">
                <up-prio-chips .st=${this.st} .api=${this.api} .item=${t}></up-prio-chips>
                <span class="chip">Rest ${fmtDur(t.summary.remaining_min)}</span>
                ${t.summary.unestimated ? html`<span class="chip">ohne Schätzung</span>` : html`<span class="chip">geschätzt ${fmtDur(t.summary.estimate_min)}</span>`}
                ${t.planned_min ? html`<span class="chip">eingeplant ${fmtDur(t.planned_min)}</span>` : nothing}
                ${t.priority.disagree ? html`<span class="chip err">Abstand ${t.priority.distance}</span>` : nothing}
              </div>
              ${t.notes ? html`<div class="muted small" style="margin-top:4px">${t.notes}</div>` : nothing}
            </div>`;
          })
        : html`<div class="card empty">${this.emptyText()}</div>`}`;
  }
}

export class UpViewReady extends UpTaskList {
  protected ids() {
    return this.st.ready_ids;
  }
  protected heading() {
    return "Jetzt möglich";
  }
  protected emptyText() {
    return "Keine Aufgabe ist gerade bereit.";
  }
}
customElements.define("up-view-ready", UpViewReady);

export class UpViewDisagree extends UpTaskList {
  protected ids() {
    return this.st.disagree_ids;
  }
  protected heading() {
    return "Uneinig";
  }
  protected emptyText() {
    return "Ihr seid euch bei allen bewerteten Aufgaben einig.";
  }
}
customElements.define("up-view-disagree", UpViewDisagree);
