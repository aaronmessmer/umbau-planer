import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { Api, type ToastOptions, type Ui } from "./api";
import { fmtDur } from "./format";
import "./form-dialog";
import "./rollover";
import { sharedStyles } from "./styles";
import type { FormResult, FormSpec, HomeAssistant, State } from "./types";
import "./view-calendar";
import "./view-evaluation";
import "./view-ready";
import "./view-settings";
import "./view-tasks";
import "./view-times";
import "./view-today";

type ViewKey = "today" | "tasks" | "ready" | "calendar" | "disagree" | "times" | "evaluation" | "settings";

const VIEWS: { key: ViewKey; label: string; icon: string }[] = [
  { key: "today", label: "Heute", icon: "☀" },
  { key: "tasks", label: "Aufgaben", icon: "☰" },
  { key: "ready", label: "Jetzt möglich", icon: "✔" },
  { key: "calendar", label: "Kalender", icon: "▦" },
  { key: "disagree", label: "Uneinig", icon: "≠" },
  { key: "times", label: "Zeiten", icon: "◷" },
  { key: "evaluation", label: "Auswertung", icon: "▤" },
  { key: "settings", label: "Einstellungen", icon: "⚙" },
];

interface Toast extends ToastOptions {
  id: number;
  message: string;
}

interface Pending {
  spec: FormSpec;
  resolve: (r: FormResult | null) => void;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export class UmbauPlanerPanel extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--primary-background-color);
      }
      header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 8px;
        height: 56px;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, #fff);
        position: sticky;
        top: 0;
        z-index: 5;
      }
      header h1 {
        font-size: 20px;
        font-weight: 400;
        margin: 0;
      }
      nav {
        display: flex;
        gap: 2px;
        overflow-x: auto;
        background: var(--card-background-color);
        border-bottom: 1px solid var(--divider-color);
        position: sticky;
        top: 56px;
        z-index: 4;
        scrollbar-width: thin;
      }
      nav button {
        border: none;
        border-bottom: 3px solid transparent;
        border-radius: 0;
        background: none;
        padding: 8px 12px;
        white-space: nowrap;
        min-height: 44px;
      }
      nav button.active {
        border-bottom-color: var(--primary-color);
        color: var(--primary-color);
        font-weight: 500;
      }
      main {
        flex: 1;
        padding: 12px;
        max-width: 1100px;
        width: 100%;
        margin: 0 auto;
      }
      .timerbar {
        position: sticky;
        bottom: 0;
        z-index: 6;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--card-background-color);
        border-top: 2px solid var(--primary-color);
        flex-wrap: wrap;
      }
      .timerbar.running {
        background: color-mix(in srgb, var(--success-color, #43a047) 18%, var(--card-background-color));
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--success-color, #43a047);
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        50% {
          opacity: 0.3;
        }
      }
      .clock {
        font-variant-numeric: tabular-nums;
        font-weight: 500;
        font-size: 18px;
      }
      .toasts {
        position: fixed;
        left: 8px;
        right: 8px;
        bottom: 70px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: center;
        z-index: 30;
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        background: #323232;
        color: #fff;
        padding: 10px 14px;
        border-radius: 8px;
        max-width: 560px;
        display: flex;
        gap: 12px;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
      .toast.error {
        background: #b3261e;
      }
      .toast.warn {
        background: #8a5a00;
      }
      .toast button {
        background: none;
        color: #ffd54f;
        border: none;
        font-weight: 500;
      }
      .badge {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        border-radius: 999px;
        font-size: 11px;
        padding: 0 6px;
        margin-left: 4px;
      }
      .offline {
        padding: 24px;
        text-align: center;
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route?: unknown;
  @property({ attribute: false }) panel?: unknown;

  @state() private st: State | null = null;
  @state() private view: ViewKey = (localStorage.getItem("umbau_planer_view") as ViewKey) || "today";
  @state() private toasts: Toast[] = [];
  @state() private forms: Pending[] = [];
  @state() private rollover = false;
  @state() private tick = 0;
  @state() private error = "";

  private api?: Api;
  private unsub?: () => void;
  private timers: number[] = [];
  private dirty = false;
  private toastId = 0;
  private refreshHandle?: number;

  private ui: Ui = {
    toast: (message, options = {}) => {
      const id = ++this.toastId;
      this.toasts = [...this.toasts, { id, message, ...options }];
      window.setTimeout(
        () => (this.toasts = this.toasts.filter((t) => t.id !== id)),
        options.timeout ?? (options.kind === "error" ? 7000 : 4000),
      );
    },
    form: (spec) =>
      new Promise((resolve) => {
        this.forms = [...this.forms, { spec, resolve }];
      }),
    confirm: async (title, message, danger = false, submitLabel = "OK") => {
      const r = await this.ui.form({ title, message, danger, submitLabel });
      return !!r;
    },
    rolloverFlow: async () => {
      this.rollover = true;
    },
    setDirty: (d) => (this.dirty = d),
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.timers.push(window.setInterval(() => (this.tick = Date.now()), 1000));
    this.timers.push(window.setInterval(() => void this.refresh(), 60000));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
    this.unsub?.();
    this.unsub = undefined;
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("hass") && this.hass) {
      if (!this.api) {
        this.api = new Api(this.hass, this.ui);
        void this.start();
      } else {
        this.api.hass = this.hass;
      }
    }
  }

  private async start(): Promise<void> {
    await this.refresh();
    try {
      this.unsub = await this.hass.connection.subscribeMessage(() => {
        window.clearTimeout(this.refreshHandle);
        this.refreshHandle = window.setTimeout(() => void this.refresh(), 80);
      }, { type: "umbau_planer/subscribe" });
    } catch (err: any) {
      this.error = err?.message ?? String(err);
    }
  }

  private async refresh(): Promise<void> {
    if (!this.api) return;
    try {
      this.st = await this.api.fetchState();
      this.error = "";
    } catch (err: any) {
      if (!this.st) this.error = err?.message ?? "Der Umbau-Planer ist nicht erreichbar.";
    }
  }

  private async go(view: ViewKey): Promise<void> {
    if (view === this.view) return;
    if (this.dirty && this.forms.length) {
      const ok = window.confirm("Ungespeicherte Eingaben gehen verloren. Ansicht trotzdem wechseln?");
      if (!ok) return;
      this.forms.forEach((f) => f.resolve(null));
      this.forms = [];
      this.dirty = false;
    }
    this.view = view;
    try {
      localStorage.setItem("umbau_planer_view", view);
    } catch {
      /* ignore */
    }
    window.scrollTo(0, 0);
  }

  private async stop(): Promise<void> {
    const st = this.st!;
    const run = st.timer.running!;
    const task = st.tasks.find((t) => t.id === run.task_id);
    const res = await this.ui.form({
      title: `Stopp: ${task?.title ?? "Aufgabe"}`,
      message: "Optional: Aufgabe abschließen oder die Restschätzung anpassen. Du kannst auch einfach nur stoppen.",
      fields: task && !task.has_children
        ? [{ key: "rest", label: "Restschätzung", type: "duration", hint: "Aktuell " + fmtDur(task.summary.remaining_min) }]
        : [],
      values: { rest: task?.summary.remaining_min },
      actions: [
        { name: "done", label: "Stopp & erledigt" },
        { name: "skip", label: "Nur stoppen" },
      ],
      submitLabel: "Stopp & Rest übernehmen",
    });
    if (!res) return;
    if (res.action === "done") await this.api!.op("timer_stop", { mark_done: true });
    else if (res.action === "skip") await this.api!.op("timer_stop");
    else await this.api!.op("timer_stop", { remaining_min: res.values.rest ?? undefined });
  }

  private timerBar() {
    const st = this.st!;
    const run = st.timer.running;
    const edit = st.me.can_edit;
    if (run) {
      const task = st.tasks.find((t) => t.id === run.task_id);
      const elapsed = Date.now() - Date.parse(run.start);
      void this.tick;
      return html`<div class="timerbar running">
        <span class="dot"></span>
        <div class="grow">
          <b>${task?.title ?? "?"}</b>
          <div class="muted small">${task ? st.tasks.find((t) => t.id === task.project_id)?.title : ""}</div>
        </div>
        <span class="clock">${clock(elapsed)}</span>
        ${edit ? html`<button class="primary" @click=${() => this.stop()}>■ Stopp</button>` : nothing}
      </div>`;
    }
    const last = st.tasks.find((t) => t.id === st.timer.last_task_id);
    return html`<div class="timerbar">
      <span class="muted grow">Keine Uhr läuft</span>
      ${edit && last
        ? html`<button @click=${() => this.api!.op("timer_resume")}>▶ Fortsetzen: ${last.title}</button>`
        : nothing}
    </div>`;
  }

  private content() {
    const st = this.st!;
    const p = { st, api: this.api! } as const;
    switch (this.view) {
      case "tasks":
        return html`<up-view-tasks .st=${p.st} .api=${p.api}></up-view-tasks>`;
      case "ready":
        return html`<up-view-ready .st=${p.st} .api=${p.api}></up-view-ready>`;
      case "calendar":
        return html`<up-view-calendar .st=${p.st} .api=${p.api}></up-view-calendar>`;
      case "disagree":
        return html`<up-view-disagree .st=${p.st} .api=${p.api}></up-view-disagree>`;
      case "times":
        return html`<up-view-times .st=${p.st} .api=${p.api}></up-view-times>`;
      case "evaluation":
        return html`<up-view-evaluation .st=${p.st} .api=${p.api}></up-view-evaluation>`;
      case "settings":
        return html`<up-view-settings .st=${p.st} .api=${p.api}></up-view-settings>`;
      default:
        return html`<up-view-today .st=${p.st} .api=${p.api}></up-view-today>`;
    }
  }

  render() {
    const st = this.st;
    const top = this.forms[this.forms.length - 1];
    return html`
      <header>
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <h1>Umbau-Planer</h1>
      </header>
      ${st
        ? html`
            <nav>
              ${VIEWS.map(
                (v) => html`<button class=${this.view === v.key ? "active" : ""} @click=${() => this.go(v.key)}>
                  ${v.icon} ${v.label}${v.key === "disagree" && st.disagree_ids.length
                    ? html`<span class="badge">${st.disagree_ids.length}</span>`
                    : v.key === "ready" && st.ready_ids.length
                      ? html`<span class="badge">${st.ready_ids.length}</span>`
                      : nothing}
                </button>`,
              )}
            </nav>
            <main>
              ${st.settings.persons.length === 0 && this.view !== "settings"
                ? html`<div class="warning-box">
                    Noch keine Personen eingerichtet. Lege unter <a style="cursor:pointer;text-decoration:underline" @click=${() => this.go("settings")}>Einstellungen</a> die Personen an
                    und ordne sie Home-Assistant-Benutzern zu, damit Prioritäten vergeben werden können.
                  </div>`
                : nothing}
              ${this.content()}
            </main>
            ${this.timerBar()}
          `
        : html`<main><div class="offline">${this.error ? html`<div class="error-box">${this.error}</div>` : "Lade …"}</div></main>`}
      ${top
        ? html`<up-form-dialog
            .spec=${top.spec}
            .tasks=${st?.tasks ?? []}
            .dirtyChanged=${(d: boolean) => (this.dirty = d)}
            .done=${(r: FormResult | null) => {
              this.forms = this.forms.filter((f) => f !== top);
              top.resolve(r);
            }}
          ></up-form-dialog>`
        : nothing}
      ${this.rollover && st && this.api
        ? html`<up-rollover-dialog .st=${st} .api=${this.api} .done=${() => (this.rollover = false)}></up-rollover-dialog>`
        : nothing}
      <div class="toasts">
        ${this.toasts.map(
          (t) => html`<div class="toast ${t.kind ?? ""}">
            <span>${t.message}</span>
            ${t.action
              ? html`<button
                  @click=${() => {
                    t.action!.run();
                    this.toasts = this.toasts.filter((x) => x.id !== t.id);
                  }}
                >
                  ${t.action.label}
                </button>`
              : nothing}
          </div>`,
        )}
      </div>
    `;
  }
}
customElements.define("umbau-planer-panel", UmbauPlanerPanel);
