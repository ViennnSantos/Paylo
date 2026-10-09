# PAYLO

**Know your pay. Own your flow.**

PAYLO is a paycheck-based personal budget planner and expense tracker. It organizes your money around your actual pay periods rather than the calendar month: every paycheck you record becomes a spending period, and every bill or purchase is tracked against the paycheck responsible for it. Built with plain HTML, CSS, and JavaScript — no framework, no build step, no backend.

## Core Concept

```
PAYCHECK → SPENDING PERIOD → EXPENSES → REMAINING MONEY
```

You get paid, you record that paycheck in PAYLO, and it becomes your **current** pay period. Everything you spend during that period is tracked against it. It shows up in History immediately, marked "Current" — you don't have to wait for a future paycheck to see it there.

## Key Behaviors

- **Nothing is assumed.** A brand-new install has no paycheck, no salary, no expenses, and no history. Onboarding starts with no pay-cycle option selected, and Continue stays disabled until you pick one.
- **History shows every paycheck you've recorded, including the current one** (labeled "Current"), so recording a paycheck or adding expenses is visible in History right away. PAYLO uses your pay frequency internally to *suggest* which upcoming period a bill belongs to, but a future, not-yet-received paycheck is never fabricated or treated as received income.
- **One simple Add Expense form.** There is no separate "Committed vs. Actual Spending" toggle — you just pick a category (Rent, Loan, Gas, Food, etc.) and PAYLO classifies it as a committed bill or actual spending automatically, defaulting its paid/unpaid status accordingly.
- **Automatic paycheck assignment**, with the ability to manually reassign an expense to a different pay period.
- **Edit or delete a recorded paycheck** — from the Dashboard (current paycheck) or History (past paychecks). Correcting the payday automatically moves that paycheck's expenses with it; deleting a paycheck asks for confirmation and explains that its expenses stay in your data until reassigned.
- **Edit or delete a loan** — change the name, category, or note freely at any time. Changing the installment amount, number of terms, frequency, or first due date regenerates every installment for that loan (you're warned beforehand, since already-paid progress resets).
- **Paid / Unpaid / Overdue** status computed live from the current date. Paid expenses turn green on the Calendar and in day detail, unpaid ones stay red, so you can tell settled bills apart from pending ones at a glance.
- **Loans** generate independently trackable installment expenses (paying term 1 never touches term 2).
- **Recurring expenses** are rules that generate individual, independently trackable occurrences. Generation is idempotent — reopening the app never creates duplicates. Rules can be paused, resumed, edited, or deleted, and you can view every generated occurrence.
- **Light / Dim / Dark** themes, each purpose-designed rather than a simple color inversion.
- **Local-only storage.** All data lives in the browser's IndexedDB. There is no backend, no account, and no cloud sync. Export/Import JSON backups and a confirmed "Clear All Data" action are in Settings.

## Technology

- HTML5, modern CSS3, vanilla JavaScript (ES modules)
- IndexedDB for persistent local storage
- Lucide icons (loaded from a CDN)
- No frameworks, no build step, no backend, no `npm install` required

## Project Structure

```
paylo/
  index.html
  css/
    styles.css
    themes.css
    responsive.css
  js/
    app.js                    Entry point: onboarding gate, navigation, rendering
    state.js                  In-memory app state + derived values (current/history paychecks)
    backup.js                 Export / validate / apply JSON backups
    demo-data.js              Optional sample data loader (Settings → Demo Data)
    db/
      database.js             IndexedDB wrapper
      settings.js
      paychecks.js             Only ever creates paychecks the user explicitly records
      expenses.js              Auto-classifies committed vs. actual by category
      loans.js
      recurring.js             Idempotent occurrence generation
      categories.js
    calculations/
      paycheck.js               Current/History logic, projected future periods
      periods.js                 "Pay From" dropdown options
      expenses.js                 Totals, budgets, spending percentage
      loans.js                    Loan progress
      status.js                   Upcoming / Due Today / Overdue
    components/
      onboarding.js, navigation.js, modal.js, toast.js
      dashboard.js, calendar.js, history.js
      loans.js, recurring.js, paycheck.js, expenses.js
      settings.js
    utils/
      dates.js, currency.js, categories.js, helpers.js
  README.md
  .gitignore
```

## Data Model

- **Settings** — onboarding state, pay frequency, payday, currency, theme.
- **Paycheck** — a *received* paycheck: id, payDate, salary, period bounds, note. Only created when you use "Record Paycheck." The most recent one (by payDate) is treated as the current period on the Dashboard; History lists all of them, current one included.
- **Expense** — id, name, amount, date, category, kind (`committed`/`actual`, derived from category), status (`unpaid`/`paid`), the pay-period it's assigned to (`paycheckPeriodStart`), and optional links to a loan installment or recurring rule.
- **Loan** — name, installment amount, number of terms, frequency, first due date. Creating one generates one Expense per term.
- **RecurringRule** — name, amount, category, frequency, start/end date, active flag. Generates individual Expense occurrences, without duplicating existing ones.
- **Category** — seeded defaults (Rent, Electricity, Water, Internet, Loan, PayLater, Credit Card, Subscriptions, Insurance, Gas, Transportation, Food, Shopping, Entertainment, Health, Personal, Miscellaneous), each pre-classified as committed or actual.

All dashboard, calendar, history, and loan-progress figures are derived live from these stores — nothing is hardcoded or preloaded.

## Running Locally (VS Code)

1. Open the `paylo` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't already have it.
3. Right-click `index.html` and choose **Open with Live Server**.
4. PAYLO opens at a local address like `http://127.0.0.1:5500`. IndexedDB works normally under `http://` on localhost.

Alternatively, from a terminal in the `paylo` folder:

```bash
npx serve .
```

or, with Python installed:

```bash
python3 -m http.server 5500
```

## Testing Checklist

- [ ] First launch shows onboarding with nothing preselected; Continue is disabled until you choose a frequency (and again for payday)
- [ ] Dashboard shows an empty state with "Record Paycheck" until you log your first one
- [ ] Recording your first paycheck shows it in History immediately, labeled "Current," with its expenses grouped underneath
- [ ] Recording a second paycheck adds it to History too, and the "Current" label moves to the newest one
- [ ] History never shows a paycheck period that hasn't actually been recorded
- [ ] Marking a Calendar expense as paid turns its pill and day-detail entry green; marking it unpaid again turns it back to red
- [ ] Add Expense has a single Category field — no separate Committed/Actual dropdown — and status defaults sensibly per category
- [ ] Expenses auto-assign to the right pay period from their date, with manual override available
- [ ] An unpaid expense shows Upcoming, Due Today, or Overdue correctly based on today's date
- [ ] Editing a paycheck's payday moves its expenses to the new date automatically; deleting a paycheck asks for confirmation
- [ ] Editing a loan's amount, terms, frequency, or due date regenerates its installments (with a warning shown first); editing just the name/category/note does not
- [ ] Creating a loan generates the correct number of installments, each independently markable as paid
- [ ] Recurring expenses generate occurrences without duplicating on refresh; pause/resume/edit/delete all work
- [ ] Switching themes (Light / Dim / Dark) persists after refresh
- [ ] Export Backup downloads a valid JSON file; Import Backup restores it after confirmation
- [ ] Clear All Data requires confirmation and returns you to onboarding
- [ ] Layout adapts correctly on a narrow/mobile browser width
- [ ] Refreshing the browser preserves all data

## Deploying to GitHub

```bash
cd paylo
git init
git add .
git commit -m "Initial commit: PAYLO"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/paylo.git
git push -u origin main
```

**Important:** push the project with `git`, or drag the entire `paylo` folder itself onto GitHub's upload page. Selecting individual files for upload will flatten the folder structure and break every relative import and stylesheet link.

## Deploying to Vercel

1. Sign in to [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project**, import your `paylo` repository.
3. Vercel detects it as a static site — leave the framework preset as "Other." No build command or output directory is required.
4. Click **Deploy**.

Because PAYLO has no backend and stores data in the browser, no environment variables or server configuration are needed.

## Notes & Known Simplifications

- "Twice a month" pay periods project to the 1st and 15th of the month rather than two fully custom user-chosen days.
- Editing your pay frequency/payday in Settings only affects how future (not-yet-received) periods are projected; it does not rewrite any already-recorded paycheck or its history.
- Demo Data (Settings → Demo Data) is entirely opt-in and only adds a sample September 2026 paycheck and a few expenses if they don't already exist — a fresh install never has this data automatically.
