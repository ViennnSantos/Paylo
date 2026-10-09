import { setSettings } from "../db/settings.js";
import { CURRENCY_OPTIONS } from "../utils/currency.js";
import { WEEKDAY_NAMES } from "../utils/dates.js";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "semimonthly", label: "Twice a Month" },
  { value: "monthly", label: "Monthly" }
];

export function startOnboarding(onComplete) {
  const answers = { payFrequency: null, payDay: null, currency: "PHP" };
  let step = 0;

  const root = document.getElementById("onboarding-root");
  root.innerHTML = `<div class="onboarding-overlay" id="onboarding-overlay"></div>`;
  const overlay = document.getElementById("onboarding-overlay");

  const steps = [renderFrequencyStep, renderPayDayStep, renderCurrencyStep, renderConfirmStep];

  function goTo(index) {
    step = Math.max(0, Math.min(steps.length - 1, index));
    overlay.innerHTML = steps[step]();
    if (window.lucide) window.lucide.createIcons();
    wireStep();
  }

  function progressHtml() {
    return `<div class="onboarding-progress">${steps.map((_, i) => `<span class="${i <= step ? "active" : ""}"></span>`).join("")}</div>`;
  }

  function renderFrequencyStep() {
    return `
      <div class="onboarding-card">
        ${progressHtml()}
        <div class="onboarding-title">Welcome to PAYLO</div>
        <div class="onboarding-sub">Let's set up your pay cycle. How often do you get paid?</div>
        <div class="option-grid">
          ${FREQUENCIES.map((f) => `<button class="option-btn ${answers.payFrequency === f.value ? "selected" : ""}" data-freq="${f.value}">${f.label}</button>`).join("")}
        </div>
        <div class="onboarding-actions">
          <span></span>
          <button class="btn btn-primary" id="next-btn" ${answers.payFrequency ? "" : "disabled"}>Continue</button>
        </div>
      </div>
    `;
  }

  function renderPayDayStep() {
    return `
      <div class="onboarding-card">
        ${progressHtml()}
        <div class="onboarding-title">What day do you get paid?</div>
        <div class="onboarding-sub">This helps PAYLO line up your paycheck periods correctly.</div>
        <div class="option-grid">
          ${WEEKDAY_NAMES.map((d) => `<button class="option-btn ${answers.payDay === d ? "selected" : ""}" data-day="${d}">${d}</button>`).join("")}
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-ghost" id="back-btn">Back</button>
          <button class="btn btn-primary" id="next-btn" ${answers.payDay ? "" : "disabled"}>Continue</button>
        </div>
      </div>
    `;
  }

  function renderCurrencyStep() {
    return `
      <div class="onboarding-card">
        ${progressHtml()}
        <div class="onboarding-title">Choose your currency</div>
        <div class="onboarding-sub">You can change this later in Settings.</div>
        <div class="field">
          <select class="select" id="currency-input">
            ${CURRENCY_OPTIONS.map((c) => `<option value="${c.code}" ${answers.currency === c.code ? "selected" : ""}>${c.label}</option>`).join("")}
          </select>
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-ghost" id="back-btn">Back</button>
          <button class="btn btn-primary" id="next-btn">Continue</button>
        </div>
      </div>
    `;
  }

  function renderConfirmStep() {
    const freqLabel = FREQUENCIES.find((f) => f.value === answers.payFrequency)?.label || answers.payFrequency;
    return `
      <div class="onboarding-card">
        ${progressHtml()}
        <div class="onboarding-title">You're all set</div>
        <div class="onboarding-sub">You can record your first paycheck once you actually get paid.</div>
        <div class="confirm-summary">
          <div><strong>Frequency:</strong> ${freqLabel}</div>
          <div><strong>Payday:</strong> ${answers.payDay}</div>
          <div><strong>Currency:</strong> ${answers.currency}</div>
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-ghost" id="back-btn">Back</button>
          <button class="btn btn-primary" id="finish-btn">Get Started</button>
        </div>
      </div>
    `;
  }

  function wireStep() {
    overlay.querySelectorAll("[data-freq]").forEach((btn) => {
      btn.addEventListener("click", () => {
        answers.payFrequency = btn.getAttribute("data-freq");
        goTo(step);
      });
    });
    overlay.querySelectorAll("[data-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        answers.payDay = btn.getAttribute("data-day");
        goTo(step);
      });
    });
    overlay.querySelector("#back-btn")?.addEventListener("click", () => goTo(step - 1));
    overlay.querySelector("#next-btn")?.addEventListener("click", () => {
      if (step === 2) {
        answers.currency = overlay.querySelector("#currency-input").value;
      }
      goTo(step + 1);
    });
    overlay.querySelector("#finish-btn")?.addEventListener("click", async () => {
      await setSettings({
        onboardingComplete: true,
        payFrequency: answers.payFrequency,
        payDay: answers.payDay,
        currency: answers.currency
      });
      root.innerHTML = "";
      onComplete();
    });
  }

  goTo(0);
}
