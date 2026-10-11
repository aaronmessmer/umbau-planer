import type { FormResult, FormSpec, HomeAssistant, State } from "./types";

export interface ToastOptions {
  kind?: "info" | "error" | "warn";
  action?: { label: string; run: () => void };
  timeout?: number;
}

export interface Ui {
  toast(message: string, options?: ToastOptions): void;
  form(spec: FormSpec): Promise<FormResult | null>;
  confirm(title: string, message: string, danger?: boolean, submitLabel?: string): Promise<boolean>;
  rolloverFlow(): Promise<void>;
  setDirty(dirty: boolean): void;
}

export class Api {
  constructor(
    public hass: HomeAssistant,
    public ui: Ui,
  ) {}

  /** Call a mutating operation. Resolves to the result or undefined after showing the error. */
  async op<T = any>(name: string, args: Record<string, any> = {}): Promise<T | undefined> {
    try {
      const res = await this.hass.callWS<{ result: T; rev: number }>({
        type: "umbau_planer/op",
        op: name,
        args,
      });
      return res.result;
    } catch (err: any) {
      this.ui.toast(err?.message ?? String(err), { kind: "error" });
      return undefined;
    }
  }

  async ws<T = any>(type: string, payload: Record<string, any> = {}): Promise<T | undefined> {
    try {
      return await this.hass.callWS<T>({ type: `umbau_planer/${type}`, ...payload });
    } catch (err: any) {
      this.ui.toast(err?.message ?? String(err), { kind: "error" });
      return undefined;
    }
  }

  fetchState(): Promise<State> {
    return this.hass.callWS<State>({ type: "umbau_planer/state" });
  }
}
