import { css, html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { UpBase } from "./base";
import { MIME_BLOCK } from "./block";
import "./block";
import { addDays, fmtDay, fmtHours, isoDate, mondayOf, parseDate } from "./format";
import type { Block } from "./types";

type Mode = "list" | "week" | "month";
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export class UpViewCalendar extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      .week {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 8px;
      }
      .day {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        padding: 6px;
        min-height: 80px;
      }
      .day.today {
        border-color: var(--primary-color);
        border-width: 2px;
      }
      .month {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 3px;
      }
      .cell {
        border: 1px solid var(--divider-color);
        border-radius: 6px;
        min-height: 70px;
        padding: 3px;
        font-size: 12px;
        overflow: hidden;
        cursor: pointer;
      }
      .cell.other {
        opacity: 0.5;
      }
      .cell.today {
        border-color: var(--primary-color);
        border-width: 2px;
      }
      .mb {
        display: block;
        margin-top: 2px;
        padding: 1px 4px;
        border-radius: 4px;
        background: color-mix(in srgb, var(--primary-color) 22%, transparent);
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: grab;
      }
      .mb.over {
        background: color-mix(in srgb, var(--error-color) 30%, transparent);
      }
      .mb.res {
        background: color-mix(in srgb, var(--warning-color, #ffa600) 35%, transparent);
      }
      .wd {
        text-align: center;
        font-size: 12px;
        color: var(--secondary-text-color);
      }
    `,
  ];

  @state() private mode: Mode = (localStorage.getItem("umbau_planer_cal_mode") as Mode) || "list";
  @state() private anchor = "";
  @state() private showPast = false;
  @state() private dropDay: string | null = null;

  private get cursor(): string {
    return this.anchor || this.st.today;
  }

  private setMode(m: Mode): void {
    this.mode = m;
    try {
      localStorage.setItem("umbau_planer_cal_mode", m);
    } catch {
      /* ignore */
    }
  }

  private shift(dir: number): void {
    const d = parseDate(this.cursor);
    if (this.mode === "week") d.setDate(d.getDate() + 7 * dir);
    else {
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
    }
    this.anchor = isoDate(d);
  }

  private async newBlock(day?: string): Promise<void> {
    const res = await this.api.ui.form({
      title: "Neuer Arbeitsblock",
      fields: [
        { key: "date", label: "Datum", type: "date", required: true },
        { key: "start_time", label: "Startzeit (optional)", type: "time" },
        { key: "cap", label: "Kapazität", type: "duration", required: true },
        { key: "note", label: "Notiz (z. B. Ort)", type: "text" },
        { key: "reserved_for", label: "Reserviert für (optional)", type: "task", allowEmpty: true },
      ],
      values: { date: day ?? this.st.today, cap: this.st.settings.default_capacity_min },
      submitLabel: "Anlegen",
    });
    if (!res) return;
    const v = res.values;
    await this.api.op("block_create", {
      date: v.date,
      start_time: v.start_time,
      capacity_min: v.cap,
      note: v.note,
      reserved_for: v.reserved_for,
    });
  }

  private async series(): Promise<void> {
    const res = await this.api.ui.form({
      title: "Blöcke als Serie anlegen",
      fields: [
        { key: "start", label: "Ab Datum", type: "date", required: true },
        {
          key: "weekdays",
          label: "Wochentage",
          type: "checks",
          options: WEEKDAYS.map((w, i) => ({ value: i, label: w })),
        },
        { key: "count", label: "Anzahl Blöcke", type: "number", hint: "oder Enddatum" },
        { key: "until", label: "Bis Datum", type: "date" },
        { key: "start_time", label: "Startzeit (optional)", type: "time" },
        { key: "cap", label: "Kapazität", type: "duration" },
        { key: "note", label: "Notiz", type: "text" },
      ],
      values: { start: this.st.today, weekdays: [5, 6], count: 4, cap: this.st.settings.default_capacity_min },
      submitLabel: "Serie anlegen",
    });
    if (!res) return;
    const v = res.values;
    if (!v.weekdays.length) return this.api.ui.toast("Bitte mindestens einen Wochentag wählen.", { kind: "error" });
    const out = await this.api.op<{ ids: string[] }>("block_series", {
      start_date: v.start,
      weekdays: v.weekdays,
      count: v.until ? null : v.count,
      until: v.until,
      start_time: v.start_time,
      capacity_min: v.cap,
      note: v.note,
    });
    if (out) this.api.ui.toast(`${out.ids.length} Blöcke angelegt`);
  }

  private blocksOn(day: string): Block[] {
    return this.st.blocks.filter((b) => b.date === day);
  }

  private onDayDragOver(ev: DragEvent, day: string): void {
    if (!ev.dataTransfer?.types.includes(MIME_BLOCK)) return;
    ev.preventDefault();
    this.dropDay = day;
  }

  private async onDayDrop(ev: DragEvent, day: string): Promise<void> {
    this.dropDay = null;
    const id = ev.dataTransfer?.getData(MIME_BLOCK);
    if (!id) return;
    ev.preventDefault();
    const b = this.blockById(id);
    if (!b || b.date === day) return;
    await this.api.op("block_update", { block_id: id, fields: { date: day } });
  }

  private blockEl(b: Block, compact = false) {
    return html`<up-block .st=${this.st} .api=${this.api} .block=${b} .compact=${compact}></up-block>`;
  }

  private listMode() {
    const today = this.st.today;
    const groups = new Map<string, Block[]>();
    for (const b of this.st.blocks) {
      if (!this.showPast && b.past) continue;
      const g = groups.get(b.date) ?? [];
      g.push(b);
      groups.set(b.date, g);
    }
    const days = [...groups.keys()].sort();
    const resched = this.listEntries("reschedule");
    const unsched = this.listEntries("unscheduled");
    return html`
      ${resched.length
        ? html`<div class="card">
            <h3 style="margin-top:0">Neu terminieren</h3>
            <div class="muted small">Fixierte Einträge, die nicht fertig wurden. Von Hand neu einplanen.</div>
            ${resched.map((e) => html`<up-entry .st=${this.st} .api=${this.api} .entry=${e} draggable=${this.canEdit} @dragstart=${(ev: DragEvent) => ev.dataTransfer?.setData("application/x-up-entry", e.id)}></up-entry>`)}
          </div>`
        : nothing}
      ${unsched.length
        ? html`<div class="card">
            <h3 style="margin-top:0">Nicht eingeplant</h3>
            <div class="muted small">Passt in keinen angelegten Block. Lege Blöcke an und rücke nach.</div>
            ${unsched.map((e) => html`<up-entry .st=${this.st} .api=${this.api} .entry=${e} draggable=${this.canEdit} @dragstart=${(ev: DragEvent) => ev.dataTransfer?.setData("application/x-up-entry", e.id)}></up-entry>`)}
          </div>`
        : nothing}
      <label class="row" style="margin-bottom:6px"
        ><input type="checkbox" .checked=${this.showPast} @change=${(e: any) => (this.showPast = e.target.checked)} />Vergangene Blöcke zeigen</label
      >
      ${days.length
        ? days.map(
            (d) => html`<h3>${fmtDay(d, today)}</h3>
              ${groups.get(d)!.map((b) => this.blockEl(b))}`,
          )
        : html`<div class="card empty">Keine Blöcke. Lege einen Block oder eine Serie an.</div>`}
    `;
  }

  private weekMode() {
    const start = mondayOf(this.cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const first = parseDate(days[0]);
    return html`
      <h3 style="margin-top:0">Woche ab ${first.getDate()}.${first.getMonth() + 1}.${first.getFullYear()}</h3>
      <div class="week">
        ${days.map(
          (d, i) => html`<div
            class="day ${d === this.st.today ? "today" : ""} ${this.dropDay === d ? "drop-target" : ""}"
            @dragover=${(e: DragEvent) => this.onDayDragOver(e, d)}
            @dragleave=${() => (this.dropDay = null)}
            @drop=${(e: DragEvent) => this.onDayDrop(e, d)}
          >
            <div class="row"><b>${WEEKDAYS[i]} ${parseDate(d).getDate()}.${parseDate(d).getMonth() + 1}.</b>
              ${this.canEdit ? html`<button class="icon right" title="Block anlegen" @click=${() => this.newBlock(d)}>+</button>` : nothing}
            </div>
            ${this.blocksOn(d).map((b) => this.blockEl(b, true))}
          </div>`,
        )}
      </div>
    `;
  }

  private monthMode() {
    const cur = parseDate(this.cursor);
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const start = mondayOf(isoDate(first));
    const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    return html`
      <h3 style="margin-top:0">${MONTHS[first.getMonth()]} ${first.getFullYear()}</h3>
      <div class="month">
        ${WEEKDAYS.map((w) => html`<div class="wd">${w}</div>`)}
        ${cells.map((d) => {
          const dt = parseDate(d);
          return html`<div
            class="cell ${dt.getMonth() !== first.getMonth() ? "other" : ""} ${d === this.st.today ? "today" : ""} ${this.dropDay === d ? "drop-target" : ""}"
            @click=${() => {
              this.anchor = d;
              this.setMode("week");
            }}
            @dragover=${(e: DragEvent) => this.onDayDragOver(e, d)}
            @dragleave=${() => (this.dropDay = null)}
            @drop=${(e: DragEvent) => this.onDayDrop(e, d)}
          >
            ${dt.getDate()}
            ${this.blocksOn(d).map(
              (b) => html`<span
                class="mb ${b.overbooked ? "over" : ""} ${b.reserved_for ? "res" : ""}"
                draggable=${this.canEdit && !b.past ? "true" : "false"}
                title="${b.note} ${fmtHours(b.fill_min)} von ${fmtHours(b.capacity_min)}"
                @dragstart=${(e: DragEvent) => e.dataTransfer?.setData(MIME_BLOCK, b.id)}
                >${b.start_time ?? ""} ${fmtHours(b.fill_min)}/${fmtHours(b.capacity_min)}</span
              >`,
            )}
          </div>`;
        })}
      </div>
    `;
  }

  render() {
    return html`
      <div class="row" style="margin-bottom:8px">
        <h2 style="margin:0">Kalender</h2>
        ${(["list", "week", "month"] as Mode[]).map(
          (m) => html`<button class=${this.mode === m ? "primary" : ""} @click=${() => this.setMode(m)}>
            ${m === "list" ? "Liste" : m === "week" ? "Woche" : "Monat"}
          </button>`,
        )}
        ${this.mode !== "list"
          ? html`<button @click=${() => this.shift(-1)}>‹</button>
              <button @click=${() => (this.anchor = "")}>Heute</button>
              <button @click=${() => this.shift(1)}>›</button>`
          : nothing}
        <span class="right"></span>
        ${this.canEdit
          ? html`<button @click=${() => this.newBlock()}>+ Block</button><button @click=${() => this.series()}>Serie …</button>`
          : nothing}
      </div>
      ${this.mode === "list" ? this.listMode() : this.mode === "week" ? this.weekMode() : this.monthMode()}
    `;
  }
}
customElements.define("up-view-calendar", UpViewCalendar);
