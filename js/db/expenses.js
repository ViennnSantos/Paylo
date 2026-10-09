import { dbAdd, dbPut, dbGet, dbGetAll, dbGetByIndex, dbDelete, STORES } from "./database.js";
import { generateId } from "../utils/helpers.js";
import { compareDates } from "../utils/dates.js";
import { kindForCategory } from "../utils/categories.js";

function defaultStatusForCategory(category, explicit) {
  if (explicit) return explicit;
  return kindForCategory(category) === "committed" ? "unpaid" : "paid";
}

export async function createExpense(data) {
  const now = new Date().toISOString();
  const kind = kindForCategory(data.category);
  const status = defaultStatusForCategory(data.category, data.status);
  const expense = {
    id: data.id || generateId("ex"),
    name: data.name,
    amount: Number(data.amount) || 0,
    date: data.date,
    category: data.category || "Miscellaneous",
    kind,
    status,
    paidDate: status === "paid" ? (data.paidDate || data.date) : null,
    paycheckPeriodStart: data.paycheckPeriodStart,
    loanId: data.loanId || null,
    termNumber: data.termNumber || null,
    recurringId: data.recurringId || null,
    note: data.note || "",
    createdAt: data.createdAt || now,
    updatedAt: now
  };
  await dbAdd(STORES.EXPENSES, expense);
  return expense;
}

export async function updateExpense(id, changes) {
  const existing = await dbGet(STORES.EXPENSES, id);
  if (!existing) throw new Error("Expense not found");
  const merged = { ...existing, ...changes, id };
  if (changes.category && !changes.kind) {
    merged.kind = kindForCategory(changes.category);
  }
  merged.updatedAt = new Date().toISOString();
  await dbPut(STORES.EXPENSES, merged);
  return merged;
}

export async function setExpenseStatus(id, status, paidDate = null) {
  return updateExpense(id, {
    status,
    paidDate: status === "paid" ? (paidDate || new Date().toISOString().slice(0, 10)) : null
  });
}

export async function deleteExpense(id) {
  return dbDelete(STORES.EXPENSES, id);
}

export async function getExpense(id) {
  return dbGet(STORES.EXPENSES, id);
}

export async function getExpenses() {
  const all = await dbGetAll(STORES.EXPENSES);
  return all.sort((a, b) => compareDates(b.date, a.date));
}

export async function getExpensesByLoan(loanId) {
  return dbGetByIndex(STORES.EXPENSES, "loanId", loanId);
}

export async function getExpensesByRecurring(recurringId) {
  return dbGetByIndex(STORES.EXPENSES, "recurringId", recurringId);
}
