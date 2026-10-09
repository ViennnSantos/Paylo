export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateStr(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr() {
  return toDateStr(new Date());
}

export function addDays(dateStr, days) {
  const d = fromDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function addWeeks(dateStr, weeks) {
  return addDays(dateStr, weeks * 7);
}

export function addMonths(dateStr, months) {
  const d = fromDateStr(dateStr);
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return toDateStr(d);
}

export function compareDates(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isBetween(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr;
}

export function formatDisplay(dateStr) {
  if (!dateStr) return "";
  const d = fromDateStr(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatMonthYear(dateStr) {
  const d = fromDateStr(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function startOfMonth(dateStr) {
  const d = fromDateStr(dateStr);
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function getMonthGrid(dateStr) {
  const first = fromDateStr(startOfMonth(dateStr));
  const startOffset = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - startOffset);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    days.push(toDateStr(d));
  }
  return days;
}

export function isSameMonth(dateStr, refStr) {
  const d = fromDateStr(dateStr);
  const r = fromDateStr(refStr);
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth();
}

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
