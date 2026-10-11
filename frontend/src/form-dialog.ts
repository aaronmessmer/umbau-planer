import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { fmtDur, parseDur } from "./format";
import { sharedStyles } from "./styles";
import type { Field, FormResult, FormSpec, Task } from "./types";

function durInput(min: number | null | undefined): string {
  if (min === null || min === undefined) return "";
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

/** Generic modal form / confirmation dialog driven by a {@link FormSpec}. */
export class UpFormDialog extends LitElement {
  static styles = [
    sharedStyles,
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
        color: var(--primary-text-color);
        border-radius: 14px;
        padding: 16px;
        width: min(520px, 100%);
        max-height: 92vh;
        overflow: auto;
      }
      label {
        display: block;
        margin: 8px 0 2px;
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .field input:not([type="checkbox"]),
      .field select {
        width: 100%;
      }
      .checks label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin: 2px 10px 2px 0;
        font-size: 14px;
        color: var(--primary-text-color);
      }
      .buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      .err {
        color: var(--error-color, #db4437);
        font-size: 12px;
      }
      p.message {
        white-space: pre-line;
        margin: 4px 0;
      }
    `,
  ];

  @property({ attribute: false }) spec!: FormSpec;
  @property({ attribute: false }) tasks: Task[] = [];
  @property({ attribute: false }) done!: (r: FormResult | null) => void;
  @property({ attribute: false }) dirtyChanged?: (dirty: boolean) => void;
  @state() private vals: Record<string, any> = {};
  @state() private errors: Record<string, string> = {};
  private initial = "";

  willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("spec")) {
      const v: Record<string, any> = {};
      for (const f of this.spec.fields ?? []) {
        const given = this.spec.values?.[f.key];
        if (f.type === "duration") v[f.key] = durInput(given);
        else if (f.type === "checks") v[f.key] = [...(given ?? [])];
        else if (f.type === "checkbox") v[f.key] = !!given;
        else v[f.key] = given ?? "";
      }
      this.vals = v;
      this.initial = JSON.stringify(v);
      this.errors = {};
    }
  }

  private set(key: string, value: any): void {
    this.vals = { ...this.vals, [key]: value };
    this.dirtyChanged?.(JSON.stringify(this.vals) !== this.initial);
  }

  private close(result: FormResult | null): void {
    this.dirtyChanged?.(false);
    this.done(result);
  }

  private submit(action: string): void {
    const out: Record<string, any> = {};
    const errors: Record<string, string> = {};
    for (const f of this.spec.fields ?? []) {
      const raw = this.vals[f.key];
      if (f.type === "duration") {
        const min = parseDur(String(raw));
        if (min !== null && Number.isNaN(min)) errors[f.key] = "Ungültige Dauer, z. B. 1:30 oder 90 min";
        out[f.key] = min;
      } else if (f.type === "number") {
        out[f.key] = raw === "" ? null : Number(raw);
      } else if (f.type === "select") {
        const opt = f.options?.find((o) => String(o.value) === String(raw));
        out[f.key] = opt ? opt.value : raw === "" ? null : raw;
      } else if (f.type === "task") {
        out[f.key] = raw || null;
      } else if (f.type === "text" || f.type === "textarea") {
        out[f.key] = String(raw).trim();
      } else {
        out[f.key] = raw === "" ? null : raw;
      }
      if (f.required && (out[f.key] === null || out[f.key] === "" || out[f.key] === undefined)) {
        errors[f.key] = "Pflichtfeld";
      }
    }
    if (Object.keys(errors).length && action !== "cancel") {
      this.errors = errors;
      return;
    }
    this.close({ action, values: out });
  }

  private field(f: Field) {
    const v = this.vals[f.key];
    const err = this.errors[f.key];
    let input;
    switch (f.type) {
      case "textarea":
        input = html`<textarea .value=${v} @input=${(e: any) => this.set(f.key, e.target.value)}></textarea>`;
        break;
      case "select":
        input = html`<select .value=${String(v)} @change=${(e: any) => this.set(f.key, e.target.value)}>
          ${f.allowEmpty ? html`<option value="">–</option>` : nothing}
          ${(f.options ?? []).map(
            (o) => html`<option value=${String(o.value)} ?selected=${String(o.value) === String(v)}>${o.label}</option>`,
          )}
        </select>`;
        break;
      case "task": {
        const list = this.tasks.filter((t) => (f.taskFilter ? f.taskFilter(t) : true));
        input = html`<select .value=${v} @change=${(e: any) => this.set(f.key, e.target.value)}>
          <option value="">${f.allowEmpty === false ? "bitte wählen" : "–"}</option>
          ${list.map(
            (t) => html`<option value=${t.id} ?selected=${t.id === v}>${" ".repeat(t.depth)}${t.title}</option>`,
          )}
        </select>`;
        break;
      }
      case "checkbox":
        return html`<div class="field">
          <label style="display:flex;gap:6px;align-items:center;color:var(--primary-text-color);font-size:14px">
            <input type="checkbox" .checked=${v} @change=${(e: any) => this.set(f.key, e.target.checked)} />
            ${f.label}
          </label>
        </div>`;
      case "checks":
        input = html`<div class="checks">
          ${(f.options ?? []).map(
            (o) => html`<label>
              <input
                type="checkbox"
                .checked=${(v as any[]).includes(o.value)}
                @change=${(e: any) =>
                  this.set(
                    f.key,
                    e.target.checked ? [...v, o.value] : (v as any[]).filter((x) => x !== o.value),
                  )}
              />${o.label}</label
            >`,
          )}
        </div>`;
        break;
      default: {
        const type =
          f.type === "datetime" ? "datetime-local" : f.type === "duration" ? "text" : f.type;
        input = html`<input
          type=${type}
          .value=${v}
          placeholder=${f.placeholder ?? (f.type === "duration" ? "z. B. 1:30, 1,5 h, 90 min" : "")}
          @input=${(e: any) => this.set(f.key, e.target.value)}
          @keydown=${(e: KeyboardEvent) => e.key === "Enter" && f.type !== "textarea" && this.submit("ok")}
        />`;
      }
    }
    return html`<div class="field">
      <label>${f.label}${f.required ? " *" : ""}</label>
      ${input} ${f.hint ? html`<div class="muted small">${f.hint}</div>` : nothing}
      ${err ? html`<div class="err">${err}</div>` : nothing}
    </div>`;
  }

  render() {
    if (!this.spec) return nothing;
    return html`<div class="backdrop" @click=${(e: Event) => e.target === e.currentTarget && this.close(null)}>
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>${this.spec.title}</h2>
        ${this.spec.message ? html`<p class="message">${this.spec.message}</p>` : nothing}
        ${(this.spec.fields ?? []).map((f) => this.field(f))}
        <div class="buttons">
          <button @click=${() => this.close(null)}>Abbrechen</button>
          ${(this.spec.actions ?? []).map(
            (a) => html`<button class=${a.danger ? "danger" : ""} @click=${() => this.submit(a.name)}>${a.label}</button>`,
          )}
          <button class=${this.spec.danger ? "danger" : "primary"} @click=${() => this.submit("ok")}>
            ${this.spec.submitLabel ?? "OK"}
          </button>
        </div>
      </div>
    </div>`;
  }
}
customElements.define("up-form-dialog", UpFormDialog);
export { fmtDur };
