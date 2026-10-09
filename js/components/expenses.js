import { openModal, openConfirm } from "./modal.js";
import { showToast } from "./toast.js";
import { createExpense, updateExpense, deleteExpense, setExpenseStatus } from "../db/expenses.js";
import { getState, refreshExpenses } from "../state.js";
import { findPeriodForDate } from "../calculations/paycheck.js";
import { buildPeriodOptions } from "../calculations/periods.js";
import { getDueUrgency } from "../calculations/status.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDisplay, todayStr } from "../utils/dates.js";
import { isValidAmount, escapeHtml } from "../utils/helpers.js";
import { iconForCategory, kindForCategory } from "../utils/categories.js";

function categoryOptionsHtml(categories, selected) {
  return categories
    .map((cat) => `<option value="${escapeHtml(cat.name)}" ${cat.name === selected ? "selected" : ""}>${escapeHtml(cat.name)}</option>`)
    .join("");
}

function periodOptionsHtml(options, selectedPeriodStart) {
  return options
    .map((option) => {
      const suffix = option.label === "current" ? " (Current)" : option.label === "upcoming" ? " (Upcoming)" : "";
      return `<option value="${option.periodStart}" ${option.periodStart === selectedPeriodStart ? "selected" : ""}>${formatDisplay(option.periodStart)} – ${formatDisplay(option.periodEnd)}${suffix}</option>`;
    })
    .join("");
}

export function openExpenseModal({ expense = null, defaultDate = null } = {}) {
  const state = getState();
  const categories = state.categories;
  const periodOptions = buildPeriodOptions(state.paychecks, state.projectedPeriods);
  const isEdit = Boolean(expense);
  const date = expense?.date || defaultDate || todayStr();
  const suggested = findPeriodForDate(state.paychecks, state.projectedPeriods, date);
  const selectedPeriodStart = expense?.paycheckPeriodStart || (suggested ? suggested.periodStart : date);
  const initialCategory = expense?.category || categories[0]?.name || "Miscellaneous";

  const bodyHtml = `
    <form id="expense-form" novalidate>
      <div class="field">
        <label for="exp-name">Name</label>
        <input class="input" id="exp-name" type="text" required value="${escapeHtml(expense?.name || "")}" placeholder="e.g. Rent">
      </div>
      <div class="field-row">
        <div class="field">
          <label for="exp-amount">Amount</label>
          <input class="input" id="exp-amount" type="number" min="0.01" step="0.01" required value="${expense?.amount ?? ""}" placeholder="0.00">
        </div>
        <div class="field">
          <label for="exp-date">Date</label>
          <input class="input" id="exp-date" type="date" required value="${date}">
        </div>
      </div>
      <div class="field">
        <label for="exp-category">Category</label>
        <select class="select" id="exp-category">${categoryOptionsHtml(categories, initialCategory)}</select>
      </div>
      <div class="field">
        <label for="exp-paycheck">Pay From</label>
        <select class="select" id="exp-paycheck">${periodOptionsHtml(periodOptions, selectedPeriodStart)}</select>
        <span class="field-hint">Automatically suggested based on the date. You can override it.</span>
      </div>
      <div class="field">
        <label>Status</label>
        <div class="segmented" id="exp-status-toggle">
          <button type="button" data-value="unpaid" class="${(expense ? expense.status : kindForCategory(initialCategory) === "committed" ? "unpaid" : "paid") === "unpaid" ? "active" : ""}">Unpaid</button>
          <button type="button" data-value="paid" class="${(expense ? expense.status : kindForCategory(initialCategory) === "committed" ? "unpaid" : "paid") === "paid" ? "active" : ""}">Paid</button>
        </div>
        <input type="hidden" id="exp-status" value="${expense ? expense.status : (kindForCategory(initialCategory) === "committed" ? "unpaid" : "paid")}">
      </div>
      <div class="field">
        <label for="exp-note">Note (optional)</label>
        <textarea class="input" id="exp-note" rows="2" placeholder="Add a note">${escapeHtml(expense?.note || "")}</textarea>
      </div>
      <p class="field-error hidden" id="exp-error"></p>
    </form>
  `;

  const footerHtml = `
    ${isEdit ? '<button type="button" class="btn btn-danger" id="exp-delete-btn">Delete</button>' : ""}
    <button type="button" class="btn btn-ghost" data-close="1">Cancel</button>
    <button type="button" class="btn btn-primary" id="exp-save-btn">${isEdit ? "Save Changes" : "Add Expense"}</button>
  `;

  openModal({
    title: isEdit ? "Edit Expense" : "Add Expense",
    bodyHtml,
    footerHtml,
    onMount: (modalEl, close) => {
      const categorySelect = modalEl.querySelector("#exp-category");
      const dateInput = modalEl.querySelector("#exp-date");
      const paycheckSelect = modalEl.querySelector("#exp-paycheck");
      const statusToggle = modalEl.querySelector("#exp-status-toggle");
      const statusInput = modalEl.querySelector("#exp-status");

      statusToggle.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          statusToggle.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          statusInput.value = btn.getAttribute("data-value");
        });
      });

      dateInput.addEventListener("change", () => {
        const match = findPeriodForDate(state.paychecks, state.projectedPeriods, dateInput.value);
        if (match) paycheckSelect.value = match.periodStart;
      });

      categorySelect.addEventListener("change", () => {
        if (!isEdit) {
          const target = kindForCategory(categorySelect.value) === "committed" ? "unpaid" : "paid";
          statusInput.value = target;
          statusToggle.querySelectorAll("button").forEach((b) => {
            b.classList.toggle("active", b.getAttribute("data-value") === target);
          });
        }
      });

      if (isEdit) {
        modalEl.querySelector("#exp-delete-btn").addEventListener("click", () => {
          close();
          openConfirm({
            title: "Delete Expense",
            message: `Are you sure you want to delete "${escapeHtml(expense.name)}"? This cannot be undone.`,
            confirmLabel: "Delete",
            onConfirm: async () => {
              await deleteExpense(expense.id);
              await refreshExpenses();
              showToast("Expense deleted", "success");
            }
          });
        });
      }

      modalEl.querySelector("#exp-save-btn").addEventListener("click", async () => {
        const name = modalEl.querySelector("#exp-name").value.trim();
        const amount = modalEl.querySelector("#exp-amount").value;
        const errorEl = modalEl.querySelector("#exp-error");

        if (!name) {
          errorEl.textContent = "Please enter a name for this expense.";
          errorEl.classList.remove("hidden");
          return;
        }
        if (!isValidAmount(amount)) {
          errorEl.textContent = "Please enter a valid amount greater than zero.";
          errorEl.classList.remove("hidden");
          return;
        }

        const payload = {
          name,
          amount: Number(amount),
          date: dateInput.value,
          category: categorySelect.value,
          paycheckPeriodStart: paycheckSelect.value,
          status: statusInput.value,
          note: modalEl.querySelector("#exp-note").value.trim()
        };

        try {
          if (isEdit) {
            await updateExpense(expense.id, payload);
            showToast("Expense updated", "success");
          } else {
            await createExpense(payload);
            showToast("Expense added", "success");
          }
          await refreshExpenses();
          close();
        } catch (err) {
          errorEl.textContent = "Something went wrong saving this expense.";
          errorEl.classList.remove("hidden");
        }
      });
    }
  });
}

export function renderExpenseListItem(expense) {
  const today = todayStr();
  const urgency = getDueUrgency(expense, today);
  const statusBadge = expense.status === "paid"
    ? `<span class="badge badge-paid">Paid</span>`
    : urgency === "overdue"
      ? `<span class="badge badge-overdue">Overdue</span>`
      : urgency === "due-today"
        ? `<span class="badge badge-unpaid">Due Today</span>`
        : `<span class="badge badge-unpaid">Upcoming</span>`;
  const kindBadge = expense.kind === "committed"
    ? `<span class="badge badge-committed">Committed</span>`
    : `<span class="badge badge-actual">Actual</span>`;

  return `
    <div class="list-item" data-expense-id="${expense.id}">
      <div class="list-icon expense"><i data-lucide="${iconForCategory(expense.category)}"></i></div>
      <div class="list-body">
        <div class="list-title">${escapeHtml(expense.name)}</div>
        <div class="list-sub">${escapeHtml(expense.category)} · ${formatDisplay(expense.date)} ${statusBadge} ${kindBadge}</div>
      </div>
      <div class="list-actions">
        <div class="list-amount negative">-${formatCurrency(expense.amount)}</div>
        ${expense.status === "unpaid"
          ? `<button class="btn btn-sm btn-secondary" data-mark-paid="${expense.id}">Done</button>`
          : `<button class="btn btn-sm btn-ghost" data-mark-unpaid="${expense.id}">Undo</button>`}
        <button class="btn btn-icon btn-ghost" data-edit-expense="${expense.id}" aria-label="Edit"><i data-lucide="pencil"></i></button>
      </div>
    </div>
  `;
}

export function attachExpenseListHandlers(container) {
  container.querySelectorAll("[data-edit-expense]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-expense");
      const expense = getState().expenses.find((e) => e.id === id);
      if (expense) openExpenseModal({ expense });
    });
  });
  container.querySelectorAll("[data-mark-paid]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-mark-paid");
      await setExpenseStatus(id, "paid");
      await refreshExpenses();
      showToast("Marked as paid", "success");
    });
  });
  container.querySelectorAll("[data-mark-unpaid]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-mark-unpaid");
      await setExpenseStatus(id, "unpaid");
      await refreshExpenses();
      showToast("Marked as unpaid", "info");
    });
  });
}
