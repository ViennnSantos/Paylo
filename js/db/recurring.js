import { dbAdd, dbPut, dbGet, dbGetAll, dbDelete, STORES } from "./database.js";
import { generateId } from "../utils/helpers.js";
import { createExpense, getExpensesByRecurring, deleteExpense } from "./expenses.js";
import { addDays, addWeeks, addMonths, compareDates, todayStr } from "../utils/dates.js";
import { findPeriodForDate } from "../calculations/paycheck.js";

function nextOccurrence(dateStr, frequency) {
  if (frequency === "weekly") return addDays(dateStr, 7);
  if (frequency === "biweekly") return addWeeks(dateStr, 2);
  if (frequency === "yearly") return addMonths(dateStr, 12);
  return addMonths(dateStr, 1);
}

export async function createRecurring(data, paychecks, projectedPeriods) {
  const rule = {
    id: data.id || generateId("rc"),
    name: data.name,
    amount: Number(data.amount) || 0,
    category: data.category || "Miscellaneous",
    frequency: data.frequency || "monthly",
    startDate: data.startDate,
    endDate: data.endDate || null,
    note: data.note || "",
    active: true,
    createdAt: new Date().toISOString()
  };
  await dbAdd(STORES.RECURRING, rule);
  await generateRecurringOccurrences(rule, paychecks, projectedPeriods, 6);
  return rule;
}

export async function generateRecurringOccurrences(rule, paychecks, projectedPeriods, countAhead = 6) {
  if (!rule.active) return;
  const existing = await getExpensesByRecurring(rule.id);
  const existingDates = new Set(existing.map((e) => e.date));

  let cursor = rule.startDate;
  let created = 0;
  let iterations = 0;

  while (created < countAhead && iterations < 400) {
    iterations++;
    if (rule.endDate && compareDates(cursor, rule.endDate) > 0) break;

    if (!existingDates.has(cursor)) {
      const period = findPeriodForDate(paychecks, projectedPeriods, cursor);
      await createExpense({
        name: rule.name,
        amount: rule.amount,
        date: cursor,
        category: rule.category,
        status: "unpaid",
        paycheckPeriodStart: period ? period.periodStart : cursor,
        recurringId: rule.id,
        note: rule.note
      });
      existingDates.add(cursor);
      created++;
    }
    cursor = nextOccurrence(cursor, rule.frequency);
  }
}

export async function updateRecurring(id, changes) {
  const existing = await dbGet(STORES.RECURRING, id);
  if (!existing) throw new Error("Recurring rule not found");
  const updated = { ...existing, ...changes, id };
  await dbPut(STORES.RECURRING, updated);
  return updated;
}

export async function setRecurringActive(id, active) {
  return updateRecurring(id, { active });
}

export async function deleteRecurring(id, futureOnly = true) {
  const occurrences = await getExpensesByRecurring(id);
  const today = todayStr();
  for (const occurrence of occurrences) {
    if (!futureOnly || occurrence.date >= today) {
      await deleteExpense(occurrence.id);
    }
  }
  return dbDelete(STORES.RECURRING, id);
}

export async function getRecurringRules() {
  const all = await dbGetAll(STORES.RECURRING);
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
