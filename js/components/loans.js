import { openModal, openConfirm } from "./modal.js";
import { showToast } from "./toast.js";
import { createLoan, updateLoanFull, deleteLoan, loanScheduleChanged } from "../db/loans.js";
import { getState, refreshLoans, refreshExpenses } from "../state.js";
import { calculateLoanProgress } from "../calculations/loans.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDisplay, todayStr } from "../utils/dates.js";
import { isValidAmount, escapeHtml } from "../utils/helpers.js";

export function openLoanModal(editing = null) {
  const state = getState();
  const isEdit = Boolean(editing);

  const bodyHtml = `
    <form id="loan-form" novalidate>
      <div class="field">
        <label for="loan-name">Loan Name</label>
        <input class="input" id="loan-name" type="text" placeholder="e.g. OVT" value="${escapeHtml(editing?.name || "")}" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="loan-installment">Installment Amount</label>
          <input class="input" id="loan-installment" type="number" min="0.01" step="0.01" placeholder="0.00" value="${editing?.installmentAmount ?? ""}" required>
        </div>
        <div class="field">
          <label for="loan-terms">Number of Terms</label>
          <input class="input" id="loan-terms" type="number" min="1" step="1" placeholder="10" value="${editing?.numberOfTerms ?? ""}" required>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="loan-frequency">Frequency</label>
          <select class="select" id="loan-frequency">
            <option value="weekly" ${editing?.frequency === "weekly" ? "selected" : ""}>Weekly</option>
            <option value="biweekly" ${editing?.frequency === "biweekly" ? "selected" : ""}>Every 2 Weeks</option>
            <option value="monthly" ${!editing || editing.frequency === "monthly" ? "selected" : ""}>Monthly</option>
            <option value="yearly" ${editing?.frequency === "yearly" ? "selected" : ""}>Yearly</option>
          </select>
        </div>
        <div class="field">
          <label for="loan-first-due">First Due Date</label>
          <input class="input" id="loan-first-due" type="date" required value="${editing?.firstDueDate || todayStr()}">
        </div>
      </div>
      <div class="field">
        <label for="loan-category">Category</label>
        <select class="select" id="loan-category">
          ${state.categories.map((c) => `<option value="${escapeHtml(c.name)}" ${c.name === (editing?.category || "Loan") ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="loan-note">Note (optional)</label>
        <textarea class="input" id="loan-note" rows="2">${escapeHtml(editing?.note || "")}</textarea>
      </div>
      ${isEdit ? `<p class="field-hint" id="loan-regen-warning">Changing the installment amount, number of terms, frequency, or first due date will regenerate every installment for this loan, including resetting any that were already marked paid.</p>` : ""}
      <p class="field-error hidden" id="loan-error"></p>
    </form>
  `;
  const footerHtml = `
    ${isEdit ? '<button type="button" class="btn btn-danger" id="loan-delete-btn">Delete</button>' : ""}
    <button type="button" class="btn btn-ghost" data-close="1">Cancel</button>
    <button type="button" class="btn btn-primary" id="loan-save-btn">${isEdit ? "Save Changes" : "Create Loan"}</button>
  `;

  openModal({
    title: isEdit ? "Edit Loan" : "Add Loan",
    bodyHtml,
    footerHtml,
    onMount: (modalEl, close) => {
      if (isEdit) {
        modalEl.querySelector("#loan-delete-btn").addEventListener("click", () => {
          close();
          openConfirm({
            title: "Delete Loan",
            message: `Delete "${escapeHtml(editing.name)}" and all of its installments? This cannot be undone.`,
            confirmLabel: "Delete Loan",
            onConfirm: async () => {
              await deleteLoan(editing.id);
              await refreshLoans();
              await refreshExpenses();
              showToast("Loan deleted", "success");
            }
          });
        });
      }

      modalEl.querySelector("#loan-save-btn").addEventListener("click", async () => {
        const errorEl = modalEl.querySelector("#loan-error");
        const name = modalEl.querySelector("#loan-name").value.trim();
        const installmentAmount = modalEl.querySelector("#loan-installment").value;
        const numberOfTerms = modalEl.querySelector("#loan-terms").value;
        const firstDueDate = modalEl.querySelector("#loan-first-due").value;

        if (!name) {
          errorEl.textContent = "Please enter a loan name.";
          errorEl.classList.remove("hidden");
          return;
        }
        if (!isValidAmount(installmentAmount)) {
          errorEl.textContent = "Please enter a valid installment amount.";
          errorEl.classList.remove("hidden");
          return;
        }
        if (!numberOfTerms || Number(numberOfTerms) < 1) {
          errorEl.textContent = "Please enter a valid number of terms.";
          errorEl.classList.remove("hidden");
          return;
        }
        if (!firstDueDate) {
          errorEl.textContent = "Please select a first due date.";
          errorEl.classList.remove("hidden");
          return;
        }

        const payload = {
          name,
          installmentAmount: Number(installmentAmount),
          numberOfTerms: Number(numberOfTerms),
          frequency: modalEl.querySelector("#loan-frequency").value,
          firstDueDate,
          category: modalEl.querySelector("#loan-category").value,
          note: modalEl.querySelector("#loan-note").value.trim()
        };

        const freshState = getState();

        if (isEdit) {
          const willRegenerate = loanScheduleChanged(editing, payload);
          await updateLoanFull(editing.id, payload, freshState.paychecks, freshState.projectedPeriods, willRegenerate);
          showToast(willRegenerate ? "Loan updated and installments regenerated" : "Loan updated", "success");
        } else {
          await createLoan(payload, freshState.paychecks, freshState.projectedPeriods);
          showToast("Loan created with installments", "success");
        }

        await refreshLoans();
        await refreshExpenses();
        close();
      });
    }
  });
}

export function renderLoanCard(loan, installments) {
  const progress = calculateLoanProgress(loan, installments);
  return `
    <div class="card loan-card" data-loan-id="${loan.id}">
      <div class="loan-head">
        <div>
          <div class="list-title">${escapeHtml(loan.name)}</div>
          <div class="loan-terms">${progress.totalTerms} Terms · ${escapeHtml(loan.category)}</div>
        </div>
        <div class="list-actions">
          <button class="btn btn-icon btn-ghost" data-edit-loan="${loan.id}" aria-label="Edit Loan"><i data-lucide="pencil"></i></button>
          <button class="btn btn-icon btn-danger" data-delete-loan="${loan.id}" aria-label="Delete Loan"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${progress.percentage}%"></div></div>
      <div class="progress-row">
        <span>Paid: ${progress.paidTerms} / ${progress.totalTerms}</span>
        <span>${progress.percentage}%</span>
      </div>
      <div class="progress-row">
        <span>Paid amount: ${formatCurrency(progress.paidAmount)}</span>
        <span>Remaining: ${formatCurrency(progress.remainingAmount)}</span>
      </div>
    </div>
  `;
}

export function attachLoanHandlers(container) {
  container.querySelectorAll("[data-edit-loan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-loan");
      const loan = getState().loans.find((l) => l.id === id);
      if (loan) openLoanModal(loan);
    });
  });

  container.querySelectorAll("[data-delete-loan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-loan");
      const loan = getState().loans.find((l) => l.id === id);
      openConfirm({
        title: "Delete Loan",
        message: `Delete "${escapeHtml(loan?.name || "this loan")}" and all of its installments? This cannot be undone.`,
        confirmLabel: "Delete Loan",
        onConfirm: async () => {
          await deleteLoan(id);
          await refreshLoans();
          await refreshExpenses();
          showToast("Loan deleted", "success");
        }
      });
    });
  });
}

export function renderLoansPage(container) {
  const state = getState();
  const loans = state.loans;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Loans</h1>
        <p class="page-subtitle">Track loans, PayLater plans, and installments.</p>
      </div>
      <button class="btn btn-primary" id="add-loan-btn"><i data-lucide="plus"></i>Add Loan</button>
    </div>
    <div id="loans-list" class="loan-grid">
      ${loans.length
        ? loans.map((loan) => {
            const installments = state.expenses.filter((e) => e.loanId === loan.id);
            return renderLoanCard(loan, installments);
          }).join("")
        : `<div class="card empty-state" style="grid-column:1/-1;"><i data-lucide="landmark"></i><div class="empty-state-title">No loans yet</div><p>Add a loan to automatically generate its installments.</p></div>`}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  container.querySelector("#add-loan-btn").addEventListener("click", () => openLoanModal());
  attachLoanHandlers(container.querySelector("#loans-list"));
}
