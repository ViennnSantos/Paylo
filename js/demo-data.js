import { createPaycheck } from "./db/paychecks.js";
import { createExpense } from "./db/expenses.js";
import { getState, loadAllData } from "./state.js";
import { findPeriodForDate } from "./calculations/paycheck.js";

const DEMO_PAY_DATE = "2026-09-03";
const DEMO_SALARY = 25000;

const DEMO_ITEMS = [
  { name: "Rent", amount: 5000, date: "2026-09-15", category: "Rent", status: "unpaid" },
  { name: "Loan", amount: 2000, date: "2026-09-11", category: "Loan", status: "unpaid" },
  { name: "PayLater", amount: 1500, date: "2026-09-14", category: "PayLater", status: "unpaid" },
  { name: "Gas", amount: 150, date: "2026-09-08", category: "Gas", status: "paid" },
  { name: "Food", amount: 500, date: "2026-09-10", category: "Food", status: "paid" }
];

export async function loadDemoData() {
  const state = getState();
  const hasDemoPaycheck = state.paychecks.some((p) => p.payDate === DEMO_PAY_DATE);

  if (!hasDemoPaycheck) {
    await createPaycheck({
      payDate: DEMO_PAY_DATE,
      salary: DEMO_SALARY,
      periodStart: DEMO_PAY_DATE,
      periodEnd: "2026-09-16",
      note: "Demo paycheck"
    });
  }

  await loadAllData();
  const refreshed = getState();

  for (const item of DEMO_ITEMS) {
    const alreadyExists = refreshed.expenses.some((e) => e.name === item.name && e.date === item.date);
    if (alreadyExists) continue;
    const match = findPeriodForDate(refreshed.paychecks, refreshed.projectedPeriods, item.date);
    await createExpense({ ...item, paycheckPeriodStart: match ? match.periodStart : item.date });
  }

  await loadAllData();
}
