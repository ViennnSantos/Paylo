import { getAllSettings } from "./db/settings.js";
import { getPaychecks } from "./db/paychecks.js";
import { getExpenses } from "./db/expenses.js";
import { getLoans } from "./db/loans.js";
import { getRecurringRules, generateRecurringOccurrences } from "./db/recurring.js";
import { getCategories, seedDefaultCategories } from "./db/categories.js";
import { setActiveCurrency } from "./utils/currency.js";
import { buildProjectedPeriods, getCurrentPaycheck, getHistoryPaychecks } from "./calculations/paycheck.js";

const state = {
  loading: true,
  settings: null,
  paychecks: [],
  expenses: [],
  loans: [],
  recurringRules: [],
  categories: [],
  projectedPeriods: [],
  currentPaycheck: null,
  historyPaychecks: [],
  currentView: "dashboard"
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

function computeDerived() {
  state.currentPaycheck = getCurrentPaycheck(state.paychecks);
  state.historyPaychecks = getHistoryPaychecks(state.paychecks);
  state.projectedPeriods = buildProjectedPeriods(state.settings, state.paychecks, 8);
}

export async function loadAllData() {
  state.loading = true;
  state.settings = await getAllSettings();
  setActiveCurrency(state.settings.currency);
  state.categories = await seedDefaultCategories().then(() => getCategories());
  state.paychecks = await getPaychecks();
  computeDerived();

  state.recurringRules = await getRecurringRules();
  for (const rule of state.recurringRules) {
    await generateRecurringOccurrences(rule, state.paychecks, state.projectedPeriods, 6);
  }
  state.recurringRules = await getRecurringRules();

  state.expenses = await getExpenses();
  state.loans = await getLoans();
  state.loading = false;
  notify();
  return state;
}

export async function refreshSettings() {
  state.settings = await getAllSettings();
  setActiveCurrency(state.settings.currency);
  computeDerived();
  notify();
}

export async function refreshPaychecks() {
  state.paychecks = await getPaychecks();
  computeDerived();
  notify();
}

export async function refreshExpenses() {
  state.expenses = await getExpenses();
  notify();
}

export async function refreshLoans() {
  state.loans = await getLoans();
  notify();
}

export async function refreshRecurring() {
  state.recurringRules = await getRecurringRules();
  notify();
}

export async function refreshCategories() {
  state.categories = await getCategories();
  notify();
}

export function setCurrentView(view) {
  state.currentView = view;
  notify();
}

export function forceNotify() {
  notify();
}
