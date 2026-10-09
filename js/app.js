import { loadAllData, getState, setCurrentView, subscribe } from "./state.js";
import { getSetting } from "./db/settings.js";
import { startOnboarding } from "./components/onboarding.js";
import { initNavigation, setActiveView } from "./components/navigation.js";
import { renderDashboard } from "./components/dashboard.js";
import { renderCalendar } from "./components/calendar.js";
import { renderHistory } from "./components/history.js";
import { renderLoansPage } from "./components/loans.js";
import { renderSettings } from "./components/settings.js";
import { openExpenseModal } from "./components/expenses.js";

const mainContent = document.getElementById("main-content");
const appRoot = document.getElementById("app");

const RENDERERS = {
  dashboard: renderDashboard,
  calendar: renderCalendar,
  history: renderHistory,
  loans: renderLoansPage,
  settings: renderSettings
};

function renderCurrentView() {
  const { currentView } = getState();
  const renderer = RENDERERS[currentView] || renderDashboard;
  renderer(mainContent);
  setActiveView(currentView);
}

function applyTheme() {
  const { settings } = getState();
  document.body.setAttribute("data-theme", settings.theme || "light");
}

async function boot() {
  const onboardingComplete = await getSetting("onboardingComplete");

  if (!onboardingComplete) {
    startOnboarding(async () => {
      await initApp();
    });
    return;
  }

  await initApp();
}

async function initApp() {
  await loadAllData();
  applyTheme();
  appRoot.classList.remove("hidden");

  initNavigation((view) => {
    setCurrentView(view);
  });

  document.getElementById("fab-add-btn")?.addEventListener("click", () => {
    openExpenseModal();
  });

  subscribe(() => {
    applyTheme();
    renderCurrentView();
  });

  document.addEventListener("paylo:rerender", () => {
    renderCurrentView();
  });

  renderCurrentView();
}

boot();
