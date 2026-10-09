import { dbAdd, dbPut, dbGet, dbGetAll, dbDelete, STORES } from "./database.js";
import { generateId } from "../utils/helpers.js";
import { createExpense, getExpensesByLoan, deleteExpense } from "./expenses.js";
import { addMonths, addWeeks, compareDates } from "../utils/dates.js";
import { findPeriodForDate } from "../calculations/paycheck.js";

function advanceDueDate(dateStr, frequency) {
  if (frequency === "weekly") return addWeeks(dateStr, 1);
  if (frequency === "biweekly") return addWeeks(dateStr, 2);
  if (frequency === "yearly") return addMonths(dateStr, 12);
  return addMonths(dateStr, 1);
}

async function generateInstallments(loan, paychecks, projectedPeriods) {
  let dueDate = loan.firstDueDate;
  for (let term = 1; term <= loan.numberOfTerms; term++) {
    const period = findPeriodForDate(paychecks, projectedPeriods, dueDate);
    await createExpense({
      name: `${loan.name} (Term ${term}/${loan.numberOfTerms})`,
      amount: loan.installmentAmount,
      date: dueDate,
      category: loan.category,
      status: "unpaid",
      paycheckPeriodStart: period ? period.periodStart : dueDate,
      loanId: loan.id,
      termNumber: term
    });
    dueDate = advanceDueDate(dueDate, loan.frequency);
  }
}

export async function createLoan(data, paychecks, projectedPeriods) {
  const loan = {
    id: data.id || generateId("ln"),
    name: data.name,
    installmentAmount: Number(data.installmentAmount) || 0,
    numberOfTerms: Number(data.numberOfTerms) || 1,
    frequency: data.frequency || "monthly",
    firstDueDate: data.firstDueDate,
    category: data.category || "Loan",
    note: data.note || "",
    createdAt: new Date().toISOString()
  };
  await dbAdd(STORES.LOANS, loan);
  await generateInstallments(loan, paychecks, projectedPeriods);
  return loan;
}

export function loanScheduleChanged(existing, changes) {
  const fields = ["installmentAmount", "numberOfTerms", "frequency", "firstDueDate"];
  return fields.some((field) => {
    if (!(field in changes)) return false;
    if (field === "installmentAmount" || field === "numberOfTerms") {
      return Number(changes[field]) !== Number(existing[field]);
    }
    return changes[field] !== existing[field];
  });
}

export async function updateLoanFull(id, changes, paychecks, projectedPeriods, regenerate) {
  const existing = await dbGet(STORES.LOANS, id);
  if (!existing) throw new Error("Loan not found");
  const updated = {
    ...existing,
    ...changes,
    installmentAmount: Number(changes.installmentAmount ?? existing.installmentAmount) || 0,
    numberOfTerms: Number(changes.numberOfTerms ?? existing.numberOfTerms) || 1,
    id
  };
  await dbPut(STORES.LOANS, updated);

  if (regenerate) {
    const installments = await getExpensesByLoan(id);
    for (const installment of installments) {
      await deleteExpense(installment.id);
    }
    await generateInstallments(updated, paychecks, projectedPeriods);
  } else if (changes.category || changes.name) {
    const installments = await getExpensesByLoan(id);
    for (const installment of installments) {
      const changesForInstallment = {};
      if (changes.category) changesForInstallment.category = changes.category;
      if (changes.name) changesForInstallment.name = `${changes.name} (Term ${installment.termNumber}/${updated.numberOfTerms})`;
      await dbPut(STORES.EXPENSES, { ...installment, ...changesForInstallment, updatedAt: new Date().toISOString() });
    }
  }

  return updated;
}

export async function updateLoan(id, changes) {
  const existing = await dbGet(STORES.LOANS, id);
  if (!existing) throw new Error("Loan not found");
  const updated = { ...existing, ...changes, id };
  await dbPut(STORES.LOANS, updated);
  return updated;
}

export async function deleteLoan(id) {
  const installments = await getExpensesByLoan(id);
  for (const installment of installments) {
    await deleteExpense(installment.id);
  }
  return dbDelete(STORES.LOANS, id);
}

export async function getLoan(id) {
  return dbGet(STORES.LOANS, id);
}

export async function getLoans() {
  const all = await dbGetAll(STORES.LOANS);
  return all.sort((a, b) => compareDates(b.createdAt.slice(0, 10), a.createdAt.slice(0, 10)));
}
