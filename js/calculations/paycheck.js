import { addDays, addWeeks, addMonths, compareDates, isBetween } from "../utils/dates.js";

function advancePayDate(dateStr, frequency) {
  if (frequency === "weekly") return addWeeks(dateStr, 1);
  if (frequency === "biweekly") return addWeeks(dateStr, 2);
  if (frequency === "semimonthly") {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (d < 15) return `${y}-${String(m).padStart(2, "0")}-15`;
    return addMonths(`${y}-${String(m).padStart(2, "0")}-01`, 1);
  }
  return addMonths(dateStr, 1);
}

export function getSortedPaychecks(paychecks) {
  return [...paychecks].sort((a, b) => compareDates(a.payDate, b.payDate));
}

export function getCurrentPaycheck(paychecks) {
  const sorted = getSortedPaychecks(paychecks);
  return sorted.length ? sorted[sorted.length - 1] : null;
}

export function getHistoryPaychecks(paychecks) {
  const sorted = getSortedPaychecks(paychecks);
  return sorted.slice(0, Math.max(0, sorted.length - 1));
}

export function computePeriodEnd(payDate, frequency) {
  const next = advancePayDate(payDate, frequency);
  return addDays(next, -1);
}

export function buildProjectedPeriods(settings, paychecks, countAhead = 8) {
  if (!settings.payFrequency) return [];
  const current = getCurrentPaycheck(paychecks);
  if (!current) return [];

  const frequency = settings.payFrequency;
  let cursorPayDate = advancePayDate(current.payDate, frequency);
  const periods = [];

  for (let i = 0; i < countAhead; i++) {
    const periodEnd = computePeriodEnd(cursorPayDate, frequency);
    periods.push({ payDate: cursorPayDate, periodStart: cursorPayDate, periodEnd });
    cursorPayDate = advancePayDate(cursorPayDate, frequency);
  }
  return periods;
}

export function getPaycheckDisplayPeriod(paychecks, paycheck, payFrequency) {
  const sorted = getSortedPaychecks(paychecks);
  const index = sorted.findIndex((p) => p.id === paycheck.id);
  const next = index >= 0 ? sorted[index + 1] : undefined;
  if (next) {
    return { periodStart: paycheck.payDate, periodEnd: addDays(next.payDate, -1) };
  }
  if (payFrequency) {
    return { periodStart: paycheck.payDate, periodEnd: computePeriodEnd(paycheck.payDate, payFrequency) };
  }
  return { periodStart: paycheck.periodStart, periodEnd: paycheck.periodEnd };
}

export function findPeriodForDate(paychecks, projectedPeriods, dateStr) {
  const sorted = getSortedPaychecks(paychecks);

  for (let i = 0; i < sorted.length; i++) {
    const paycheck = sorted[i];
    const next = sorted[i + 1];
    const periodEnd = next ? addDays(next.payDate, -1) : paycheck.periodEnd;
    if (isBetween(dateStr, paycheck.payDate, periodEnd)) {
      return { periodStart: paycheck.payDate, periodEnd, isReceived: true, paycheckId: paycheck.id };
    }
  }

  for (const period of projectedPeriods) {
    if (isBetween(dateStr, period.periodStart, period.periodEnd)) {
      return { periodStart: period.periodStart, periodEnd: period.periodEnd, isReceived: false, paycheckId: null };
    }
  }

  const current = getCurrentPaycheck(paychecks);
  if (current) {
    return {
      periodStart: current.payDate,
      periodEnd: current.periodEnd,
      isReceived: compareDates(dateStr, current.payDate) >= 0,
      paycheckId: current.id
    };
  }

  return { periodStart: dateStr, periodEnd: dateStr, isReceived: false, paycheckId: null };
}
