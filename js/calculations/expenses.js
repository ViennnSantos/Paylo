export function sumAmount(expenses) {
  return expenses.reduce((total, expense) => total + (Number(expense.amount) || 0), 0);
}

export function filterByKind(expenses, kind) {
  return expenses.filter((expense) => expense.kind === kind);
}

export function calculateCommitted(expenses) {
  return sumAmount(filterByKind(expenses, "committed"));
}

export function calculateActualSpending(expenses) {
  return sumAmount(filterByKind(expenses, "actual"));
}

export function calculateTotalExpenses(expenses) {
  return sumAmount(expenses);
}

export function calculateAvailableBudget(salary, expenses) {
  return salary - calculateTotalExpenses(expenses);
}

export function calculateSpendingPercentage(salary, expenses) {
  if (!salary || salary <= 0) return 0;
  const total = calculateTotalExpenses(expenses);
  return Math.min(100, Math.max(0, (total / salary) * 100));
}

export function getUpcomingExpenses(expenses, today, limit = 6) {
  return expenses
    .filter((expense) => expense.status === "unpaid" && expense.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, limit);
}
