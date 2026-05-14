// Minimal 5-field cron next-run computer.
// Supports: *, exact, A-B range, A,B,C list, */N step
// Format: "M H DoM Mon DoW"
//   M:   0-59
//   H:   0-23
//   DoM: 1-31
//   Mon: 1-12
//   DoW: 0-6 (0=Sunday)
//
// One-shot format: "ONCE:<ISO>" — parse the date directly.

type Field = { values: Set<number> | null; min: number; max: number };

const RANGES: [number, number][] = [
  [0, 59], [0, 23], [1, 31], [1, 12], [0, 6],
];

function parseField(expr: string, [min, max]: [number, number]): Field {
  if (expr === "*") return { values: null, min, max };
  const set = new Set<number>();
  for (const part of expr.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    let base = part, step = 1;
    if (stepMatch) { base = stepMatch[1]; step = parseInt(stepMatch[2], 10); }
    let lo: number, hi: number;
    if (base === "*") { lo = min; hi = max; }
    else if (base.includes("-")) {
      const [a, b] = base.split("-").map(s => parseInt(s, 10));
      lo = a; hi = b;
    } else {
      lo = hi = parseInt(base, 10);
    }
    for (let i = lo; i <= hi; i += step) {
      if (i >= min && i <= max) set.add(i);
    }
  }
  return { values: set, min, max };
}

function matches(field: Field, val: number): boolean {
  return field.values === null ? true : field.values.has(val);
}

export function computeNextRun(cronExpr: string, from: Date = new Date()): Date | null {
  // One-shot
  if (cronExpr.startsWith("ONCE:")) {
    const t = new Date(cronExpr.slice(5));
    if (!Number.isFinite(t.getTime())) return null;
    return t > from ? t : null;
  }

  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [m, h, dom, mon, dow] = parts.map((p, i) => parseField(p, RANGES[i]));

  // Iterate from the next minute, up to 5 years
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const limit = new Date(from.getTime() + 5 * 365 * 24 * 60 * 60 * 1000);

  while (cursor < limit) {
    if (matches(mon, cursor.getMonth() + 1)
      && matches(dom, cursor.getDate())
      && matches(dow, cursor.getDay())
      && matches(h, cursor.getHours())
      && matches(m, cursor.getMinutes())) {
      return new Date(cursor);
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return null;
}

// Pretty-print common cron patterns for humans
export function describeCron(cronExpr: string): string {
  if (cronExpr.startsWith("ONCE:")) {
    const d = new Date(cronExpr.slice(5));
    return Number.isFinite(d.getTime())
      ? `一次性 · ${d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
      : `一次性（无效时间）`;
  }
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return cronExpr;
  const [m, h, dom, mon, dow] = parts;
  // Common patterns
  if (m === "0" && dom === "*" && mon === "*") {
    const hh = parseInt(h, 10);
    const hourStr = `${hh}:00`;
    if (dow === "*") return `每天 ${hourStr}`;
    if (dow === "1-5") return `工作日 ${hourStr}`;
    const days = ["日","一","二","三","四","五","六"];
    if (/^\d$/.test(dow)) return `每周${days[parseInt(dow, 10)]} ${hourStr}`;
  }
  if (m === "0" && h === "9" && mon === "*" && dow === "*" && /^\d+$/.test(dom)) {
    return `每月 ${dom} 号 09:00`;
  }
  return `cron: ${cronExpr}`;
}
