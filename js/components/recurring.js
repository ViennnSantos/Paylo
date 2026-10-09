import { openModal, openConfirm } from "./modal.js";
import { showToast } from "./toast.js";
import { createRecurring, updateRecurring, setRecurringActive, deleteRecurring, generateRecurringOccurrences } from "../db/recurring.js";
import { getState, refreshRecurring, refreshExpenses } from "../state.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDisplay, todayStr } from "../utils/dates.js";
import { isValidAmount, escapeHtml } from "../utils/helpers.js";

function labelForFrequency(freq) {
  const map = { weekly: "Weekly", biweekly: "Every 2 Weeks", monthly: "Monthly", yearly: "Yearly" };
  return map[freq] || freq;
}

export function openRecurringModal(editing = null) {
  const state = getState();
  const isEdit = Boolean(editing);

  const bodyHtml = `
    <form id="recurring-form" novalidate>
      <div class="field">
        <label for="rec-name">Name</label>
        <input class="input" id="rec-name" type="text" placeholder="e.g. Internet" value="${escapeHtml(editing?.name || "")}">
      </div>
      <div class="field-row">
        <div class="field">
          <label for="rec-amount">Amount</label>
          <input class="input" id="rec-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value="${editing?.amount ?? ""}">
        </div>
        <div class="field">
          <label for="rec-frequency">Frequency</label>
          <select class="select" id="rec-frequency">
            <option value="weekly" ${editing?.frequency === "weekly" ? "selected" : ""}>Weekly</option>
            <option value="biweekly" ${editing?.frequency === "biweekly" ? "selected" : ""}>Every 2 Weeks</option>
            <option value="monthly" ${!editing || editing.frequency === "monthly" ? "selected" : ""}>Monthly</option>
            <option value="yearly" ${editing?.frequency === "yearly" ? "selected" : ""}>Yearly</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="rec-start">Start Date / Due Day</label>
          <input class="input" id="rec-start" type="date" value="${editing?.startDate || todayStr()}">
        </div>
        <div class="field">
          <label for="rec-end">End Date (optional)</label>
          <input class="input" id="rec-end" type="date" value="${editing?.endDate || ""}">
        </div>
      </div>
      <div class="field">
        <label for="rec-category">Category</label>
        <select class="select" id="rec-category">
          ${state.categories.map((c) => `<option value="${escapeHtml(c.name)}" ${c.name === (editing?.category || "Rent") ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="rec-note">Note (optional)</label>
        <textarea class="input" id="rec-note" rows="2">${escapeHtml(editing?.note || "")}</textarea>
      </div>
      <p class="field-error hidden" id="rec-error"></p>
    </form>
  `;
  openModal({
    title: isEdit ? "Edit Recurring Expense" : "Add Recurring Expense",
    bodyHtml,
    footerHtml: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="rec-save-btn">${isEdit ? "Save Changes" : "Add Recurring Expense"}</button>`,
    onMount: (modalEl, close) => {
      modalEl.querySelector("#rec-save-btn").addEventListener("click", async () => {
        const errorEl = modalEl.querySelector("#rec-error");
        const name = modalEl.querySelector("#rec-name").value.trim();
        const amount = modalEl.querySelector("#rec-amount").value;
        const startDate = modalEl.querySelector("#rec-start").value;
        if (!name || !isValidAmount(amount)) {
          errorEl.textContent = "Please enter a valid name and amount.";
          errorEl.classList.remove("hidden");
          return;
        }
        if (!startDate) {
          errorEl.textContent = "Please select a start date.";
          errorEl.classList.remove("hidden");
          return;
        }

        const payload = {
          name,
          amount: Number(amount),
          frequency: modalEl.querySelector("#rec-frequency").value,
          startDate,
          endDate: modalEl.querySelector("#rec-end").value || null,
          category: modalEl.querySelector("#rec-category").value,
          note: modalEl.querySelector("#rec-note").value.trim()
        };

        const freshState = getState();
        if (isEdit) {
          await updateRecurring(editing.id, payload);
          showToast("Recurring expense updated", "success");
        } else {
          const rule = await createRecurring(payload, freshState.paychecks, freshState.projectedPeriods);
          await generateRecurringOccurrences(rule, freshState.paychecks, freshState.projectedPeriods, 6);
          showToast("Recurring expense added", "success");
        }
        await refreshRecurring();
        await refreshExpenses();
        close();
      });
    }
  });
}

export function renderRecurringSection(container) {
  const state = getState();
  const rules = state.recurringRules;

  container.innerHTML = `
    <div class="section-title">Recurring Expenses <button class="btn btn-secondary btn-sm" id="add-recurring-btn"><i data-lucide="plus"></i>Add</button></div>
    <div id="recurring-list"></div>
  `;

  renderRecurringList(container.querySelector("#recurring-list"), rules);

  if (window.lucide) window.lucide.createIcons();
  container.querySelector("#add-recurring-btn").addEventListener("click", () => openRecurringModal());
}

let expandedId = null;

function renderRecurringList(listEl, rules) {
  const state = getState();

  if (rules.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><i data-lucide="repeat"></i><div class="empty-state-title">No recurring expenses</div><p>Add rent, subscriptions, or bills that repeat automatically.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  listEl.innerHTML = rules.map((rule) => {
    const occurrences = state.expenses.filter((e) => e.recurringId === rule.id).sort((a, b) => (a.date < b.date ? -1 : 1));
    const isOpen = expandedId === rule.id;
    return `
      <div class="recurring-row" style="margin-bottom:8px;">
        <div class="recurring-row-main">
          <div class="list-icon expense"><i data-lucide="repeat"></i></div>
          <div class="list-body">
            <div class="list-title">${escapeHtml(rule.name)} ${!rule.active ? '<span class="badge badge-neutral">Paused</span>' : ""}</div>
            <div class="list-sub">${escapeHtml(rule.category)} · ${labelForFrequency(rule.frequency)} · starts ${formatDisplay(rule.startDate)}</div>
          </div>
          <div class="list-amount negative">${formatCurrency(rule.amount)}</div>
          <button class="btn btn-icon btn-ghost" data-toggle-occurrences="${rule.id}" aria-label="View occurrences"><i data-lucide="chevron-down" class="${isOpen ? "chevron open" : "chevron"}"></i></button>
          <button class="btn btn-icon btn-ghost" data-toggle-active="${rule.id}" aria-label="${rule.active ? "Pause" : "Resume"}"><i data-lucide="${rule.active ? "pause" : "play"}"></i></button>
          <button class="btn btn-icon btn-ghost" data-edit-recurring="${rule.id}" aria-label="Edit"><i data-lucide="pencil"></i></button>
          <button class="btn btn-icon btn-danger" data-delete-recurring="${rule.id}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
        </div>
        ${isOpen ? `
          <div class="recurring-occurrences">
            ${occurrences.length
              ? occurrences.map((o) => `
                  <div class="recurring-occurrence-row">
                    <span>${formatDisplay(o.date)}</span>
                    <span>${formatCurrency(o.amount)}</span>
                    <span class="badge ${o.status === "paid" ? "badge-paid" : "badge-unpaid"}">${o.status === "paid" ? "Paid" : "Unpaid"}</span>
                  </div>
                `).join("")
              : `<span class="field-hint">No occurrences generated yet.</span>`}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  if (window.lucide) window.lucide.createIcons();

  listEl.querySelectorAll("[data-toggle-occurrences]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-occurrences");
      expandedId = expandedId === id ? null : id;
      renderRecurringList(listEl, getState().recurringRules);
    });
  });

  listEl.querySelectorAll("[data-toggle-active]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-toggle-active");
      const rule = getState().recurringRules.find((r) => r.id === id);
      await setRecurringActive(id, !rule.active);
      await refreshRecurring();
      showToast(rule.active ? "Recurring expense paused" : "Recurring expense resumed", "success");
      renderRecurringList(listEl, getState().recurringRules);
    });
  });

  listEl.querySelectorAll("[data-edit-recurring]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-recurring");
      const rule = getState().recurringRules.find((r) => r.id === id);
      if (rule) openRecurringModal(rule);
    });
  });

  listEl.querySelectorAll("[data-delete-recurring]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-recurring");
      openConfirm({
        title: "Delete Recurring Expense",
        message: "This will remove all future occurrences of this recurring expense. Past occurrences remain in your history.",
        confirmLabel: "Delete",
        onConfirm: async () => {
          await deleteRecurring(id, true);
          await refreshRecurring();
          await refreshExpenses();
          showToast("Recurring expense removed", "success");
        }
      });
    });
  });
}
