export function fmtDur(min: number | null | undefined): string {
  if (min === null || min === undefined) return "–";
  const sign = min < 0 ? "−" : "";
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} min`;
  if (m === 0) return `${sign}${h} h`;
  return `${sign}${h} h ${m} min`;
}

/** Hours with one decimal in German notation, e.g. "4,5 h". */
export function fmtHours(min: number | null | undefined): string {
  if (min === null || min === undefined) return "–";
  const h = Math.round((min / 60) * 10) / 10;
  return `${String(h).replace(".", ",")} h`;
}

export function fmtSigned(min: number | null | undefined): string {
  if (min === null || min === undefined) return "–";
  return `${min > 0 ? "+" : ""}${fmtDur(min)}`;
}

/** Parse "1:30", "1,5", "1.5h", "90m", "2h 15m", "90" (plain integers are minutes). */
export function parseDur(text: string): number | null {
  const s = text.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  let m = s.match(/^(\d+):(\d{1,2})$/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  m = s.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*(?:m|min))?$/);
  if (m && (m[1] || m[2])) {
    return Math.round(parseFloat(m[1] || "0") * 60 + parseInt(m[2] || "0"));
  }
  m = s.match(/^\d+\.\d+$/);
  if (m) return Math.round(parseFloat(s) * 60);
  m = s.match(/^\d+$/);
  if (m) return parseInt(s);
  return NaN as unknown as null;
}

const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function fmtDay(iso: string, today?: string): string {
  const d = parseDate(iso);
  const base = `${DAYS[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;
  if (today === iso) return `Heute (${base})`;
  if (today && addDays(today, 1) === iso) return `Morgen (${base})`;
  return base;
}

export function mondayOf(iso: string): string {
  const d = parseDate(iso);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return isoDate(d);
}

export function fmtTime(isoDateTime: string, tz?: string): string {
  return new Date(isoDateTime).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

export function fmtDateTime(isoDateTime: string, tz?: string): string {
  return new Date(isoDateTime).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local input, in the given timezone. */
export function toLocalInput(isoDateTime: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(isoDateTime));
  return parts.replace(" ", "T");
}

/** Convert a "YYYY-MM-DDTHH:mm" wall-clock value in ``tz`` to an ISO instant. */
export function fromLocalInput(value: string, tz: string): string {
  const asUtc = new Date(value + ":00Z");
  const shown = toLocalInput(asUtc.toISOString(), tz);
  const shownUtc = new Date(shown + ":00Z");
  const offset = shownUtc.getTime() - asUtc.getTime();
  return new Date(asUtc.getTime() - offset).toISOString();
}

export function levelLabel(names: string[], level: number | null): string {
  if (level === null || level === undefined) return "–";
  return `${level} ${names[level - 1] ?? ""}`.trim();
}

/** UUID that also works on plain http (crypto.randomUUID needs a secure context). */
export function newId(): string {
  const c: Crypto | undefined = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
