import { getState, refreshPaychecks, refreshExpenses } from "../state.js";
import {
  calculateCommitted, calculateActualSpending, calculateTotalExpenses,
  calculateAvailableBudget, calculateSpendingPercentage, getUpcomingExpenses
} from "../calculations/expenses.js";
import { getPaycheckDisplayPeriod } from "../calculations/paycheck.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDisplay, todayStr } from "../utils/dates.js";
import { renderExpenseListItem, attachExpenseListHandlers, openExpenseModal } from "./expenses.js";
import { openPaycheckModal } from "./paycheck.js";
import { openConfirm } from "./modal.js";
import { showToast } from "./toast.js";
import { deletePaycheck } from "../db/paychecks.js";

export function renderDashboard(container) {
  const state = getState();
  const paycheck = state.currentPaycheck;

  if (!paycheck) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Record your first paycheck to start tracking your budget.</p>
        </div>
      </div>
      <div class="card empty-state">
        <i data-lucide="wallet"></i>
        <div class="empty-state-title">No paycheck recorded yet</div>
        <p>Once you record your first paycheck, PAYLO will build your dashboard around it.</p>
        <div style="display:flex; justify-content:center; margin-top:16px;">
          <button class="btn btn-primary" id="record-paycheck-btn"><i data-lucide="plus"></i>Record Paycheck</button>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    container.querySelector("#record-paycheck-btn").addEventListener("click", () => openPaycheckModal());
    return;
  }

  const expenses = state.expenses.filter((e) => e.paycheckPeriodStart === paycheck.payDate);
  const committed = calculateCommitted(expenses);
  const actual = calculateActualSpending(expenses);
  const total = calculateTotalExpenses(expenses);
  const extra = calculateAvailableBudget(paycheck.salary, expenses);
  const percent = calculateSpendingPercentage(paycheck.salary, expenses);
  const upcoming = getUpcomingExpenses(expenses, todayStr(), 6);
  const progressClass = percent >= 90 ? "danger" : percent >= 70 ? "warn" : "";
  const bounds = getPaycheckDisplayPeriod(state.paychecks, paycheck, state.settings.payFrequency);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">${formatDisplay(bounds.periodStart)} – ${formatDisplay(bounds.periodEnd)}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="record-paycheck-btn">Record Paycheck</button>
        <button class="btn btn-primary" id="quick-add-btn"><i data-lucide="plus"></i>Add Expense</button>
      </div>
    </div>

    <div class="period-bar">
      <div>
        <div class="period-label">Current Paycheck: ${formatDisplay(paycheck.payDate)} · ${formatCurrency(paycheck.salary)}</div>
        <div class="period-sub">Made a mistake entering this paycheck?</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-icon btn-ghost" id="edit-current-paycheck-btn" aria-label="Edit Paycheck"><i data-lucide="pencil"></i></button>
        <button class="btn btn-icon btn-danger" id="delete-current-paycheck-btn" aria-label="Delete Paycheck"><i data-lucide="trash-2"></i></button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Salary</div>
        <div class="metric-value">${formatCurrency(paycheck.salary)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Committed</div>
        <div class="metric-value">${formatCurrency(committed)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Actual Spending</div>
        <div class="metric-value">${formatCurrency(actual)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Expenses</div>
        <div class="metric-value">${formatCurrency(total)}</div>
      </div>
      <div class="metric-card highlight">
        <div class="metric-label">Extra Budget</div>
        <div class="metric-value">${formatCurrency(extra)}</div>
        <div class="metric-note">Safe to spend this period</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="section-title">Spending Progress <small>${formatCurrency(total)} / ${formatCurrency(paycheck.salary)}</small></div>
      <div class="progress-track"><div class="progress-fill ${progressClass}" style="width:${percent}%"></div></div>
      <div class="progress-row"><span>${percent.toFixed(1)}% used</span><span>${formatCurrency(Math.max(0, extra))} remaining</span></div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="section-title">Upcoming Bills</div>
        <div class="list" id="upcoming-list">
          ${upcoming.length
            ? upcoming.map((e) => renderExpenseListItem(e)).join("")
            : `<div class="empty-state"><i data-lucide="party-popper"></i><div class="empty-state-title">Nothing upcoming</div><p>You're all caught up for this period.</p></div>`}
        </div>
      </div>
      <div class="card">
        <div class="section-title">This Period at a Glance</div>
        <div class="list">
          <div class="list-item">
            <div class="list-icon income"><i data-lucide="banknote"></i></div>
            <div class="list-body"><div class="list-title">Salary Received</div><div class="list-sub">${formatDisplay(paycheck.payDate)}</div></div>
            <div class="list-amount positive">+${formatCurrency(paycheck.salary)}</div>
          </div>
          <div class="list-item">
            <div class="list-icon expense"><i data-lucide="receipt"></i></div>
            <div class="list-body"><div class="list-title">Total Expenses</div><div class="list-sub">${expenses.length} item(s)</div></div>
            <div class="list-amount negative">-${formatCurrency(total)}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  container.querySelector("#quick-add-btn").addEventListener("click", () => openExpenseModal());
  container.querySelector("#record-paycheck-btn").addEventListener("click", () => openPaycheckModal());
  container.querySelector("#edit-current-paycheck-btn").addEventListener("click", () => openPaycheckModal(paycheck));
  container.querySelector("#delete-current-paycheck-btn").addEventListener("click", () => {
    openConfirm({
      title: "Delete Paycheck",
      message: "This will permanently remove this paycheck record. Any expenses already assigned to its pay period will stay in your data but won't be grouped under a paycheck until you reassign them. This cannot be undone.",
      confirmLabel: "Delete Paycheck",
      onConfirm: async () => {
        await deletePaycheck(paycheck.id);
        await refreshPaychecks();
        await refreshExpenses();
        showToast("Paycheck deleted", "success");
      }
    });
  });
  attachExpenseListHandlers(container.querySelector("#upcoming-list") || container);
}
