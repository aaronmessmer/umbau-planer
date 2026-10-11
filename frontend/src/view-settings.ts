import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { UpBase } from "./base";
import { fmtDur, parseDur } from "./format";
import type { Person } from "./types";

interface HaUser {
  id: string;
  name: string;
}

function durText(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

export class UpViewSettings extends UpBase {
  @state() private haUsers: HaUser[] = [];
  @state() private levelDraft: string[] | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // only administrators may list users; everybody else maps themselves
    this.api.hass
      .callWS<HaUser[]>({ type: "config/auth/list" })
      .then((users) => (this.haUsers = users.filter((u: any) => !u.system_generated)))
      .catch(() => undefined);
  }

  private async save(fields: Record<string, any>): Promise<void> {
    await this.api.op("settings_update", { fields });
  }

  private savePersons(persons: Person[]): Promise<void> {
    return this.save({ persons });
  }

  private personRow(p: Person) {
    const persons = this.persons;
    const upd = (patch: Partial<Person>) => this.savePersons(persons.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    const me = this.api.hass.user;
    return html`<div class="card">
      <div class="row">
        <input class="grow" .value=${p.name} placeholder="Name" @change=${(e: any) => upd({ name: e.target.value })} />
        <select @change=${(e: any) => upd({ role: e.target.value })}>
          <option value="executor" ?selected=${p.role === "executor"}>Ausführende Person</option>
          <option value="rater" ?selected=${p.role === "rater"}>Bewertende Person</option>
        </select>
      </div>
      <div class="row" style="margin-top:6px">
        <span class="muted small">Home-Assistant-Benutzer:</span>
        ${this.haUsers.length
          ? html`<select @change=${(e: any) => upd({ ha_user_id: e.target.value || null })}>
              <option value="">– nicht zugeordnet –</option>
              ${this.haUsers.map((u) => html`<option value=${u.id} ?selected=${u.id === p.ha_user_id}>${u.name}</option>`)}
            </select>`
          : html`<span>${p.ha_user_id ? "zugeordnet" : "nicht zugeordnet"}</span>`}
        ${me && p.ha_user_id !== me.id
          ? html`<button @click=${() => upd({ ha_user_id: me.id })}>Mir (${me.name}) zuordnen</button>`
          : nothing}
        <button class="danger right" @click=${() => this.removePerson(p)}>Entfernen</button>
      </div>
    </div>`;
  }

  private async removePerson(p: Person): Promise<void> {
    const ok = await this.api.ui.confirm(
      "Person entfernen",
      `Die Wertungen von „${p.name}“ gehen verloren.`,
      true,
      "Entfernen",
    );
    if (ok) await this.savePersons(this.persons.filter((x) => x.id !== p.id));
  }

  private async addPerson(): Promise<void> {
    const res = await this.api.ui.form({
      title: "Person hinzufügen",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        {
          key: "role",
          label: "Rolle",
          type: "select",
          options: [
            { value: "executor", label: "Ausführende Person" },
            { value: "rater", label: "Bewertende Person" },
          ],
        },
      ],
      values: { role: this.persons.length ? "rater" : "executor" },
      submitLabel: "Hinzufügen",
    });
    if (!res) return;
    const me = this.api.hass.user;
    const first = this.persons.length === 0;
    await this.savePersons([
      ...this.persons,
      { id: crypto.randomUUID(), name: res.values.name, role: res.values.role, ha_user_id: first && me ? me.id : null },
    ]);
  }

  private async applyLevels(): Promise<void> {
    const names = (this.levelDraft ?? this.levels).map((n) => n.trim()).filter(Boolean);
    if (names.length < 2) return this.api.ui.toast("Mindestens zwei Stufen.", { kind: "error" });
    if (names.length !== this.levels.length) {
      const changes = await this.api.ws<any[]>("rescale_preview", { level_names: names });
      if (changes === undefined) return;
      const ok = await this.api.ui.confirm(
        "Prioritätsstufen ändern",
        `Von ${this.levels.length} auf ${names.length} Stufen.\n${changes.length} bestehende Wertung${changes.length === 1 ? "" : "en"} werden proportional umgerechnet.`,
        false,
        "Umrechnen",
      );
      if (!ok) return;
    }
    await this.save({ level_names: names });
    this.levelDraft = null;
  }

  private async doExport(): Promise<void> {
    const data = await this.api.ws("export");
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `umbau-planer-${this.st.today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private async doImport(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    let data: any;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return this.api.ui.toast("Die Datei ist kein gültiges JSON.", { kind: "error" });
    }
    const ok = await this.api.ui.confirm(
      "Daten importieren",
      `Alle aktuellen Daten werden durch den Inhalt von „${file.name}“ ersetzt. Vorher wird automatisch eine Sicherung angelegt.`,
      true,
      "Importieren",
    );
    if (ok) {
      const res = await this.api.ws("import", { data });
      if (res) this.api.ui.toast("Import abgeschlossen");
    }
  }

  private async addCategory(): Promise<void> {
    const res = await this.api.ui.form({
      title: "Gewerk hinzufügen",
      fields: [{ key: "name", label: "Name", type: "text", required: true }],
      submitLabel: "Hinzufügen",
    });
    if (res) await this.save({ categories: [...this.st.settings.categories, res.values.name] });
  }

  private durField(label: string, key: string, value: number, hint?: string) {
    return html`<div>
      <label class="small muted">${label}</label><br />
      <input
        style="width:110px"
        .value=${durText(value)}
        @change=${(e: any) => {
          const v = parseDur(e.target.value);
          if (v === null || Number.isNaN(v) || v <= 0) {
            e.target.value = durText(value);
            return this.api.ui.toast("Ungültige Dauer", { kind: "error" });
          }
          this.save({ [key]: v });
        }}
      />
      ${hint ? html`<div class="muted small">${hint}</div>` : nothing}
    </div>`;
  }

  render() {
    const s = this.st.settings;
    const draft = this.levelDraft ?? s.level_names;
    return html`
      <h2>Einstellungen</h2>
      ${!this.canEdit ? html`<div class="warning-box">Du kannst die Einstellungen ansehen, aber nicht ändern.</div>` : nothing}
      <h3>Personen</h3>
      <div class="muted small" style="margin-bottom:6px">
        Jede Person ist einem Home-Assistant-Benutzer zugeordnet. Die Zuordnung bestimmt, wessen Priorität du änderst.
        Ausführende Personen planen und stempeln, bewertende Personen vergeben nur ihre Prioritäten.
      </div>
      ${this.persons.map((p) => this.personRow(p))}
      ${this.canEdit ? html`<button @click=${() => this.addPerson()}>+ Person</button>` : nothing}

      <h3>Prioritätsstufen</h3>
      <div class="card">
        <div class="muted small">Stufe 1 ist die höchste Priorität.</div>
        ${draft.map(
          (n, i) => html`<div class="row" style="margin:4px 0">
            <b style="width:20px">${i + 1}</b>
            <input class="grow" .value=${n} ?disabled=${!this.canEdit} @input=${(e: any) => {
              const copy = [...draft];
              copy[i] = e.target.value;
              this.levelDraft = copy;
            }} />
            <button class="icon" ?disabled=${!this.canEdit || draft.length <= 2} title="Stufe entfernen" @click=${() => (this.levelDraft = draft.filter((_, j) => j !== i))}>✕</button>
          </div>`,
        )}
        ${this.canEdit
          ? html`<div class="row">
              <button @click=${() => (this.levelDraft = [...draft, `Stufe ${draft.length + 1}`])}>+ Stufe</button>
              ${this.levelDraft ? html`<button class="primary" @click=${() => this.applyLevels()}>Übernehmen</button><button @click=${() => (this.levelDraft = null)}>Verwerfen</button>` : nothing}
            </div>`
          : nothing}
      </div>

      <h3>Gewerke</h3>
      <div class="card">
        <div class="row">
          ${s.categories.map(
            (c) => html`<span class="chip">${c}${this.canEdit ? html` <a style="cursor:pointer" title="Entfernen" @click=${() => this.save({ categories: s.categories.filter((x) => x !== c) })}>✕</a>` : nothing}</span>`,
          )}
          ${this.canEdit ? html`<button @click=${() => this.addCategory()}>+ Gewerk</button>` : nothing}
        </div>
      </div>

      <h3>Schwellen und Standardwerte</h3>
      <div class="card row" style="gap:16px;align-items:flex-start">
        ${this.durField("Standardkapazität eines Blocks", "default_capacity_min", s.default_capacity_min)}
        ${this.durField("Kleinste Teilgröße beim Nachrücken", "min_split_min", s.min_split_min)}
        ${this.durField("Lange laufende Uhr ab", "long_timer_min", s.long_timer_min, "oder über Mitternacht")}
        <div>
          <label class="small muted">„Uneinig“ ab Abstand</label><br />
          <input type="number" min="1" style="width:80px" .value=${String(s.disagree_threshold)} ?disabled=${!this.canEdit} @change=${(e: any) => this.save({ disagree_threshold: Number(e.target.value) })} />
          <div class="muted small">Stufen</div>
        </div>
      </div>

      <h3>Datensicherung</h3>
      <div class="card">
        <div class="row">
          <button @click=${() => this.doExport()}>Export als JSON</button>
          ${this.canEdit
            ? html`<label class="btn" style="cursor:pointer">Import …<input type="file" accept="application/json,.json" hidden @change=${(e: Event) => this.doImport(e)} /></label>`
            : nothing}
        </div>
        <div class="muted small" style="margin-top:6px">
          Vor jedem Import und jeder Migration legt der Umbau-Planer automatisch eine Sicherung im Ordner
          <code>umbau_planer_backups</code> des Konfigurationsverzeichnisses ab. Standardkapazität aktuell ${fmtDur(s.default_capacity_min)}.
        </div>
      </div>
    `;
  }
}
customElements.define("up-view-settings", UpViewSettings);
