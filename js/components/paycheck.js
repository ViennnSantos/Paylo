import { openModal, openConfirm } from "./modal.js";
import { showToast } from "./toast.js";
import { createPaycheck, updatePaycheckAndReassignExpenses, deletePaycheck } from "../db/paychecks.js";
import { getState, refreshPaychecks, refreshExpenses } from "../state.js";
import { computePeriodEnd } from "../calculations/paycheck.js";
import { isValidAmount } from "../utils/helpers.js";
import { todayStr } from "../utils/dates.js";

export function openPaycheckModal(editing = null) {
  const state = getState();
  const isEdit = Boolean(editing);
  const suggestedSalary = editing ? editing.salary : (state.currentPaycheck ? state.currentPaycheck.salary : "");

  const bodyHtml = `
    <form id="paycheck-form" novalidate>
      <div class="field">
        <label for="pc-date">Payday</label>
        <input class="input" id="pc-date" type="date" required value="${editing?.payDate || todayStr()}">
        <span class="field-hint">The date you actually received this salary.</span>
      </div>
      <div class="field">
        <label for="pc-salary">Salary Amount</label>
        <input class="input" id="pc-salary" type="number" min="0.01" step="0.01" required value="${suggestedSalary}" placeholder="0.00">
      </div>
      <div class="field">
        <label for="pc-note">Note (optional)</label>
        <textarea class="input" id="pc-note" rows="2">${editing?.note || ""}</textarea>
      </div>
      ${isEdit ? `<p class="field-hint">If you change the payday, expenses already assigned to this paycheck move with it automatically.</p>` : ""}
      <p class="field-error hidden" id="pc-error"></p>
    </form>
  `;

  const footerHtml = `
    ${isEdit ? '<button type="button" class="btn btn-danger" id="pc-delete-btn">Delete</button>' : ""}
    <button type="button" class="btn btn-ghost" data-close="1">Cancel</button>
    <button type="button" class="btn btn-primary" id="pc-save-btn">${isEdit ? "Save Changes" : "Record Paycheck"}</button>
  `;

  openModal({
    title: isEdit ? "Edit Paycheck" : "Record Paycheck",
    bodyHtml,
    footerHtml,
    onMount: (modalEl, close) => {
      if (isEdit) {
        modalEl.querySelector("#pc-delete-btn").addEventListener("click", () => {
          close();
          openConfirm({
            title: "Delete Paycheck",
            message: "This will permanently remove this paycheck record. Any expenses already assigned to its pay period will stay in your data but won't be grouped under a paycheck until you reassign them. This cannot be undone.",
            confirmLabel: "Delete Paycheck",
            onConfirm: async () => {
              await deletePaycheck(editing.id);
              await refreshPaychecks();
              await refreshExpenses();
              showToast("Paycheck deleted", "success");
              document.dispatchEvent(new CustomEvent("paylo:rerender"));
            }
          });
        });
      }

      modalEl.querySelector("#pc-save-btn").addEventListener("click", async () => {
        const errorEl = modalEl.querySelector("#pc-error");
        const payDate = modalEl.querySelector("#pc-date").value;
        const salary = modalEl.querySelector("#pc-salary").value;

        if (!payDate) {
          errorEl.textContent = "Please select the date you received this paycheck.";
          errorEl.classList.remove("hidden");
          return;
        }
        if (!isValidAmount(salary)) {
          errorEl.textContent = "Please enter a valid salary amount.";
          errorEl.classList.remove("hidden");
          return;
        }

        const freshState = getState();
        const periodEnd = freshState.settings.payFrequency
          ? computePeriodEnd(payDate, freshState.settings.payFrequency)
          : payDate;
        const note = modalEl.querySelector("#pc-note").value.trim();

        if (isEdit) {
          await updatePaycheckAndReassignExpenses(editing.id, {
            payDate,
            salary: Number(salary),
            periodEnd,
            note
          });
          showToast("Paycheck updated", "success");
        } else {
          await createPaycheck({
            payDate,
            salary: Number(salary),
            periodStart: payDate,
            periodEnd,
            note
          });
          showToast("Paycheck recorded", "success");
        }

        await refreshPaychecks();
        await refreshExpenses();
        close();
        document.dispatchEvent(new CustomEvent("paylo:rerender"));
      });
    }
  });
}
