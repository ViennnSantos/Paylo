import { getSortedPaychecks, getCurrentPaycheck } from "./paycheck.js";
import { compareDates, addDays } from "../utils/dates.js";

export function buildPeriodOptions(paychecks, projectedPeriods) {
  const sorted = getSortedPaychecks(paychecks);
  const current = getCurrentPaycheck(paychecks);
  const options = [];

  for (let i = 0; i < sorted.length; i++) {
    const paycheck = sorted[i];
    const next = sorted[i + 1];
    const periodEnd = next ? addDays(next.payDate, -1) : paycheck.periodEnd;
    const isCurrent = current ? paycheck.id === current.id : false;
    options.push({
      periodStart: paycheck.payDate,
      periodEnd,
      label: isCurrent ? "current" : "history"
    });
  }

  for (const period of projectedPeriods) {
    options.push({ periodStart: period.periodStart, periodEnd: period.periodEnd, label: "upcoming" });
  }

  return options.sort((a, b) => compareDates(a.periodStart, b.periodStart));
}
