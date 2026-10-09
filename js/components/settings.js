import { getState, refreshSettings, refreshExpenses } from "../state.js";
import { setSettings } from "../db/settings.js";
import { openModal, openConfirm } from "./modal.js";
import { showToast } from "./toast.js";
import { CURRENCY_OPTIONS } from "../utils/currency.js";
import { formatDisplay } from "../utils/dates.js";
import { formatCurrency } from "../utils/currency.js";
import { escapeHtml, isValidAmount } from "../utils/helpers.js";
import { exportBackup, parseBackupFile, applyBackup, clearAllData } from "../backup.js";
import { renderRecurringSection } from "./recurring.js";
import { loadDemoData } from "../demo-data.js";
import { WEEKDAY_NAMES } from "../utils/dates.js";

function labelForFrequency(freq) {
  if (!freq) return "Not set";
  const map = { weekly: "Weekly", biweekly: "Every 2 Weeks", semimonthly: "Twice a Month", monthly: "Monthly" };
  return map[freq] || freq;
}

export function renderSettings(container) {
  const state = getState();
  const settings = state.settings;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Manage your pay schedule, appearance, and data.</p>
      </div>
    </div>

    <div class="card settings-group">
      <div class="section-title">Pay Schedule</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-title">Frequency</div>
          <div class="settings-row-sub">${labelForFrequency(settings.payFrequency)}</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="edit-schedule-btn">Edit</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-title">Payday</div>
          <div class="settings-row-sub">${settings.payDay || "Not set"}</div>
        </div>
      </div>
    </div>

    <div class="card settings-group">
      <div class="section-title">Appearance</div>
      <div class="settings-row">
        <div class="settings-row-title">Theme</div>
        <div class="segmented" id="theme-toggle" style="max-width:260px;">
          <button data-value="light" class="${settings.theme === "light" ? "active" : ""}">Light</button>
          <button data-value="dim" class="${settings.theme === "dim" ? "active" : ""}">Dim</button>
          <button data-value="dark" class="${settings.theme === "dark" ? "active" : ""}">Dark</button>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-row-title">Currency</div>
        <select class="select" id="currency-select" style="max-width:220px;">
          ${CURRENCY_OPTIONS.map((c) => `<option value="${c.code}" ${c.code === settings.currency ? "selected" : ""}>${c.label}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="card settings-group" id="recurring-section"></div>

    <div class="card settings-group">
      <div class="section-title">Backup</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-title">Export Backup</div>
          <div class="settings-row-sub">Save all your PAYLO data as a JSON file.</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="export-btn"><i data-lucide="download"></i>Export</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-title">Import Backup</div>
          <div class="settings-row-sub">Restore your data from a previously exported file.</div>
        </div>
        <label class="btn btn-secondary btn-sm" for="import-input"><i data-lucide="upload"></i>Import</label>
        <input type="file" id="import-input" accept="application/json" class="hidden">
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-title">Clear All Data</div>
          <div class="settings-row-sub">Permanently erase all PAYLO data from this browser.</div>
        </div>
        <button class="btn btn-danger btn-sm" id="clear-data-btn"><i data-lucide="trash-2"></i>Clear Data</button>
      </div>
    </div>

    <div class="card settings-group">
      <div class="section-title">Demo Data</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-title">Load Sample Data</div>
          <div class="settings-row-sub">Add example paychecks and expenses to explore PAYLO. This will not overwrite your existing data.</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="load-demo-btn">Load Demo Data</button>
      </div>
    </div>

    <div class="card settings-group">
      <div class="section-title">About PAYLO</div>
      <p class="page-subtitle">Know your pay. Own your flow.</p>
      <p class="field-hint">PAYLO Version 1.2.2 · Data is stored locally in this browser using IndexedDB. Nothing is sent to a server.</p>
    </div>
  `;

  renderRecurringSection(container.querySelector("#recurring-section"));

  if (window.lucide) window.lucide.createIcons();
  wireSettingsHandlers(container);
}

function wireSettingsHandlers(container) {
  container.querySelector("#theme-toggle").querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const theme = btn.getAttribute("data-value");
      document.body.setAttribute("data-theme", theme);
      await setSettings({ theme });
      await refreshSettings();
      renderSettings(container);
      showToast("Theme updated", "success");
    });
  });

  container.querySelector("#currency-select").addEventListener("change", async (e) => {
    await setSettings({ currency: e.target.value });
    await refreshSettings();
    showToast("Currency updated", "success");
  });

  container.querySelector("#edit-schedule-btn").addEventListener("click", openScheduleModal);

  container.querySelector("#export-btn").addEventListener("click", async () => {
    await exportBackup();
    showToast("Backup exported", "success");
  });

  container.querySelector("#import-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importBackup(file);
    e.target.value = "";
  });

  container.querySelector("#clear-data-btn").addEventListener("click", () => {
    openConfirm({
      title: "Clear All Data",
      message: "This will permanently delete all PAYLO data from this browser, including paychecks, expenses, loans, and recurring rules. This cannot be undone. We recommend exporting a backup first.",
      confirmLabel: "Clear Everything",
      onConfirm: async () => {
        await clearAllData();
        location.reload();
      }
    });
  });

  container.querySelector("#load-demo-btn").addEventListener("click", async () => {
    await loadDemoData();
    showToast("Demo data loaded", "success");
    document.dispatchEvent(new CustomEvent("paylo:rerender"));
  });
}

function openScheduleModal() {
  const settings = getState().settings;
  const bodyHtml = `
    <form id="schedule-form" novalidate>
      <div class="field">
        <label for="sch-frequency">Frequency</label>
        <select class="select" id="sch-frequency">
          <option value="weekly" ${settings.payFrequency === "weekly" ? "selected" : ""}>Weekly</option>
          <option value="biweekly" ${settings.payFrequency === "biweekly" ? "selected" : ""}>Every 2 Weeks</option>
          <option value="semimonthly" ${settings.payFrequency === "semimonthly" ? "selected" : ""}>Twice a Month</option>
          <option value="monthly" ${settings.payFrequency === "monthly" ? "selected" : ""}>Monthly</option>
        </select>
      </div>
      <div class="field">
        <label for="sch-payday">Payday</label>
        <select class="select" id="sch-payday">
          ${WEEKDAY_NAMES.map((d) => `<option value="${d}" ${settings.payDay === d ? "selected" : ""}>${d}</option>`).join("")}
        </select>
      </div>
      <p class="field-hint">This changes how PAYLO projects upcoming pay periods. Your recorded paychecks and history are not affected.</p>
      <p class="field-error hidden" id="sch-error"></p>
    </form>
  `;
  openModal({
    title: "Edit Pay Schedule",
    bodyHtml,
    footerHtml: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="sch-save-btn">Save</button>`,
    onMount: (modalEl, close) => {
      modalEl.querySelector("#sch-save-btn").addEventListener("click", async () => {
        await setSettings({
          payFrequency: modalEl.querySelector("#sch-frequency").value,
          payDay: modalEl.querySelector("#sch-payday").value
        });
        await refreshSettings();
        showToast("Pay schedule updated", "success");
        close();
        document.dispatchEvent(new CustomEvent("paylo:rerender"));
      });
    }
  });
}

async function importBackup(file) {
  try {
    const parsed = await parseBackupFile(file);
    openConfirm({
      title: "Import Backup",
      message: "This will replace all current PAYLO data with the contents of this backup file. Continue?",
      confirmLabel: "Import & Replace",
      onConfirm: async () => {
        await applyBackup(parsed);
        showToast("Backup imported successfully", "success");
        setTimeout(() => location.reload(), 500);
      }
    });
  } catch (err) {
    showToast(err.message || "This backup file is invalid or corrupted.", "error");
  }
}
