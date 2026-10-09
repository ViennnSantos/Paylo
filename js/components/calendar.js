import { getState } from "../state.js";
import { openModal } from "./modal.js";
import { getMonthGrid, isSameMonth, formatMonthYear, formatDisplay, todayStr, addMonths } from "../utils/dates.js";
import { formatCurrency } from "../utils/currency.js";
import { escapeHtml } from "../utils/helpers.js";
import { openExpenseModal } from "./expenses.js";

let viewMonth = todayStr();

function buildEventsByDate() {
  const state = getState();
  const map = new Map();
  const push = (date, event) => {
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(event);
  };
  state.paychecks.forEach((p) => {
    push(p.payDate, { kind: "income", label: "Paycheck", amount: p.salary, refType: "paycheck" });
  });
  state.expenses.forEach((e) => {
    push(e.date, { kind: e.status === "paid" ? "paid" : "expense", label: e.name, amount: e.amount, ref: e, refType: "expense" });
  });
  return map;
}

export function renderCalendar(container) {
  const eventsByDate = buildEventsByDate();
  const days = getMonthGrid(viewMonth);
  const today = todayStr();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Calendar</h1>
        <p class="page-subtitle">See when your money comes in and goes out.</p>
      </div>
      <div class="header-actions" style="align-items:center;">
        <button class="btn btn-secondary btn-sm" id="cal-prev"><i data-lucide="chevron-left"></i></button>
        <div class="period-label" style="padding:0 8px;">${formatMonthYear(viewMonth)}</div>
        <button class="btn btn-secondary btn-sm" id="cal-next"><i data-lucide="chevron-right"></i></button>
      </div>
    </div>
    <div class="card">
      <div class="calendar-grid">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="calendar-dow">${d}</div>`).join("")}
        ${days
          .map((day) => {
            const outside = !isSameMonth(day, viewMonth);
            const isToday = day === today;
            const events = eventsByDate.get(day) || [];
            const shown = events.slice(0, 2);
            const extra = events.length - shown.length;
            return `
              <button type="button" class="calendar-cell ${outside ? "outside" : ""} ${isToday ? "today" : ""}" data-date="${day}">
                <div class="calendar-date">${Number(day.slice(8, 10))}</div>
                ${shown.map((ev) => `<div class="calendar-event ${ev.kind}">${ev.kind === "income" ? "+" : "-"}${formatCurrency(ev.amount)}</div>`).join("")}
                ${extra > 0 ? `<div class="calendar-more">+${extra} more</div>` : ""}
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  container.querySelector("#cal-prev").addEventListener("click", () => {
    viewMonth = addMonths(viewMonth, -1);
    renderCalendar(container);
  });
  container.querySelector("#cal-next").addEventListener("click", () => {
    viewMonth = addMonths(viewMonth, 1);
    renderCalendar(container);
  });

  container.querySelectorAll(".calendar-cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      const date = cell.getAttribute("data-date");
      const events = eventsByDate.get(date) || [];
      openDayModal(date, events);
    });
  });
}

function openDayModal(date, events) {
  const bodyHtml = events.length
    ? `<div class="list">
        ${events
          .map((ev) => {
            if (ev.refType === "paycheck") {
              return `
                <div class="list-item">
                  <div class="list-icon income"><i data-lucide="banknote"></i></div>
                  <div class="list-body"><div class="list-title">Paycheck</div><div class="list-sub">${formatDisplay(date)}</div></div>
                  <div class="list-amount positive">+${formatCurrency(ev.amount)}</div>
                </div>
              `;
            }
            const expense = ev.ref;
            const isPaid = expense.status === "paid";
            return `
              <div class="list-item" data-day-expense="${expense.id}" style="cursor:pointer;">
                <div class="list-icon ${isPaid ? "income" : "expense"}"><i data-lucide="receipt"></i></div>
                <div class="list-body">
                  <div class="list-title">${escapeHtml(expense.name)}</div>
                  <div class="list-sub">${escapeHtml(expense.category)} · ${isPaid ? "Paid" : "Unpaid"}</div>
                </div>
                <div class="list-amount ${isPaid ? "positive" : "negative"}">-${formatCurrency(expense.amount)}</div>
              </div>
            `;
          })
          .join("")}
      </div>`
    : `<div class="empty-state"><i data-lucide="calendar-x"></i><div class="empty-state-title">Nothing on this day</div></div>`;

  const { close, element } = openModal({
    title: formatDisplay(date),
    bodyHtml,
    footerHtml: `<button class="btn btn-ghost" data-close="1">Close</button>`
  });

  element.querySelectorAll("[data-day-expense]").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-day-expense");
      const expense = getState().expenses.find((e) => e.id === id);
      close();
      if (expense) openExpenseModal({ expense });
    });
  });
}
