import { compareDates } from "../utils/dates.js";

export function getDueUrgency(expense, today) {
  if (expense.status === "paid") return "paid";
  const comparison = compareDates(expense.date, today);
  if (comparison < 0) return "overdue";
  if (comparison === 0) return "due-today";
  return "upcoming";
}
