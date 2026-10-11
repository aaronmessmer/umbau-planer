import { css, html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { UpBase } from "./base";
import { addDays, fmtDay, fmtDur, fmtTime, fromLocalInput, mondayOf, parseDate, toLocalInput } from "./format";
import type { State, TimeEntry } from "./types";

interface TimesData {
  entries: TimeEntry[];
  days: Record<string, { own: number; helper: number }>;
  weeks: Record<string, { own: number; helper: number }>;
}

export class UpViewTimes extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      .entry {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid var(--divider-color);
        flex-wrap: wrap;
      }
    `,
  ];

  @state() private week = "";
  @state() private data: TimesData | null = null;
  private lastRev = -1;
  private lastWeek = "";

  private get monday(): string {
    return this.week || mondayOf(this.st.today);
  }

  willUpdate(): void {
    if (this.st && (this.st.rev !== this.lastRev || this.monday !== this.lastWeek)) {
      this.lastRev = this.st.rev;
      this.lastWeek = this.monday;
      void this.load();
    }
  }

  private async load(): Promise<void> {
    const start = this.monday;
    const res = await this.api.ws<TimesData>("time_entries", { start, end: addDays(start, 6) });
    if (res) this.data = res;
  }

  private async editEntry(e: TimeEntry | null): Promise<void> {
    const tz = this.st.timezone;
    const res = await this.api.ui.form({
      title: e ? "Buchung bearbeiten" : "Buchung anlegen",
      fields: [
        { key: "task", label: "Aufgabe", type: "task", required: true },
        { key: "start", label: "Beginn", type: "datetime", required: true },
        { key: "end", label: "Ende (leer = läuft)", type: "datetime" },
        { key: "helper", label: "Helferstunden", type: "duration", hint: "Zeit von Helfern, zusätzlich zur eigenen Zeit" },
        { key: "note", label: "Notiz", type: "text" },
      ],
      values: e
        ? {
            task: e.task_id,
            start: toLocalInput(e.start, tz),
            end: e.end ? toLocalInput(e.end, tz) : "",
            helper: e.helper_min || null,
            note: e.note,
          }
        : { start: toLocalInput(new Date().toISOString(), tz), end: "" },
      actions: e ? [{ name: "delete", label: "Löschen", danger: true }] : [],
      submitLabel: "Speichern",
    });
    if (!res) return;
    if (res.action === "delete" && e) {
      const ok = await this.api.ui.confirm("Buchung löschen", "Diese Zeitbuchung wird gelöscht.", true, "Löschen");
      if (ok) await this.api.op("time_entry_delete", { entry_id: e.id });
      return;
    }
    const v = res.values;
    const start = fromLocalInput(v.start, tz);
    const end = v.end ? fromLocalInput(v.end, tz) : null;
    if (e) {
      await this.api.op("time_entry_update", {
        entry_id: e.id,
        fields: { task_id: v.task, start, end, helper_min: v.helper ?? 0, note: v.note },
      });
    } else {
      await this.api.op("time_entry_add", { task_id: v.task, start, end, helper_min: v.helper ?? 0, note: v.note });
    }
  }

  render() {
    const start = this.monday;
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const data = this.data;
    const weekOwn = days.reduce((a, d) => a + (data?.days[d]?.own ?? 0), 0);
    const weekHelper = days.reduce((a, d) => a + (data?.days[d]?.helper ?? 0), 0);
    const perProject = new Map<string, number>();
    for (const e of data?.entries ?? []) {
      const p = this.task(e.task_id)?.project_id ?? "";
      perProject.set(p, (perProject.get(p) ?? 0) + (e.minutes ?? 0));
    }
    const first = parseDate(start);
    return html`
      <div class="row" style="margin-bottom:8px">
        <h2 style="margin:0">Zeiten</h2>
        <button @click=${() => (this.week = addDays(start, -7))}>‹</button>
        <b>Woche ab ${first.getDate()}.${first.getMonth() + 1}.</b>
        <button @click=${() => (this.week = "")}>Diese</button>
        <button @click=${() => (this.week = addDays(start, 7))}>›</button>
        <span class="right"></span>
        ${this.canEdit ? html`<button @click=${() => this.editEntry(null)}>+ Buchung</button>` : nothing}
      </div>
      <div class="card">
        <div class="row">
          <b>Woche gesamt:</b> ${fmtDur(weekOwn)} eigene Zeit
          ${weekHelper ? html`<span class="muted">+ ${fmtDur(weekHelper)} Helfer = ${fmtDur(weekOwn + weekHelper)} Aufwand</span>` : nothing}
        </div>
        <div class="row" style="margin-top:4px">
          ${[...perProject.entries()].map(([p, m]) => html`<span class="chip">${this.ttl(p)}: ${fmtDur(m)}</span>`)}
        </div>
      </div>
      ${days.map((d) => {
        const entries = (data?.entries ?? []).filter((e) => e.day === d).sort((a, b) => a.start.localeCompare(b.start));
        const tot = data?.days[d];
        return html`<div class="card">
          <div class="row"><b>${fmtDay(d, this.st.today)}</b><span class="right muted">${tot ? fmtDur(tot.own) : "–"}${tot?.helper ? ` + ${fmtDur(tot.helper)} Helfer` : ""}</span></div>
          ${entries.map(
            (e) => html`<div class="entry">
              <span class="grow"><b>${e.task_title}</b> <span class="muted small">${this.projectTitle(e.task_id)}</span>${e.note ? html`<div class="muted small">${e.note}</div>` : nothing}</span>
              <span>${fmtTime(e.start, this.st.timezone)} – ${e.end ? fmtTime(e.end, this.st.timezone) : "läuft"}</span>
              <span class="chip">${fmtDur(e.minutes ?? 0)}</span>
              ${e.helper_min ? html`<span class="chip">+${fmtDur(e.helper_min)} Helfer</span>` : nothing}
              ${this.canEdit ? html`<button class="icon" title="Bearbeiten" @click=${() => this.editEntry(e)}>✎</button>` : nothing}
            </div>`,
          )}
          ${!entries.length ? html`<div class="muted small">Keine Buchungen.</div>` : nothing}
        </div>`;
      })}
    `;
  }
}
customElements.define("up-view-times", UpViewTimes);
export type { State };
