import { css, html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { UpBase } from "./base";
import { fmtDur, fmtSigned } from "./format";

interface Stat {
  count: number;
  median: number | null;
  stdev: number | null;
  min: number | null;
  max: number | null;
  title?: string;
}

interface Evaluation {
  overall: Stat;
  by_category: Record<string, Stat>;
  by_project: Record<string, Stat>;
  trend: { task_id: string; title: string; completed_at: string; factor: number; rolling_median: number }[];
  projects: {
    project_id: string;
    title: string;
    remaining_min: number;
    forecast_min: number;
    forecast_blocks: number;
    remaining_blocks: number;
  }[];
  blocks: { block_id: string; date: string; closed: boolean; planned_min: number; booked_min: number; rolled_over: number }[];
  unestimated: { task_id: string; title: string; project_id: string; state: string }[];
}

const nf = (n: number | null | undefined, d = 2) => (n === null || n === undefined ? "–" : n.toFixed(d).replace(".", ","));

function factorText(f: number | null): string {
  if (f === null) return "–";
  const pct = Math.round((f - 1) * 100);
  return `×${nf(f)} (${pct >= 0 ? "+" : "−"}${Math.abs(pct)} %)`;
}

export class UpViewEvaluation extends UpBase {
  static styles = [
    ...UpBase.styles,
    css`
      svg {
        width: 100%;
        height: 160px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }
    `,
  ];

  @state() private ev: Evaluation | null = null;
  private lastRev = -1;

  willUpdate(): void {
    if (this.st && this.st.rev !== this.lastRev) {
      this.lastRev = this.st.rev;
      void this.api.ws<Evaluation>("evaluation").then((r) => r && (this.ev = r));
    }
  }

  private statRow(label: string, s: Stat) {
    return html`<tr>
      <td>${label}</td>
      <td class="num">${factorText(s.median)}</td>
      <td class="num">${s.count}</td>
      <td class="num">${s.stdev === null ? "–" : `± ${nf(s.stdev)}`}</td>
      <td class="num">${s.min === null ? "–" : `${nf(s.min)} – ${nf(s.max)}`}</td>
    </tr>`;
  }

  private chart(ev: Evaluation) {
    const pts = ev.trend;
    if (pts.length < 2) return html`<div class="muted">Für den Verlauf werden mindestens zwei erledigte, geschätzte Aufgaben benötigt.</div>`;
    const w = 600;
    const h = 150;
    const max = Math.max(2, ...pts.map((p) => p.factor)) * 1.05;
    const x = (i: number) => 20 + (i * (w - 40)) / (pts.length - 1);
    const y = (v: number) => h - 15 - (v / max) * (h - 30);
    const line = (key: "factor" | "rolling_median") => pts.map((p, i) => `${x(i)},${y(p[key])}`).join(" ");
    return html`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Verlauf des Schätzfaktors">
      <line x1="20" x2=${w - 20} y1=${y(1)} y2=${y(1)} stroke="currentColor" stroke-dasharray="4" opacity="0.4" />
      <text x="22" y=${y(1) - 3} font-size="10" fill="currentColor" opacity="0.7">×1,0 (genau geschätzt)</text>
      <polyline points=${line("factor")} fill="none" stroke="var(--secondary-text-color)" stroke-width="1.5" />
      ${pts.map((p, i) => html`<circle cx=${x(i)} cy=${y(p.factor)} r="3" fill="var(--secondary-text-color)"><title>${p.title}: ×${nf(p.factor)}</title></circle>`)}
      <polyline points=${line("rolling_median")} fill="none" stroke="var(--primary-color)" stroke-width="2.5" />
    </svg>
    <div class="muted small">Grau: Faktor je Aufgabe. Blau: gleitender Median über 5 Aufgaben. Sinkt die blaue Linie Richtung ×1,0, werden die Schätzungen besser.</div>`;
  }

  render() {
    const ev = this.ev;
    const projects = this.st.tasks.filter((t) => t.parent_id === null && t.status !== "discarded");
    return html`
      <h2>Auswertung</h2>
      <div class="card">
        <h3 style="margin-top:0">Soll-Ist je Projekt</h3>
        <div class="scroll-x"><table>
          <tr><th>Projekt</th><th class="num">Geschätzt</th><th class="num">Gebucht</th><th class="num">davon eigene</th><th class="num">Rest</th><th class="num">Prognose</th><th class="num">Abweichung</th></tr>
          ${projects.map(
            (p) => html`<tr>
              <td>${p.title}</td>
              <td class="num">${p.summary.estimate_min === null ? "–" : fmtDur(p.summary.estimate_min)}${p.summary.rough_min !== null ? html`<div class="muted small">Grob ${fmtDur(p.summary.rough_min)}</div>` : nothing}</td>
              <td class="num">${fmtDur(p.summary.booked_min)}</td>
              <td class="num">${fmtDur(p.summary.booked_own_min)}</td>
              <td class="num">${fmtDur(p.summary.remaining_min)}</td>
              <td class="num">${fmtDur(p.summary.forecast_min)}</td>
              <td class="num" style="color:${(p.summary.deviation_min ?? 0) > 0 ? "var(--error-color)" : "inherit"}">${fmtSigned(p.summary.deviation_min)}</td>
            </tr>`,
          )}
        </table></div>
        <div class="muted small">Aufgaben ohne Schätzung fließen nicht in den Vergleich ein. Aufwand = eigene Zeit + Helferstunden.</div>
      </div>
      ${ev
        ? html`
            <div class="card">
              <h3 style="margin-top:0">Schätzfaktor (Aufwand ÷ ursprüngliche Schätzung)</h3>
              <div class="scroll-x"><table>
                <tr><th></th><th class="num">Median</th><th class="num">Aufgaben</th><th class="num">Streuung</th><th class="num">Spanne</th></tr>
                ${this.statRow("Insgesamt", ev.overall)}
                ${Object.entries(ev.by_category).map(([k, s]) => this.statRow(`Gewerk: ${k}`, s))}
                ${Object.entries(ev.by_project).map(([, s]) => this.statRow(`Projekt: ${s.title}`, s))}
              </table></div>
              <div class="muted small">Faktor 1,6 bedeutet: 60 Prozent länger als geschätzt.</div>
            </div>
            <div class="card"><h3 style="margin-top:0">Verlauf</h3>${this.chart(ev)}</div>
            <div class="card">
              <h3 style="margin-top:0">Hochrechnung der Restarbeit</h3>
              <div class="scroll-x"><table>
                <tr><th>Projekt</th><th class="num">Rest laut Schätzung</th><th class="num">Hochgerechnet</th><th class="num">in Blöcken</th></tr>
                ${ev.projects.map(
                  (p) => html`<tr><td>${p.title}</td><td class="num">${fmtDur(p.remaining_min)}<div class="muted small">${nf(p.remaining_blocks, 1)} Blöcke</div></td><td class="num"><b>${fmtDur(p.forecast_min)}</b></td><td class="num"><b>${nf(p.forecast_blocks, 1)}</b></td></tr>`,
                )}
              </table></div>
              <div class="muted small">Rest × Median-Faktor des Gewerks (bei weniger als 5 erledigten Aufgaben im Gewerk: Gesamtfaktor). Block = ${fmtDur(this.st.settings.default_capacity_min)}.</div>
            </div>
            <div class="card">
              <h3 style="margin-top:0">Geplant gegen gebucht je Block</h3>
              ${ev.blocks.length
                ? html`<div class="scroll-x"><table>
                    <tr><th>Block</th><th class="num">Geplant</th><th class="num">Gebucht</th><th class="num">Nachgerückt</th></tr>
                    ${ev.blocks.map(
                      (b) => html`<tr><td>${b.date}${b.closed ? " ✓" : ""}</td><td class="num">${fmtDur(b.planned_min)}</td><td class="num">${fmtDur(b.booked_min)}</td><td class="num">${b.rolled_over}</td></tr>`,
                    )}
                  </table></div>`
                : html`<div class="muted">Noch keine Blöcke mit Einträgen.</div>`}
            </div>
            <div class="card">
              <h3 style="margin-top:0">Ohne Schätzung (nicht in der Auswertung)</h3>
              ${ev.unestimated.length
                ? ev.unestimated.map((u) => html`<div>${u.title} <span class="muted small">${this.ttl(u.project_id)}${u.state === "done" ? " · erledigt" : ""}</span></div>`)
                : html`<div class="muted">Alle Aufgaben sind geschätzt.</div>`}
            </div>
          `
        : html`<div class="card empty">Lade Auswertung …</div>`}
    `;
  }
}
customElements.define("up-view-evaluation", UpViewEvaluation);
