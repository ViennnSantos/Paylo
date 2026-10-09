import { dbAdd, dbPut, dbGet, dbGetAll, dbDelete, STORES } from "./database.js";
import { generateId } from "../utils/helpers.js";
import { compareDates } from "../utils/dates.js";
import { updateExpense } from "./expenses.js";

export async function createPaycheck(data) {
  const paycheck = {
    id: data.id || generateId("pc"),
    payDate: data.payDate,
    salary: Number(data.salary) || 0,
    periodStart: data.periodStart || data.payDate,
    periodEnd: data.periodEnd || data.payDate,
    note: data.note || "",
    createdAt: data.createdAt || new Date().toISOString()
  };
  await dbAdd(STORES.PAYCHECKS, paycheck);
  return paycheck;
}

export async function updatePaycheck(id, changes) {
  const existing = await dbGet(STORES.PAYCHECKS, id);
  if (!existing) throw new Error("Paycheck not found");
  const updated = { ...existing, ...changes, id };
  await dbPut(STORES.PAYCHECKS, updated);
  return updated;
}

export async function updatePaycheckAndReassignExpenses(id, changes) {
  const existing = await dbGet(STORES.PAYCHECKS, id);
  if (!existing) throw new Error("Paycheck not found");
  const oldPayDate = existing.payDate;
  const updated = { ...existing, ...changes, id };
  if (changes.payDate && changes.payDate !== oldPayDate) {
    updated.periodStart = changes.payDate;
  }
  await dbPut(STORES.PAYCHECKS, updated);

  if (changes.payDate && changes.payDate !== oldPayDate) {
    const allExpenses = await dbGetAll(STORES.EXPENSES);
    const affected = allExpenses.filter((e) => e.paycheckPeriodStart === oldPayDate);
    for (const expense of affected) {
      await updateExpense(expense.id, { paycheckPeriodStart: changes.payDate });
    }
  }

  return updated;
}

export async function deletePaycheck(id) {
  return dbDelete(STORES.PAYCHECKS, id);
}

export async function getPaychecks() {
  const all = await dbGetAll(STORES.PAYCHECKS);
  return all.sort((a, b) => compareDates(a.payDate, b.payDate));
}
