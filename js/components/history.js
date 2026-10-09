import { getState, refreshPaychecks, refreshExpenses } from "../state.js";
import { getPaycheckDisplayPeriod, getSortedPaychecks } from "../calculations/paycheck.js";
import { calculateCommitted, calculateActualSpending, calculateTotalExpenses } from "../calculations/expenses.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDisplay } from "../utils/dates.js";
import { renderExpenseListItem, attachExpenseListHandlers } from "./expenses.js";
import { openPaycheckModal } from "./paycheck.js";
import { openConfirm } from "./modal.js";
import { showToast } from "./toast.js";
import { deletePaycheck } from "../db/paychecks.js";
import { escapeHtml } from "../utils/helpers.js";

let filters = { search: "", status: "all", category: "all" };
let openIds = new Set();

function getAllPaychecksNewestFirst() {
  return [...getSortedPaychecks(getState().paychecks)].reverse();
}

export function renderHistory(container) {
  const state = getState();
  const allPaychecks = getAllPaychecksNewestFirst();
  const categories = state.categories;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">History</h1>
        <p class="page-subtitle">See exactly where each paycheck went.</p>
      </div>
    </div>
    <div class="toolbar">
      <input class="input" style="max-width:220px;" id="hist-search" placeholder="Search expenses..." value="${escapeHtml(filters.search)}">
      <select class="select" style="max-width:160px;" id="hist-status">
        <option value="all" ${filters.status === "all" ? "selected" : ""}>All Status</option>
        <option value="paid" ${filters.status === "paid" ? "selected" : ""}>Paid</option>
        <option value="unpaid" ${filters.status === "unpaid" ? "selected" : ""}>Unpaid</option>
      </select>
      <select class="select" style="max-width:200px;" id="hist-category">
        <option value="all">All Categories</option>
        ${categories.map((c) => `<option value="${escapeHtml(c.name)}" ${filters.category === c.name ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
      </select>
    </div>
    <div id="history-groups"></div>
  `;

  wireFilters(container);
  renderGroups(container, allPaychecks);

  if (allPaychecks.length === 0) {
    container.querySelector("#history-groups").innerHTML = `
      <div class="card empty-state">
        <i data-lucide="inbox"></i>
        <div class="empty-state-title">No paychecks recorded yet</div>
        <p>Record your first paycheck from the Dashboard and it will appear here right away.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

function wireFilters(container) {
  container.querySelector("#hist-search").addEventListener("input", (e) => {
    filters.search = e.target.value;
    renderGroups(container, getAllPaychecksNewestFirst());
  });
  container.querySelector("#hist-status").addEventListener("change", (e) => {
    filters.status = e.target.value;
    renderGroups(container, getAllPaychecksNewestFirst());
  });
  container.querySelector("#hist-category").addEventListener("change", (e) => {
    filters.category = e.target.value;
    renderGroups(container, getAllPaychecksNewestFirst());
  });
}

function applyFilters(expenses) {
  return expenses.filter((e) => {
    if (filters.status !== "all" && e.status !== filters.status) return false;
    if (filters.category !== "all" && e.category !== filters.category) return false;
    if (filters.search && !e.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

function renderGroups(container, allPaychecks) {
  const state = getState();
  const groupsRoot = container.querySelector("#history-groups");
  if (allPaychecks.length === 0) return;

  const hasActiveFilters = Boolean(filters.search) || filters.status !== "all" || filters.category !== "all";

  const rows = allPaychecks.map((paycheck) => {
    const bounds = getPaycheckDisplayPeriod(state.paychecks, paycheck, state.settings.payFrequency);
    const allExpenses = state.expenses.filter((e) => e.paycheckPeriodStart === paycheck.payDate);
    const filtered = applyFilters(allExpenses);
    if (hasActiveFilters && filtered.length === 0) return "";

    const committed = calculateCommitted(allExpenses);
    const actual = calculateActualSpending(allExpenses);
    const total = calculateTotalExpenses(allExpenses);
    const remaining = paycheck.salary - total;
    const isOpen = openIds.has(paycheck.id);
    const isCurrent = state.currentPaycheck && state.currentPaycheck.id === paycheck.id;

    return `
      <div class="card history-group">
        <div class="history-header">
          <button type="button" class="history-toggle" data-toggle="${paycheck.id}">
            <i data-lucide="chevron-down" class="chevron ${isOpen ? "open" : ""}"></i>
            <div>
              <div class="history-header-title">
                ${formatDisplay(bounds.periodStart)} – ${formatDisplay(bounds.periodEnd)}
                ${isCurrent ? '<span class="badge badge-accent">Current</span>' : ""}
              </div>
              <div class="history-header-sub">Payday ${formatDisplay(paycheck.payDate)} · ${allExpenses.length} item(s)</div>
            </div>
          </button>
          <div class="history-stats">
            <div><div class="history-stat-label">Salary</div>${formatCurrency(paycheck.salary)}</div>
            <div><div class="history-stat-label">Committed</div>${formatCurrency(committed)}</div>
            <div><div class="history-stat-label">Actual</div>${formatCurrency(actual)}</div>
            <div><div class="history-stat-label">Remaining</div>${formatCurrency(remaining)}</div>
          </div>
          <div class="history-actions">
            <button class="btn btn-icon btn-ghost" data-edit-paycheck="${paycheck.id}" aria-label="Edit Paycheck"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" data-delete-paycheck="${paycheck.id}" aria-label="Delete Paycheck"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
        <div class="history-body ${isOpen ? "open" : ""}" id="body-${paycheck.id}">
          <div class="list">
            ${filtered.length
              ? filtered.map((e) => renderExpenseListItem(e)).join("")
              : `<div class="empty-state"><i data-lucide="inbox"></i><div class="empty-state-title">No expenses recorded</div></div>`}
          </div>
        </div>
      </div>
    `;
  });

  const visible = rows.filter(Boolean);
  groupsRoot.innerHTML = visible.length
    ? visible.join("")
    : `<div class="card empty-state"><i data-lucide="search-x"></i><div class="empty-state-title">No matching results</div><p>Try adjusting your filters.</p></div>`;

  if (window.lucide) window.lucide.createIcons();

  groupsRoot.querySelectorAll("[data-toggle]").forEach((toggleBtn) => {
    toggleBtn.addEventListener("click", () => {
      const id = toggleBtn.getAttribute("data-toggle");
      if (openIds.has(id)) openIds.delete(id);
      else openIds.add(id);
      renderGroups(container, allPaychecks);
    });
  });

  groupsRoot.querySelectorAll("[data-edit-paycheck]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-paycheck");
      const paycheck = getState().paychecks.find((p) => p.id === id);
      if (paycheck) openPaycheckModal(paycheck);
    });
  });

  groupsRoot.querySelectorAll("[data-delete-paycheck]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-paycheck");
      openConfirm({
        title: "Delete Paycheck",
        message: "This will permanently remove this paycheck record from your history. Any expenses already assigned to its pay period will stay in your data but won't be grouped under a paycheck until you reassign them. This cannot be undone.",
        confirmLabel: "Delete Paycheck",
        onConfirm: async () => {
          await deletePaycheck(id);
          await refreshPaychecks();
          await refreshExpenses();
          showToast("Paycheck deleted", "success");
          document.dispatchEvent(new CustomEvent("paylo:rerender"));
        }
      });
    });
  });

  attachExpenseListHandlers(groupsRoot);
}
