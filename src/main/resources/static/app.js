const API_BASE = "/api/finance";

const state = {
  month: currentMonthISO(),
  accounts: [],
  expenseCategories: [],
  incomeSources: [],
  accountSettings: {},
  dashboard: null,
  expenses: [],
  incomes: [],
  fixedExpenses: [],
  fixedIncomes: [],
  msiPlans: [],
  accountCuts: [],
  accountPayments: [],
};

const elements = {
  monthPickerMonth: document.querySelector("#monthPickerMonth"),
  monthPickerYear: document.querySelector("#monthPickerYear"),
  totalIncome: document.querySelector("#totalIncome"),
  totalExpense: document.querySelector("#totalExpense"),
  currentBalance: document.querySelector("#currentBalance"),
  fixedCommitment: document.querySelector("#fixedCommitment"),
  msiActiveCount: document.querySelector("#msiActiveCount"),
  msiRemainingMonths: document.querySelector("#msiRemainingMonths"),
  msiPendingTotal: document.querySelector("#msiPendingTotal"),
  accountSummary: document.querySelector("#accountSummary"),
  categorySummary: document.querySelector("#categorySummary"),
  recentExpenses: document.querySelector("#recentExpenses"),
  expenseList: document.querySelector("#expenseList"),
  expenseLedgerPanel: document.querySelector("#expenseLedgerPanel"),
  expenseLedgerContext: document.querySelector("#expenseLedgerContext"),
  expenseLedgerContextText: document.querySelector("#expenseLedgerContextText"),
  expenseLedgerClearFilter: document.querySelector("#expenseLedgerClearFilter"),
  expenseAccountFilter: document.querySelector("#expenseAccountFilter"),
  expenseAmountSearch: document.querySelector("#expenseAmountSearch"),
  expenseShowAllToggle: document.querySelector("#expenseShowAllToggle"),
  expensePaginator: document.querySelector("#expensePaginator"),
  incomeList: document.querySelector("#incomeList"),
  fixedExpenseList: document.querySelector("#fixedExpenseList"),
  msiList: document.querySelector("#msiList"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseAccountHint: document.querySelector("#expenseAccountHint"),
  incomeForm: document.querySelector("#incomeForm"),
  accountCutForm: document.querySelector("#accountCutForm"),
  accountCutSelect: document.querySelector("#accountCutSelect"),
  accountCutDateInput: document.querySelector("#accountCutDateInput"),
  accountCutList: document.querySelector("#accountCutList"),
  accountCycleList: document.querySelector("#accountCycleList"),
  fixedExpenseForm: document.querySelector("#fixedExpenseForm"),
  fixedIncomeForm: document.querySelector("#fixedIncomeForm"),
  fixedIncomeList: document.querySelector("#fixedIncomeList"),
  virtualAccountsSection: document.querySelector("#virtualAccountsSection"),
  virtualAccountsList: document.querySelector("#virtualAccountsList"),
  fixedIncomeSource: document.querySelector("#fixedIncomeSource"),
  msiForm: document.querySelector("#msiForm"),
  expenseCategory: document.querySelector("#expenseCategory"),
  expenseAccount: document.querySelector("#expenseAccount"),
  incomeSource: document.querySelector("#incomeSource"),
  fixedCategory: document.querySelector("#fixedCategory"),
  fixedAccount: document.querySelector("#fixedAccount"),
  msiAccount: document.querySelector("#msiAccount"),
  msiCategory: document.querySelector("#msiCategory"),
  yearPicker: document.querySelector("#yearPicker"),
  yearlyStats: document.querySelector("#yearlyStats"),
  yearlyTable: document.querySelector("#yearlyTable"),
  refreshDataBtn: document.querySelector("#refreshDataBtn"),
  editExpenseDialog: document.querySelector("#editExpenseDialog"),
  editExpenseForm: document.querySelector("#editExpenseForm"),
  editExpenseClose: document.querySelector("#editExpenseClose"),
  editExpenseCategory: document.querySelector("#editExpenseCategory"),
  editExpenseAccount: document.querySelector("#editExpenseAccount"),
  editIncomeDialog: document.querySelector("#editIncomeDialog"),
  editIncomeForm: document.querySelector("#editIncomeForm"),
  editIncomeClose: document.querySelector("#editIncomeClose"),
  editIncomeSource: document.querySelector("#editIncomeSource"),
  editMsiDialog: document.querySelector("#editMsiDialog"),
  editMsiForm: document.querySelector("#editMsiForm"),
  editMsiClose: document.querySelector("#editMsiClose"),
  expenseCategoryForm: document.querySelector("#expenseCategoryForm"),
  expenseCategoryList: document.querySelector("#expenseCategoryList"),
  emptyStateTemplate: document.querySelector("#emptyStateTemplate"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingMessage: document.querySelector("#loadingMessage"),
  cardPanels: Array.from(document.querySelectorAll(".card-panel")),
};

let loadingDepth = 0;

const ledger = {
  accountFilter: "",
  categoryFilter: "",
  amountQuery: "",
  showAll: false,
  page: 0,
  pageSize: 10,
};

elements.yearPicker.value = new Date().getFullYear();

function getMonthPickerValue() {
  const m = elements.monthPickerMonth.value;
  const y = elements.monthPickerYear.value;
  return `${y}-${m}`;
}

function setMonthPickerValue(ym) {
  const [y, m] = ym.split("-");
  if (y && !Array.from(elements.monthPickerYear.options).some((option) => option.value === y)) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    elements.monthPickerYear.appendChild(option);
    Array.from(elements.monthPickerYear.options)
      .sort((a, b) => Number(a.value) - Number(b.value))
      .forEach((option) => elements.monthPickerYear.appendChild(option));
  }
  elements.monthPickerYear.value = y;
  elements.monthPickerMonth.value = m;
}

function seedMonthPicker() {
  const today = new Date();
  const currentYear = today.getFullYear();

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  elements.monthPickerMonth.innerHTML = monthNames
    .map((name, i) => {
      const val = String(i + 1).padStart(2, "0");
      return `<option value="${val}">${name}</option>`;
    }).join("");

  elements.monthPickerYear.innerHTML = [currentYear, currentYear + 1]
    .map((y) => `<option value="${y}">${y}</option>`).join("");

  setMonthPickerValue(state.month);
}

elements.cardPanels.forEach((panel) => {
  panel.open = false;
});
seedMonthPicker();

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonthISO() {
  return todayISO().slice(0, 7);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatMonth(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}-01T12:00:00`));
}

function clampDate(year, monthIndex, day) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay));
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isCardAccount(setting) {
  return setting && (setting.type === "credit" || setting.type === "store_card");
}

function usesTwoMonthPostCutover(accountName) {
  const normalized = String(accountName || "").trim().toLowerCase();
  return normalized === "stori";
}

function cloneEmptyState() {
  return elements.emptyStateTemplate.content.firstElementChild.cloneNode(true);
}

function defaultDateForMonth() {
  const selected = getMonthPickerValue() || currentMonthISO();
  return selected === currentMonthISO() ? todayISO() : `${selected}-01`;
}

function monthFromDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text.slice(0, 7) : "";
}

function resetForm(form) {
  form.reset();
  const dateInput = form.querySelector('input[type="date"]');
  if (dateInput) dateInput.value = defaultDateForMonth();
}

[elements.expenseForm, elements.incomeForm, elements.msiForm].forEach((form) => {
  if (form) resetForm(form);
});

function renderOptions(target, values, valueSelector, labelSelector) {
  target.innerHTML = values
    .map((item) => `<option value="${valueSelector(item)}">${labelSelector(item)}</option>`)
    .join("");
}

function renderMetricRows(container, rows, emptyMessage, labelKey) {
  container.innerHTML = "";
  if (!rows.length) {
    const empty = cloneEmptyState();
    empty.querySelector("strong").textContent = emptyMessage.title;
    empty.querySelector("p").textContent = emptyMessage.copy;
    container.appendChild(empty);
    return;
  }

  rows.forEach((row) => {
    const div = document.createElement("div");
    div.className = "metric-row";
    div.innerHTML = `
      <span>${row[labelKey]}</span>
      <strong>${formatMoney(row.amount)}</strong>
    `;
    container.appendChild(div);
  });
}

function renderAccountSummaryRows(rows) {
  elements.accountSummary.innerHTML = "";
  if (!rows.length) {
    const empty = cloneEmptyState();
    empty.querySelector("strong").textContent = "Sin cargos por cuenta";
    empty.querySelector("p").textContent = "Aun no hay gastos en el periodo seleccionado.";
    elements.accountSummary.appendChild(empty);
    return;
  }

  rows.forEach((row) => {
    const hasMsi = row.msi_amount > 0;
    const hasExpense = row.expense_amount > 0;
    const setting = state.accountSettings[row.account_name] || {};
    const payment = state.accountPayments.find((item) => item.account_name === row.account_name);
    const isPaid = payment?.status === "paid";
    const isCard = ["credit", "store_card"].includes(setting.type);
    const latestCut = isCard ? latestCutForAccount(row.account_name) : null;
    const hasCurrentMonthCut = latestCut && monthFromDate(latestCut.cut_date) === state.month;
    const canMarkPayment = !row.is_virtual && isCard && row.amount > 0;
    const article = document.createElement("article");
    article.className = `metric-row account-card${isPaid ? " account-card--paid" : ""}${hasCurrentMonthCut ? " account-card--cut" : ""}`;
    const virtualIncome = row.is_virtual
      ? state.fixedIncomes.find((item) => item.kind === "in_kind" && item.account_name === row.account_name)
      : null;
    if (virtualIncome) {
      const assigned = Number(virtualIncome.amount || 0);
      const spent = Number(row.expense_amount || row.amount || 0);
      const available = assigned - spent;
      article.innerHTML = `
        <button class="account-card__main" type="button" data-account-name="${row.account_name}">
          <span>${row.account_name} <span class="status-chip status-chip--neutral">Especie</span></span>
          <span class="account-breakdown account-breakdown--virtual">
            <strong class="account-breakdown__total ${available < 0 ? "text-danger" : "text-success"}">Disponible ${formatMoney(available)}</strong>
            <span class="account-breakdown__detail">Gastado ${formatMoney(spent)} de ${formatMoney(assigned)}</span>
            <span class="virtual-account-row__meters account-breakdown__meters">
              <span class="virtual-account-row__meter">
                <span>Asignado</span>
                <strong>${formatMoney(assigned)}</strong>
              </span>
              <span class="virtual-account-row__meter">
                <span>Gastado</span>
                <strong class="${spent > assigned ? "text-danger" : ""}">${formatMoney(spent)}</strong>
              </span>
              <span class="virtual-account-row__meter">
                <span>Queda</span>
                <strong class="${available < 0 ? "text-danger" : "text-success"}">${formatMoney(available)}</strong>
              </span>
            </span>
          </span>
        </button>
      `;
      elements.accountSummary.appendChild(article);
      return;
    }
    article.innerHTML = `
      <button class="account-card__main" type="button" data-account-name="${row.account_name}">
        <span>
          ${row.account_name}
          ${hasCurrentMonthCut ? ` <span class="status-chip status-chip--cut">Corte ${formatDate(latestCut.cut_date)}</span>` : ""}
          ${isPaid ? ' <span class="status-chip status-chip--paid">Pagada</span>' : ""}
        </span>
        <span class="account-breakdown">
          <strong class="account-breakdown__total">${formatMoney(row.amount)}</strong>
          ${hasExpense && hasMsi ? `<span class="account-breakdown__detail">Gastos ${formatMoney(row.expense_amount)} · MSI ${formatMoney(row.msi_amount)}</span>` : ""}
          ${isPaid && payment.paid_date ? `<span class="account-breakdown__detail">Pagado el ${formatDate(payment.paid_date)}</span>` : ""}
        </span>
      </button>
      ${canMarkPayment ? `
        <div class="account-card__actions">
          <button
            class="button ${isPaid ? "button--ghost" : "button--secondary"} button--small account-payment-status-btn"
            type="button"
            data-account-name="${row.account_name}"
            data-next-status="${isPaid ? "pending" : "paid"}"
          >${isPaid ? "Marcar pendiente" : "Marcar pagada"}</button>
        </div>
      ` : ""}
    `;
    elements.accountSummary.appendChild(article);
  });
}

function focusAccountBreakdown(accountName) {
  ledger.accountFilter = accountName || "";
  ledger.categoryFilter = "";
  ledger.page = 0;
  elements.expenseAccountFilter.value = ledger.accountFilter;
  renderLedgerExpenses();
  elements.expenseLedgerPanel.open = true;
  elements.expenseLedgerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCategorySummaryRows(rows) {
  elements.categorySummary.innerHTML = "";
  if (!rows.length) {
    const empty = cloneEmptyState();
    empty.querySelector("strong").textContent = "Sin categorias activas";
    empty.querySelector("p").textContent = "Registra gastos para ver el reparto por categoria.";
    elements.categorySummary.appendChild(empty);
    return;
  }

  const countByCategory = state.expenses.reduce((acc, item) => {
    const key = item.category_name || "";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  rows.forEach((row) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-row metric-row--button";
    button.dataset.categoryName = row.category_name;
    const movementCount = countByCategory[row.category_name] || 0;
    button.innerHTML = `
      <span>${row.category_name}</span>
      <span class="account-breakdown">
        <strong class="account-breakdown__total">${formatMoney(row.amount)}</strong>
        <span class="account-breakdown__detail">${movementCount} movimiento${movementCount === 1 ? "" : "s"}</span>
      </span>
    `;
    elements.categorySummary.appendChild(button);
  });
}

function focusCategoryBreakdown(categoryName) {
  ledger.categoryFilter = categoryName || "";
  ledger.accountFilter = "";
  ledger.page = 0;
  elements.expenseAccountFilter.value = "";
  renderLedgerExpenses();
  elements.expenseLedgerPanel.open = true;
  elements.expenseLedgerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncLedgerContext() {
  const parts = [];
  if (ledger.categoryFilter) parts.push(`Categoria: ${ledger.categoryFilter}`);
  if (ledger.accountFilter) parts.push(`Cuenta: ${ledger.accountFilter}`);
  if (ledger.amountQuery) parts.push(`Monto: ${ledger.amountQuery}`);

  if (!parts.length) {
    elements.expenseLedgerContext.hidden = true;
    elements.expenseLedgerContextText.textContent = "";
    return;
  }

  elements.expenseLedgerContext.hidden = false;
  elements.expenseLedgerContextText.textContent = `Viendo ${parts.join(" | ")}`;
}

function renderTransactions(container, items, type, mapper) {
  container.innerHTML = "";
  if (!items.length) {
    container.appendChild(cloneEmptyState());
    return;
  }

  items.forEach((item) => {
    const model = mapper(item);
    const article = document.createElement("article");
    article.className = `transaction transaction--${type}${model.className ? ` ${model.className}` : ""}`;
    article.innerHTML = `
      <div class="transaction__body">
        <p class="transaction__title">${model.title}</p>
        <p class="transaction__meta">${model.meta}</p>
      </div>
      <strong class="transaction__amount">${formatMoney(model.amount)}</strong>
    `;
    container.appendChild(article);
  });
}

function renderTableRows(container, items, formatter) {
  container.innerHTML = "";
  if (!items.length) {
    container.appendChild(cloneEmptyState());
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = formatter(item);
    container.appendChild(row);
  });
}

function paymentStatusLabel(status) {
  return status === "paid" ? "Pagado" : "Pendiente";
}

function hasPendingMsiBalance(item) {
  return Number(item.months_remaining || 0) > 0 && Number(item.pending_total || 0) > 0;
}

function latestCutForAccount(accountName) {
  return state.accountCuts.find((item) => item.account_name === accountName) || null;
}

function isExpenseAfterLatestCut(item) {
  if (!item || item.entry_type === "fixed") {
    return false;
  }
  const setting = state.accountSettings[item.account_name];
  if (!isCardAccount(setting)) {
    return false;
  }
  const latestCut = latestCutForAccount(item.account_name);
  if (!latestCut?.cut_date || !item.date) {
    return false;
  }
  if (item.date > latestCut.cut_date) {
    return true;
  }
  if (item.date < latestCut.cut_date) {
    return false;
  }
  if (!item.created_at || !latestCut.created_at) {
    return false;
  }
  return new Date(item.created_at).getTime() > new Date(latestCut.created_at).getTime();
}

function expenseCutBadge(item) {
  if (isExpenseAfterLatestCut(item)) {
    const latestCut = latestCutForAccount(item.account_name);
    return ` <span class="status-chip status-chip--new-cycle">Nuevo corte desde ${formatDate(latestCut.cut_date)}</span>`;
  }
  if (item.is_shifted_by_cut) {
    return ` <span class="status-chip status-chip--cut">Cuenta en ${formatMonth(item.report_month)}</span>`;
  }
  return "";
}

function startLoading(message) {
  loadingDepth += 1;
  elements.loadingMessage.textContent = message || "Cargando...";
  elements.loadingOverlay.hidden = false;
  document.body.classList.add("is-loading");
}

function stopLoading() {
  loadingDepth = Math.max(0, loadingDepth - 1);
  if (loadingDepth > 0) {
    return;
  }
  elements.loadingOverlay.hidden = true;
  document.body.classList.remove("is-loading");
}

async function withLoading(message, task) {
  startLoading(message);
  try {
    return await task();
  } finally {
    stopLoading();
  }
}

function renderFixedExpenseRows() {
  elements.fixedExpenseList.innerHTML = "";
  if (!state.fixedExpenses.length) {
    elements.fixedExpenseList.appendChild(cloneEmptyState());
    return;
  }

  state.fixedExpenses.forEach((item) => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <strong>${item.name}</strong>
      <span>${item.category_name} · ${item.account_name} · dia ${item.due_day}</span>
      <div class="table-row__footer">
        <div class="table-row__meta">
          <strong>${formatMoney(item.amount)}</strong>
          <span class="status-chip status-chip--${item.payment_status}">${paymentStatusLabel(item.payment_status)}</span>
          ${item.paid_date ? `<span>Pagado el ${formatDate(item.paid_date)}</span>` : `<span>Sin pago registrado en ${state.month}</span>`}
        </div>
        <div class="table-row__actions">
          <button
            class="button ${item.payment_status === "paid" ? "button--ghost" : "button--secondary"} button--small fixed-expense-status-btn"
            type="button"
            data-fixed-expense-id="${item.id}"
            data-next-status="${item.payment_status === "paid" ? "pending" : "paid"}"
          >
            ${item.payment_status === "paid" ? "Marcar pendiente" : "Marcar pagado"}
          </button>
          <button
            class="button button--danger button--small fixed-expense-delete-btn"
            type="button"
            data-fixed-expense-id="${item.id}"
            data-fixed-expense-name="${item.name}"
          >
            Eliminar
          </button>
        </div>
      </div>
    `;
    elements.fixedExpenseList.appendChild(row);
  });
}

function renderExpenseCategoryList() {
  elements.expenseCategoryList.innerHTML = "";
  if (!state.expenseCategories.length) {
    elements.expenseCategoryList.appendChild(cloneEmptyState());
    return;
  }
  const kindLabel = { variable: "Variable", fixed: "Fijo", debt: "Deuda" };
  state.expenseCategories.forEach((item) => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <strong>${item.name}</strong>
      <span>${kindLabel[item.kind] || item.kind}</span>
      <div class="table-row__footer">
        <div class="table-row__actions">
          <button
            class="button button--danger button--small expense-category-delete-btn"
            type="button"
            data-category-name="${item.name}"
          >
            Eliminar
          </button>
        </div>
      </div>
    `;
    elements.expenseCategoryList.appendChild(row);
  });
}

function expenseEntryMeta(item) {
  const parts = [formatDate(item.date), item.category_name, item.account_name];
  if (item.entry_type === "fixed") {
    parts.push("Gasto fijo");
    if (item.payment_status) {
      parts.push(paymentStatusLabel(item.payment_status));
    }
  }
  return parts.filter(Boolean).join(" · ");
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === "error") {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function syncCatalogs(data) {
  state.accounts = data.accounts || [];
  state.expenseCategories = data.expense_categories || [];
  state.incomeSources = data.income_sources || [];
  state.accountSettings = Object.fromEntries(
    state.accounts.map((account) => [
      account.name,
      {
        type: account.account_type,
        cutoffDay: account.cutoff_day || "",
        dueDay: account.payment_due_day || "",
      },
    ])
  );
}

function seedSelects() {
  const currentFilter = ledger.accountFilter;
  elements.expenseAccountFilter.innerHTML = `<option value="">Todas las cuentas</option>` +
    state.accounts.map((a) => `<option value="${a.name}"${a.name === currentFilter ? " selected" : ""}>${a.name}</option>`).join("");

  renderOptions(elements.expenseCategory, state.expenseCategories, (item) => item.name, (item) => item.name);
  renderOptions(elements.fixedCategory, state.expenseCategories, (item) => item.name, (item) => item.name);
  renderOptions(elements.expenseAccount, state.accounts, (item) => item.name, (item) => item.is_virtual ? `${item.name} (Especie)` : item.name);
  renderOptions(elements.fixedAccount, state.accounts, (item) => item.name, (item) => item.is_virtual ? `${item.name} (Especie)` : item.name);
  renderOptions(elements.msiAccount, state.accounts, (item) => item.name, (item) => item.is_virtual ? `${item.name} (Especie)` : item.name);
  renderOptions(elements.msiCategory, state.expenseCategories, (item) => item.name, (item) => item.name);
  renderOptions(elements.incomeSource, state.incomeSources, (item) => item.name, (item) => item.name);
  renderOptions(elements.editIncomeSource, state.incomeSources, (item) => item.name, (item) => item.name);
  renderOptions(elements.editExpenseCategory, state.expenseCategories, (item) => item.name, (item) => item.name);
  renderOptions(elements.editExpenseAccount, state.accounts, (item) => item.name, (item) => item.name);
  renderOptions(elements.fixedIncomeSource, state.incomeSources, (item) => item.name, (item) => item.name);
  renderOptions(
    elements.accountCutSelect,
    state.accounts.filter((item) => isCardAccount({ type: item.account_type })),
    (item) => item.name,
    (item) => item.name
  );

  renderExpenseAccountHint();
  renderExpenseCategoryList();
}

function getCycleInfo(accountName, referenceDate = new Date()) {
  const setting = state.accountSettings[accountName];
  if (!isCardAccount(setting) || !setting.cutoffDay) {
    return null;
  }

  const cutoffDay = Number(setting.cutoffDay);
  const dueDay = Number(setting.dueDay || 0);
  const referenceDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const referenceDayEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 23, 59, 59, 999);
  const currentCutoff = clampDate(referenceDay.getFullYear(), referenceDay.getMonth(), cutoffDay);
  const hasCut = referenceDay > currentCutoff;
  const lastCutoff = hasCut ? currentCutoff : clampDate(referenceDay.getFullYear(), referenceDay.getMonth() - 1, cutoffDay);
  const nextCutoff = hasCut ? clampDate(referenceDay.getFullYear(), referenceDay.getMonth() + 1, cutoffDay) : currentCutoff;
  const cycleStart = addDays(lastCutoff, 1);

  let nextPayment = null;
  if (dueDay) {
    const offset = dueDay > cutoffDay ? 0 : 1;
    nextPayment = clampDate(lastCutoff.getFullYear(), lastCutoff.getMonth() + offset, dueDay);
    if (nextPayment < referenceDay) {
      nextPayment = clampDate(nextCutoff.getFullYear(), nextCutoff.getMonth() + (dueDay > cutoffDay ? 0 : 1), dueDay);
    }
  }

  const cycleSpend = state.expenses.reduce((total, expense) => {
    if (expense.account_name !== accountName) {
      return total;
    }
    const expenseDate = new Date(`${expense.date}T12:00:00`);
    return expenseDate >= cycleStart && expenseDate <= referenceDayEnd ? total + Number(expense.amount) : total;
  }, 0);

  return { hasCut, nextCutoff, nextPayment, cycleSpend };
}

function nextDateISO(dateValue) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`;
}

function normalizeAmountText(value) {
  const text = String(value ?? "").trim().replace(/[$,\s]/g, "");
  if (!text) {
    return "";
  }
  const number = Number(text);
  return Number.isFinite(number) ? number.toFixed(2) : text;
}

function amountMatchesSearch(amount, query) {
  const normalizedQuery = normalizeAmountText(query);
  if (!normalizedQuery) {
    return true;
  }
  const normalizedAmount = normalizeAmountText(amount);
  const compactQuery = normalizedQuery.replace(/\.00$/, "");
  const compactAmount = normalizedAmount.replace(/\.00$/, "");
  return normalizedAmount.includes(normalizedQuery)
    || compactAmount.includes(compactQuery)
    || String(amount ?? "").includes(String(query).trim());
}

function renderAccountHint() {
  const accountName = elements.expenseAccount.value;
  const setting = state.accountSettings[accountName];
  if (!setting) {
    elements.expenseAccountHint.textContent = "";
    return;
  }

  if (!isCardAccount(setting)) {
    elements.expenseAccountHint.textContent = "Esta cuenta no maneja corte. El gasto impacta directo en el mes.";
    return;
  }

  if (!setting.cutoffDay) {
    elements.expenseAccountHint.textContent = "Esta tarjeta no tiene configurado día de corte todavía.";
    return;
  }

  const cycle = getCycleInfo(accountName);
  const cutoffLabel = cycle?.hasCut ? "Ya cortó" : "Corte abierto";
  const paymentText = setting.dueDay ? ` Pago: día ${setting.dueDay}.` : "";
  elements.expenseAccountHint.textContent = `${cutoffLabel}. Corte: día ${setting.cutoffDay}.${paymentText}`;
}

function renderExpenseAccountHint() {
  const accountName = elements.expenseAccount.value;
  const setting = state.accountSettings[accountName];
  const latestCut = latestCutForAccount(accountName);
  if (!setting) {
    elements.expenseAccountHint.textContent = "";
    return;
  }

  if (!isCardAccount(setting)) {
    elements.expenseAccountHint.textContent = "Esta cuenta no maneja corte. El gasto impacta directo en el mes.";
    return;
  }

  if (!setting.cutoffDay) {
    if (latestCut) {
      elements.expenseAccountHint.textContent = usesTwoMonthPostCutover(accountName)
        ? `Ultimo corte manual: ${formatDate(latestCut.cut_date)}. Los gastos posteriores se van al mes de pago +2.`
        : `Ultimo corte manual: ${formatDate(latestCut.cut_date)}. Los gastos posteriores se van al siguiente mes.`;
      return;
    }
    elements.expenseAccountHint.textContent = "Esta tarjeta no tiene configurado dia de corte todavia.";
    return;
  }

  const cycle = getCycleInfo(accountName);
  const cutoffLabel = cycle?.hasCut ? "Ya corto" : "Corte abierto";
  const paymentText = setting.dueDay ? ` Pago: dia ${setting.dueDay}.` : "";
  const manualCutText = latestCut ? ` Ultimo corte manual: ${formatDate(latestCut.cut_date)}.` : "";
  elements.expenseAccountHint.textContent = `${cutoffLabel}. Corte: dia ${setting.cutoffDay}.${paymentText}${manualCutText}`;
}


function renderLedgerExpenses() {
  const filtered = state.expenses.filter((item) => {
    if (ledger.accountFilter && item.account_name !== ledger.accountFilter) return false;
    if (ledger.categoryFilter && item.category_name !== ledger.categoryFilter) return false;
    if (!amountMatchesSearch(item.amount, ledger.amountQuery)) return false;
    return true;
  });

  const total = filtered.length;
  const totalPages = ledger.showAll ? 1 : Math.max(1, Math.ceil(total / ledger.pageSize));
  ledger.page = Math.min(ledger.page, totalPages - 1);

  const start = ledger.page * ledger.pageSize;
  const pageItems = ledger.showAll ? filtered : filtered.slice(start, start + ledger.pageSize);
  elements.expenseShowAllToggle.textContent = ledger.showAll ? "Usar paginación" : "Mostrar todos en una página";

  elements.expenseList.innerHTML = "";
  if (!pageItems.length) {
    const empty = cloneEmptyState();
    if (ledger.accountFilter || ledger.categoryFilter || ledger.amountQuery) {
      empty.querySelector("strong").textContent = "Sin movimientos para este filtro";
      empty.querySelector("p").textContent = "Prueba otra cuenta, categoria o monto para ver movimientos.";
    }
    elements.expenseList.appendChild(empty);
  } else {
    pageItems.forEach((item) => {
      const isFixed = item.entry_type === "fixed";
      const cutBadge = expenseCutBadge(item);
      const isNewCycle = isExpenseAfterLatestCut(item);
      const article = document.createElement("article");
      article.className = `transaction transaction--expense${isNewCycle ? " transaction--new-cycle" : ""}`;
      article.innerHTML = `
        <div class="transaction__body">
          <p class="transaction__title">
            ${item.description}
            ${isFixed ? `<span class="msi-card__tag" style="margin-left:6px;vertical-align:middle">Fijo</span>` : ""}
          </p>
          <p class="transaction__meta">${formatDate(item.date)} · ${item.category_name} · ${item.account_name}${cutBadge}</p>
        </div>
        <div class="transaction__aside">
          <strong class="transaction__amount">${formatMoney(item.amount)}</strong>
          ${!isFixed ? `<button class="button button--ghost button--small expense-edit-btn" type="button" data-expense-id="${item.id}">Editar</button>` : ""}
        </div>
      `;
      elements.expenseList.appendChild(article);
    });
  }
  syncLedgerContext();

  elements.expensePaginator.innerHTML = "";
  if (ledger.showAll || totalPages <= 1) return;

  const info = document.createElement("span");
  info.className = "paginator__info";
  info.textContent = `${start + 1}–${Math.min(start + ledger.pageSize, total)} de ${total}`;

  const prev = document.createElement("button");
  prev.className = "button button--ghost button--small";
  prev.textContent = "← Anterior";
  prev.disabled = ledger.page === 0;
  prev.addEventListener("click", () => { ledger.page -= 1; renderLedgerExpenses(); });

  const next = document.createElement("button");
  next.className = "button button--ghost button--small";
  next.textContent = "Siguiente →";
  next.disabled = ledger.page >= totalPages - 1;
  next.addEventListener("click", () => { ledger.page += 1; renderLedgerExpenses(); });

  elements.expensePaginator.append(prev, info, next);
}

function render() {
  const dashboard = state.dashboard || {
    totals: {
      income: 0,
      expense: 0,
      fixed_commitment: 0,
      installment_commitment: 0,
      balance: 0,
    },
    msi: {
      active_count: 0,
      remaining_months: 0,
      pending_total: 0,
    },
    expense_by_account: [],
    expense_by_category: [],
    recent_expenses: [],
  };

  elements.totalIncome.textContent = formatMoney(dashboard.totals.income);
  elements.totalExpense.textContent = formatMoney(dashboard.totals.expense);
  elements.currentBalance.textContent = formatMoney(dashboard.totals.balance);
  elements.fixedCommitment.textContent = formatMoney(dashboard.totals.installment_commitment || 0);
  elements.msiActiveCount.textContent = String(dashboard.msi.active_count || 0);
  elements.msiRemainingMonths.textContent = String(dashboard.msi.remaining_months || 0);
  elements.msiPendingTotal.textContent = formatMoney(dashboard.msi.pending_total);

  renderAccountSummaryRows(dashboard.expense_by_account);

  // Panel de cuentas de vales (in_kind fixed incomes vinculadas a cuenta virtual)
  const virtualIncomes = state.fixedIncomes.filter((fi) => fi.kind === "in_kind" && fi.account_name);
  const spentByAccount = Object.fromEntries(
    (dashboard.expense_by_account || [])
      .filter((a) => a.is_virtual)
      .map((a) => [a.account_name, a.expense_amount])
  );
  elements.virtualAccountsSection.hidden = virtualIncomes.length === 0;
  elements.virtualAccountsList.innerHTML = "";
  virtualIncomes.forEach((fi) => {
    const assigned = fi.amount;
    const spent = spentByAccount[fi.account_name] || 0;
    const available = assigned - spent;
    const article = document.createElement("article");
    article.className = "metric-row virtual-account-row";
    article.innerHTML = `
      <div class="virtual-account-row__header">
        <strong>${fi.account_name}</strong>
        <span class="status-chip status-chip--neutral">Especie</span>
      </div>
      <div class="virtual-account-row__meters">
        <div class="virtual-account-row__meter">
          <span>Asignado</span>
          <strong>${formatMoney(assigned)}</strong>
        </div>
        <div class="virtual-account-row__meter">
          <span>Gastado</span>
          <strong class="${spent > assigned ? "text-danger" : ""}">${formatMoney(spent)}</strong>
        </div>
        <div class="virtual-account-row__meter">
          <span>Disponible</span>
          <strong class="${available < 0 ? "text-danger" : "text-success"}">${formatMoney(available)}</strong>
        </div>
      </div>
    `;
    elements.virtualAccountsList.appendChild(article);
  });

  renderCategorySummaryRows(dashboard.expense_by_category);

  renderTransactions(elements.recentExpenses, dashboard.recent_expenses.slice(0, 6), "expense", (item) => {
    const cutBadge = expenseCutBadge(item);
    return {
      title: item.description,
      meta: `${formatDate(item.date)} · ${item.category_name} · ${item.account_name}${cutBadge}`,
      amount: item.amount,
      className: isExpenseAfterLatestCut(item) ? "transaction--new-cycle" : "",
    };
  });

  renderLedgerExpenses();

  renderTableRows(elements.fixedIncomeList, state.fixedIncomes, (item) => `
    <strong>${item.name}${item.kind === "in_kind" ? ' <span class="status-chip status-chip--neutral">Especie</span>' : ""}</strong>
    <span>${item.source_name} · ${formatMoney(item.amount)} / mes${item.kind === "in_kind" ? " · No cuenta en balance" : ""}</span>
    <div class="table-row__footer">
      <div class="table-row__actions">
        <button
          class="button button--danger button--small fixed-income-delete-btn"
          type="button"
          data-fixed-income-id="${item.id}"
          data-fixed-income-name="${item.name}"
        >Eliminar</button>
      </div>
    </div>
  `);

  elements.incomeList.innerHTML = "";
  const allIncomeItems = [
    ...state.fixedIncomes.map((fi) => ({ _fixed: true, ...fi })),
    ...state.incomes,
  ];
  if (!allIncomeItems.length) {
    elements.incomeList.appendChild(cloneEmptyState());
  } else {
    allIncomeItems.forEach((item) => {
      const article = document.createElement("article");
      article.className = "transaction transaction--income";
      if (item._fixed) {
        article.innerHTML = `
          <div class="transaction__body">
            <p class="transaction__title">${item.name}</p>
            <p class="transaction__meta">${item.source_name} · <span class="status-chip status-chip--paid">Fijo</span></p>
          </div>
          <strong class="transaction__amount">${formatMoney(item.amount)}</strong>
        `;
      } else {
        article.dataset.incomeId = item.id;
        article.innerHTML = `
          <div class="transaction__body">
            <p class="transaction__title">${item.description}</p>
            <p class="transaction__meta">${formatDate(item.date)} · ${item.source_name}</p>
          </div>
          <div class="transaction__aside">
            <strong class="transaction__amount">${formatMoney(item.amount)}</strong>
            <button class="button button--ghost button--small income-edit-btn" type="button" data-income-id="${item.id}">Editar</button>
          </div>
        `;
      }
      elements.incomeList.appendChild(article);
    });
  }

  renderTableRows(elements.fixedExpenseList, state.fixedExpenses, (item) => `
    <strong>${item.name}</strong>
    <span>${item.category_name} · ${item.account_name} · dia ${item.due_day}</span>
    <div class="table-row__footer">
      <div class="table-row__meta">
        <strong>${formatMoney(item.amount)}</strong>
        <span class="status-chip status-chip--${item.payment_status}">${paymentStatusLabel(item.payment_status)}</span>
        ${item.paid_date ? `<span>Pagado el ${formatDate(item.paid_date)}</span>` : `<span>Sin pago registrado en ${state.month}</span>`}
      </div>
      <button
        class="button ${item.payment_status === "paid" ? "button--ghost" : "button--secondary"} button--small fixed-expense-status-btn"
        type="button"
        data-fixed-expense-id="${item.id}"
        data-next-status="${item.payment_status === "paid" ? "pending" : "paid"}"
      >
        ${item.payment_status === "paid" ? "Marcar pendiente" : "Marcar pagado"}
      </button>
    </div>
  `);

  renderFixedExpenseRows();

  renderTableRows(elements.accountCutList, state.accountCuts.slice(0, 8), (item) => `
    <strong>${item.account_name}</strong>
    <span>Corte manual registrado: ${formatDate(item.cut_date)}</span>
  `);

  elements.msiList.innerHTML = "";
  const activeMsiPlans = state.msiPlans.filter(hasPendingMsiBalance);
  if (!activeMsiPlans.length) {
    elements.msiList.appendChild(cloneEmptyState());
  } else {
    const groups = [...activeMsiPlans]
      .sort((a, b) => (a.account_name || "").localeCompare(b.account_name || "") || (a.end_month || "").localeCompare(b.end_month || ""))
      .reduce((acc, item) => {
        const key = item.account_name || "Sin cuenta";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

    Object.entries(groups).forEach(([accountName, items]) => {
      const section = document.createElement("section");
      section.className = "msi-group";
      const totalMonthly = items.reduce((sum, item) => sum + Number(item.monthly_payment || 0), 0);
      const totalPending = items.reduce((sum, item) => sum + Number(item.pending_total || 0), 0);
      section.innerHTML = `
        <div class="msi-group__header">
          <div>
            <strong class="msi-group__title">${accountName}</strong>
            <span class="msi-group__copy">${items.length} compra${items.length === 1 ? "" : "s"} activa${items.length === 1 ? "" : "s"}</span>
          </div>
          <div class="msi-group__totals">
            <span>Mensualidad total ${formatMoney(totalMonthly)}</span>
            <span>Pendiente ${formatMoney(totalPending)}</span>
          </div>
        </div>
      `;

      items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "msi-card";
        card.innerHTML = `
          <div class="msi-card__header">
            <strong class="msi-card__name">${item.purchase_name}</strong>
            <div class="msi-card__tags">
              ${item.category_name ? `<span class="msi-card__tag">${item.category_name}</span>` : ""}
              <button type="button" class="button button--ghost button--small msi-edit-btn" data-msi-id="${item.id}">Editar</button>
            </div>
          </div>
          <div class="msi-card__metrics">
            <div class="msi-card__metric">
              <span>Mensualidad</span>
              <strong>${formatMoney(item.monthly_payment)}</strong>
            </div>
            <div class="msi-card__metric">
              <span>Meses restantes</span>
              <strong>${item.months_remaining}</strong>
            </div>
            <div class="msi-card__metric">
              <span>Total pendiente</span>
              <strong>${formatMoney(item.pending_total)}</strong>
            </div>
            <div class="msi-card__metric">
              <span>Último mes</span>
              <strong>${item.end_month || "-"}</strong>
            </div>
          </div>
        `;
        section.appendChild(card);
      });

      elements.msiList.appendChild(section);
    });
  }

  renderTableRows(
    elements.accountCycleList,
    state.accounts.map((account) => ({
      accountName: account.name,
      setting: state.accountSettings[account.name],
      cycle: getCycleInfo(account.name),
      latestCut: latestCutForAccount(account.name),
    })),
    ({ accountName, setting, cycle, latestCut }) => {
      if (!isCardAccount(setting)) {
        const typeLabel = setting.type === "debit" ? "Debito" : "Efectivo";
        return `
          <strong>${accountName}</strong>
          <span>${typeLabel}</span>
          <span>Sin corte ni fecha de pago.</span>
        `;
      }

      if (!setting.cutoffDay) {
        return `
          <strong>${accountName}</strong>
          <span>${setting.type === "store_card" ? "Tarjeta de tienda" : "Tarjeta de credito"}</span>
          <span>${latestCut ? `Ultimo corte manual: ${formatDate(latestCut.cut_date)}` : "Configura dia de corte y pago para calcular el ciclo."}</span>
        `;
      }

      const cutoffState = cycle.hasCut ? "Ya corto" : "Corte abierto";
      const nextCutoffText = formatDate(nextDateISO(cycle.nextCutoff));
      const nextPaymentText = cycle.nextPayment ? formatDate(nextDateISO(cycle.nextPayment)) : "Sin configurar";
      return `
        <strong>${accountName}</strong>
        <span>${cutoffState} · Corte ${setting.cutoffDay} · Pago ${setting.dueDay || "-"}</span>
        <span>Gasto en ciclo actual: ${formatMoney(cycle.cycleSpend)}</span>
        <span>Proximo corte: ${nextCutoffText} · Proximo pago: ${nextPaymentText}</span>
      `;
    }
  );

  renderExpenseAccountHint();
}

async function refreshFinanceData() {
  const month = getMonthPickerValue() || currentMonthISO();
  state.month = month;
  const originalRefreshLabel = elements.refreshDataBtn.textContent;
  elements.refreshDataBtn.disabled = true;
  elements.refreshDataBtn.textContent = "Cargando...";
  try {
    await withLoading("Actualizando datos...", async () => {
      const [catalogs, dashboard, expenses, incomes, fixedExpenses, fixedIncomes, msiPlans, accountCuts, accountPayments] = await Promise.all([
        apiFetch("/catalogs"),
        apiFetch(`/dashboard?month=${encodeURIComponent(month)}`),
        apiFetch(`/expenses?month=${encodeURIComponent(month)}&limit=100`),
        apiFetch(`/incomes?month=${encodeURIComponent(month)}&limit=100`),
        apiFetch(`/fixed-expenses?month=${encodeURIComponent(month)}`),
        apiFetch("/fixed-incomes?active_only=true"),
        apiFetch("/installment-plans?active_only=true"),
        apiFetch("/account-cuts?limit=50"),
        apiFetch(`/account-payments?month=${encodeURIComponent(month)}`),
      ]);

      syncCatalogs(catalogs);
      state.dashboard = dashboard;
      state.expenses = (expenses.items || []).sort((a, b) => {
        const aFixed = a.entry_type === "fixed" ? 1 : 0;
        const bFixed = b.entry_type === "fixed" ? 1 : 0;
        if (aFixed !== bFixed) return aFixed - bFixed;
        return b.date.localeCompare(a.date) || b.id - a.id;
      });
      state.incomes = incomes.items || [];
      state.fixedExpenses = fixedExpenses.items || [];
      state.fixedIncomes = fixedIncomes.items || [];
      state.msiPlans = (msiPlans.items || []).filter(hasPendingMsiBalance);
      state.accountCuts = accountCuts.items || [];
      state.accountPayments = accountPayments.items || [];

      seedSelects();
      render();
    });
  } catch (error) {
    console.error(error);
    window.alert(`No se pudo cargar finanzas: ${error.message}`);
  } finally {
    elements.refreshDataBtn.disabled = false;
    elements.refreshDataBtn.textContent = originalRefreshLabel || "Cargar datos";
  }
}

function amountClass(value) {
  if (value > 0) return "is-positive";
  if (value < 0) return "is-negative";
  return "is-zero";
}

function yearlyReferenceMonth(year) {
  const selectedMonth = getMonthPickerValue();
  if (selectedMonth && selectedMonth.slice(0, 4) === String(year)) {
    return selectedMonth;
  }
  return currentMonthISO();
}

function yearlyReportStartMonth(year) {
  const reportCreatedYear = 2026;
  const reportCreatedMonth = "2026-06";
  const numericYear = Number(year);
  if (numericYear < reportCreatedYear) {
    return `${String(year).padStart(4, "0")}-13`;
  }
  if (numericYear === reportCreatedYear) {
    return reportCreatedMonth;
  }
  return `${String(year).padStart(4, "0")}-01`;
}

function maxMonth(monthA, monthB) {
  return monthA >= monthB ? monthA : monthB;
}

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function renderYearlySummary(data) {
  const { months } = data;
  const reportStartMonth = yearlyReportStartMonth(data.year);
  const referenceMonth = yearlyReferenceMonth(data.year);
  const currentMonth = maxMonth(referenceMonth, reportStartMonth);

  const remaining = months.filter((m) => m.month >= currentMonth && m.month >= reportStartMonth);
  const remainingTotals = {
    income: remaining.reduce((s, m) => s + m.income, 0),
    expense: remaining.reduce((s, m) => s + m.expense, 0),
    msi: remaining.reduce((s, m) => s + m.msi, 0),
    get balance() { return this.income - this.expense - this.msi; },
  };

  elements.yearlyStats.innerHTML = `
    <article class="stat-card stat-card--income">
      <span>Ingresos restantes</span>
      <strong>${formatMoney(remainingTotals.income)}</strong>
    </article>
    <article class="stat-card stat-card--expense">
      <span>Gastos + fijos restantes</span>
      <strong>${formatMoney(remainingTotals.expense)}</strong>
    </article>
    <article class="stat-card stat-card--fixed">
      <span>MSI restante</span>
      <strong>${formatMoney(remainingTotals.msi)}</strong>
    </article>
    <article class="stat-card stat-card--balance">
      <span>Balance restante</span>
      <strong class="${amountClass(remainingTotals.balance)}">${formatMoney(remainingTotals.balance)}</strong>
    </article>
  `;

  // Recalculate cumulative for the full selected year.
  let runningTotal = 0;
  const rows = months.map((m, i) => {
    const isBeforeReport = m.month < reportStartMonth;
    const isFuture = m.month > referenceMonth;
    const cls = isFuture ? "is-future" : "";

    if (isBeforeReport) {
      const emptyCell = `<td class="is-future">&mdash;</td>`;
      return `
        <tr>
          <td>${MONTH_LABELS[i]}</td>
          ${emptyCell}${emptyCell}${emptyCell}${emptyCell}${emptyCell}
        </tr>
      `;
    }

    runningTotal += m.income - m.expense - m.msi;

    return `
      <tr>
        <td>${MONTH_LABELS[i]}</td>
        <td class="${cls}">${formatMoney(m.income)}</td>
        <td class="${cls}">${formatMoney(m.expense)}</td>
        <td class="${cls}">${formatMoney(m.msi)}</td>
        <td class="${`${amountClass(m.balance)} ${cls}`.trim()}">${formatMoney(m.balance)}</td>
        <td class="${`${amountClass(runningTotal)} ${cls}`.trim()}">${formatMoney(runningTotal)}</td>
      </tr>
    `;
  }).join("");

  elements.yearlyTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Mes</th>
          <th>Ingresos</th>
          <th>Gastos + fijos</th>
          <th>MSI</th>
          <th>Balance</th>
          <th>Acumulado</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="yearly-table__total">
          <td>Total pendiente</td>
          <td>${formatMoney(remainingTotals.income)}</td>
          <td>${formatMoney(remainingTotals.expense)}</td>
          <td>${formatMoney(remainingTotals.msi)}</td>
          <td class="${amountClass(remainingTotals.balance)}">${formatMoney(remainingTotals.balance)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderYearlySummaryFixed(data) {
  const { months } = data;
  const reportStartMonth = yearlyReportStartMonth(data.year);
  const referenceMonth = yearlyReferenceMonth(data.year);
  const currentMonth = maxMonth(referenceMonth, reportStartMonth);

  const remaining = months.filter((m) => m.month >= currentMonth && m.month >= reportStartMonth);
  const remainingTotals = {
    income: remaining.reduce((s, m) => s + m.income, 0),
    expense: remaining.reduce((s, m) => s + m.expense, 0),
    msi: remaining.reduce((s, m) => s + m.msi, 0),
    get balance() { return this.income - this.expense - this.msi; },
  };

  elements.yearlyStats.innerHTML = `
    <article class="stat-card stat-card--income">
      <span>Ingresos restantes</span>
      <strong>${formatMoney(remainingTotals.income)}</strong>
    </article>
    <article class="stat-card stat-card--expense">
      <span>Gastos + fijos restantes</span>
      <strong>${formatMoney(remainingTotals.expense)}</strong>
    </article>
    <article class="stat-card stat-card--fixed">
      <span>MSI restante</span>
      <strong>${formatMoney(remainingTotals.msi)}</strong>
    </article>
    <article class="stat-card stat-card--balance">
      <span>Balance restante</span>
      <strong class="${amountClass(remainingTotals.balance)}">${formatMoney(remainingTotals.balance)}</strong>
    </article>
  `;

  let runningTotal = 0;
  const rows = months.map((m, i) => {
    const isBeforeReport = m.month < reportStartMonth;
    const isFuture = m.month > referenceMonth;
    const cls = isFuture ? "is-future" : "";

    if (isBeforeReport) {
      const emptyCell = `<td class="is-future">&mdash;</td>`;
      return `
        <tr>
          <td>${MONTH_LABELS[i]}</td>
          ${emptyCell}${emptyCell}${emptyCell}${emptyCell}${emptyCell}
        </tr>
      `;
    }

    runningTotal += m.income - m.expense - m.msi;

    return `
      <tr>
        <td>${MONTH_LABELS[i]}</td>
        <td class="${cls}">${formatMoney(m.income)}</td>
        <td class="${cls}">${formatMoney(m.expense)}</td>
        <td class="${cls}">${formatMoney(m.msi)}</td>
        <td class="${`${amountClass(m.balance)} ${cls}`.trim()}">${formatMoney(m.balance)}</td>
        <td class="${`${amountClass(runningTotal)} ${cls}`.trim()}">${formatMoney(runningTotal)}</td>
      </tr>
    `;
  }).join("");

  elements.yearlyTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Mes</th>
          <th>Ingresos</th>
          <th>Gastos + fijos</th>
          <th>MSI</th>
          <th>Balance</th>
          <th>Acumulado</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="yearly-table__total">
          <td>Total pendiente</td>
          <td>${formatMoney(remainingTotals.income)}</td>
          <td>${formatMoney(remainingTotals.expense)}</td>
          <td>${formatMoney(remainingTotals.msi)}</td>
          <td class="${amountClass(remainingTotals.balance)}">${formatMoney(remainingTotals.balance)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;
}

async function refreshYearlySummary() {
  const year = elements.yearPicker.value || new Date().getFullYear();
  try {
    const data = await apiFetch(`/yearly-summary?year=${year}`);
    renderYearlySummaryFixed(data);
  } catch (error) {
    console.error("No se pudo cargar el resumen anual:", error.message);
  }
}

async function refreshFinanceViews(options = {}) {
  const targetMonth = options.month || "";
  if (targetMonth && targetMonth !== getMonthPickerValue()) {
    setMonthPickerValue(targetMonth);
  }
  if (targetMonth) {
    elements.yearPicker.value = targetMonth.slice(0, 4);
  }
  await refreshFinanceData();
  await refreshYearlySummary();
}

function setupForms() {
  [elements.expenseForm, elements.incomeForm].forEach((form) => {
    form.querySelector('input[name="date"]').value = defaultDateForMonth();
  });
  elements.accountCutDateInput.value = todayISO();

  elements.expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const month = monthFromDate(formData.get("date"));
    try {
      await withLoading("Guardando gasto...", async () => {
        await apiFetch("/expenses", {
          method: "POST",
          body: JSON.stringify({
            date: formData.get("date"),
            amount: Number(formData.get("amount")),
            description: String(formData.get("description")).trim(),
            category_name: formData.get("category"),
            account_name: formData.get("account"),
          }),
        });
        await refreshFinanceViews({ month });
        resetForm(elements.expenseForm);
      });
    } catch (error) {
      window.alert(`No se pudo guardar el gasto: ${error.message}`);
    }
  });

  elements.incomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const month = monthFromDate(formData.get("date"));
    try {
      await withLoading("Guardando ingreso...", async () => {
        await apiFetch("/incomes", {
          method: "POST",
          body: JSON.stringify({
            date: formData.get("date"),
            amount: Number(formData.get("amount")),
            description: String(formData.get("description")).trim(),
            source_name: formData.get("source"),
          }),
        });
        await refreshFinanceViews({ month });
        resetForm(elements.incomeForm);
      });
    } catch (error) {
      window.alert(`No se pudo guardar el ingreso: ${error.message}`);
    }
  });

  elements.fixedExpenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await withLoading("Guardando gasto fijo...", async () => {
        await apiFetch("/fixed-expenses", {
          method: "POST",
          body: JSON.stringify({
            name: String(formData.get("name")).trim(),
            amount: Number(formData.get("amount")),
            due_day: Number(formData.get("dueDay")),
            category_name: formData.get("category"),
            account_name: formData.get("account"),
          }),
        });
        elements.fixedExpenseForm.reset();
        await refreshFinanceViews();
      });
    } catch (error) {
      window.alert(`No se pudo guardar el gasto fijo: ${error.message}`);
    }
  });

  const msiMonthlyInput = elements.msiForm.querySelector('[name="monthlyPayment"]');
  const msiMonthsInput = elements.msiForm.querySelector('[name="monthsRemaining"]');
  const msiTotalInput = elements.msiForm.querySelector('[name="pendingTotal"]');

  function recalcMsiFields() {
    const monthly = parseFloat(msiMonthlyInput.value) || 0;
    const months = parseInt(msiMonthsInput.value) || 0;
    msiTotalInput.value = (monthly * months).toFixed(2);
  }

  msiMonthlyInput.addEventListener("input", recalcMsiFields);
  msiMonthsInput.addEventListener("input", recalcMsiFields);

  elements.msiForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const month = monthFromDate(formData.get("purchaseDate"));
    try {
      await withLoading("Guardando MSI...", async () => {
        await apiFetch("/installment-plans", {
          method: "POST",
          body: JSON.stringify({
            purchase_name: String(formData.get("name")).trim(),
            account_name: formData.get("account"),
            monthly_payment: Number(formData.get("monthlyPayment")),
            months_remaining: Number(formData.get("monthsRemaining")),
            months_total: Number(formData.get("monthsRemaining")),
            pending_total: Number(formData.get("pendingTotal")),
            purchase_date: formData.get("purchaseDate"),
            category_name: formData.get("categoryName"),
          }),
        });
        await refreshFinanceViews({ month });
        resetForm(elements.msiForm);
      });
    } catch (error) {
      window.alert(`No se pudo guardar el MSI: ${error.message}`);
    }
  });

  elements.expenseAccount.addEventListener("change", renderExpenseAccountHint);

  elements.accountCutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await withLoading("Registrando corte manual...", async () => {
        await apiFetch("/account-cuts", {
          method: "POST",
          body: JSON.stringify({
            account_name: formData.get("accountName"),
            cut_date: formData.get("cutDate"),
          }),
        });
        elements.accountCutDateInput.value = todayISO();
        await refreshFinanceViews();
      });
    } catch (error) {
      window.alert(`No se pudo registrar el corte: ${error.message}`);
    }
  });

  elements.fixedExpenseList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".fixed-expense-delete-btn");
    if (deleteButton) {
      const confirmed = window.confirm(`Se eliminará "${deleteButton.dataset.fixedExpenseName}" de los gastos fijos activos. ¿Continuar?`);
      if (!confirmed) {
        return;
      }

      deleteButton.disabled = true;
      try {
        await withLoading("Eliminando gasto fijo...", async () => {
          await apiFetch("/fixed-expenses/delete", {
            method: "POST",
            body: JSON.stringify({
              fixed_expense_id: Number(deleteButton.dataset.fixedExpenseId),
            }),
          });
          await refreshFinanceViews();
        });
      } catch (error) {
        window.alert(`No se pudo eliminar el gasto fijo: ${error.message}`);
        deleteButton.disabled = false;
      }
      return;
    }

    const button = event.target.closest(".fixed-expense-status-btn");
    if (!button) {
      return;
    }

    button.disabled = true;
    try {
      await withLoading("Actualizando gasto fijo...", async () => {
        await apiFetch("/fixed-expenses/status", {
          method: "POST",
          body: JSON.stringify({
            fixed_expense_id: Number(button.dataset.fixedExpenseId),
            payment_month: state.month,
            status: button.dataset.nextStatus,
          }),
        });
        await refreshFinanceViews();
      });
    } catch (error) {
      window.alert(`No se pudo actualizar el gasto fijo: ${error.message}`);
      button.disabled = false;
    }
  });

  elements.editExpenseClose.addEventListener("click", () => {
    elements.editExpenseDialog.close();
  });

  elements.expenseList.addEventListener("click", (event) => {
    const btn = event.target.closest(".expense-edit-btn");
    if (!btn) return;
    const id = Number(btn.dataset.expenseId);
    const expense = state.expenses.find((e) => e.id === id);
    if (!expense) return;
    const form = elements.editExpenseForm;
    form.querySelector('[name="expenseId"]').value = expense.id;
    form.querySelector('[name="date"]').value = expense.date;
    form.querySelector('[name="amount"]').value = expense.amount;
    form.querySelector('[name="description"]').value = expense.description;
    elements.editExpenseCategory.value = expense.category_name;
    elements.editExpenseAccount.value = expense.account_name;
    elements.editExpenseDialog.showModal();
  });

  elements.editExpenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.editExpenseForm);
    const id = Number(formData.get("expenseId"));
    const month = monthFromDate(formData.get("date"));
    try {
      await withLoading("Guardando cambios...", async () => {
        await apiFetch(`/expenses/${id}/update`, {
          method: "POST",
          body: JSON.stringify({
            date: formData.get("date"),
            amount: Number(formData.get("amount")),
            description: String(formData.get("description")).trim(),
            category_name: formData.get("category"),
            account_name: formData.get("account"),
          }),
        });
        elements.editExpenseDialog.close();
        await refreshFinanceViews({ month });
      });
    } catch (error) {
      window.alert(`No se pudo guardar el gasto: ${error.message}`);
    }
  });

  elements.fixedIncomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.fixedIncomeForm);
    try {
      await withLoading("Guardando ingreso fijo...", async () => {
        await apiFetch("/fixed-incomes", {
          method: "POST",
          body: JSON.stringify({
            name: String(formData.get("name")).trim(),
            amount: Number(formData.get("amount")),
            source_name: formData.get("source"),
            kind: formData.get("kind") || "cash",
          }),
        });
        elements.fixedIncomeForm.reset();
        await refreshFinanceViews();
      });
    } catch (error) {
      window.alert(`No se pudo guardar: ${error.message}`);
    }
  });

  elements.fixedIncomeList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".fixed-income-delete-btn");
    if (!btn) return;
    const confirmed = window.confirm(`Se eliminará "${btn.dataset.fixedIncomeName}" de los ingresos fijos. ¿Continuar?`);
    if (!confirmed) return;
    btn.disabled = true;
    try {
      await withLoading("Eliminando ingreso fijo...", async () => {
        await apiFetch("/fixed-incomes/delete", {
          method: "POST",
          body: JSON.stringify({ fixed_income_id: Number(btn.dataset.fixedIncomeId) }),
        });
        await refreshFinanceViews();
      });
    } catch (error) {
      window.alert(`No se pudo eliminar: ${error.message}`);
      btn.disabled = false;
    }
  });

  elements.editIncomeClose.addEventListener("click", () => {
    elements.editIncomeDialog.close();
  });

  elements.incomeList.addEventListener("click", (event) => {
    const btn = event.target.closest(".income-edit-btn");
    if (!btn) return;
    const id = Number(btn.dataset.incomeId);
    const income = state.incomes.find((i) => i.id === id);
    if (!income) return;
    const form = elements.editIncomeForm;
    form.querySelector('[name="incomeId"]').value = income.id;
    form.querySelector('[name="date"]').value = income.date;
    form.querySelector('[name="amount"]').value = income.amount;
    form.querySelector('[name="description"]').value = income.description;
    elements.editIncomeSource.value = income.source_name;
    elements.editIncomeDialog.showModal();
  });

  elements.editIncomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.editIncomeForm);
    const id = Number(formData.get("incomeId"));
    const month = monthFromDate(formData.get("date"));
    try {
      await withLoading("Guardando cambios...", async () => {
        await apiFetch(`/incomes/${id}/update`, {
          method: "POST",
          body: JSON.stringify({
            date: formData.get("date"),
            amount: Number(formData.get("amount")),
            description: String(formData.get("description")).trim(),
            source_name: formData.get("source"),
          }),
        });
        elements.editIncomeDialog.close();
        await refreshFinanceViews({ month });
      });
    } catch (error) {
      window.alert(`No se pudo guardar el ingreso: ${error.message}`);
    }
  });

  elements.editMsiClose.addEventListener("click", () => {
    elements.editMsiDialog.close();
  });

  elements.msiList.addEventListener("click", (event) => {
    const btn = event.target.closest(".msi-edit-btn");
    if (!btn) return;
    const id = Number(btn.dataset.msiId);
    const plan = state.msiPlans.find((p) => p.id === id);
    if (!plan) return;
    const form = elements.editMsiForm;
    form.querySelector('[name="msiId"]').value = plan.id;
    form.querySelector('[name="name"]').value = plan.purchase_name;
    form.querySelector('[name="monthlyPayment"]').value = plan.monthly_payment;
    form.querySelector('[name="monthsRemaining"]').value = plan.months_total || plan.months_remaining;
    form.querySelector('[name="purchaseDate"]').value = plan.purchase_date || "";
    elements.editMsiDialog.showModal();
  });

  elements.editMsiForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.editMsiForm);
    const id = Number(formData.get("msiId"));
    const month = monthFromDate(formData.get("purchaseDate"));
    try {
      await withLoading("Guardando cambios...", async () => {
        await apiFetch(`/installment-plans/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            purchase_name: String(formData.get("name")).trim(),
            monthly_payment: Number(formData.get("monthlyPayment")),
            months_remaining: Number(formData.get("monthsRemaining")),
            months_total: Number(formData.get("monthsRemaining")),
            purchase_date: formData.get("purchaseDate"),
          }),
        });
        elements.editMsiDialog.close();
        await refreshFinanceViews({ month });
      });
    } catch (error) {
      window.alert(`No se pudo guardar: ${error.message}`);
    }
  });

  elements.expenseAccountFilter.addEventListener("change", () => {
    ledger.accountFilter = elements.expenseAccountFilter.value;
    ledger.page = 0;
    renderLedgerExpenses();
  });

  elements.expenseAmountSearch.addEventListener("input", () => {
    ledger.amountQuery = elements.expenseAmountSearch.value.trim();
    ledger.page = 0;
    renderLedgerExpenses();
  });

  elements.expenseShowAllToggle.addEventListener("click", () => {
    ledger.showAll = !ledger.showAll;
    ledger.page = 0;
    renderLedgerExpenses();
  });

  elements.expenseCategoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await withLoading("Guardando categoría...", async () => {
        await apiFetch("/expense-categories", {
          method: "POST",
          body: JSON.stringify({
            name: String(formData.get("name")).trim(),
            kind: formData.get("kind"),
          }),
        });
        const catalogs = await apiFetch("/catalogs");
        syncCatalogs(catalogs);
        seedSelects();
      });
      event.currentTarget.reset();
    } catch (error) {
      window.alert(`No se pudo guardar la categoría: ${error.message}`);
    }
  });

  elements.expenseCategoryList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".expense-category-delete-btn");
    if (!btn) return;
    const confirmed = window.confirm(`Se eliminará la categoría "${btn.dataset.categoryName}". ¿Continuar?`);
    if (!confirmed) return;
    btn.disabled = true;
    try {
      await withLoading("Eliminando categoría...", async () => {
        await apiFetch("/expense-categories/delete", {
          method: "POST",
          body: JSON.stringify({ name: btn.dataset.categoryName }),
        });
        const catalogs = await apiFetch("/catalogs");
        syncCatalogs(catalogs);
        seedSelects();
      });
    } catch (error) {
      window.alert(`No se pudo eliminar: ${error.message}`);
      btn.disabled = false;
    }
  });

  elements.accountSummary.addEventListener("click", async (event) => {
    const statusButton = event.target.closest(".account-payment-status-btn");
    if (statusButton) {
      statusButton.disabled = true;
      try {
        await withLoading("Actualizando cuenta...", async () => {
          await apiFetch("/account-payments", {
            method: "POST",
            body: JSON.stringify({
              account_name: statusButton.dataset.accountName,
              payment_month: state.month,
              status: statusButton.dataset.nextStatus,
            }),
          });
          await refreshFinanceViews();
        });
      } catch (error) {
        window.alert(`No se pudo actualizar la cuenta: ${error.message}`);
        statusButton.disabled = false;
      }
      return;
    }

    const button = event.target.closest("[data-account-name]");
    if (!button) {
      return;
    }
    focusAccountBreakdown(button.dataset.accountName);
  });

  elements.categorySummary.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-name]");
    if (!button) {
      return;
    }
    focusCategoryBreakdown(button.dataset.categoryName);
  });

  elements.expenseLedgerClearFilter.addEventListener("click", () => {
    ledger.accountFilter = "";
    ledger.categoryFilter = "";
    ledger.amountQuery = "";
    ledger.showAll = false;
    ledger.page = 0;
    elements.expenseAccountFilter.value = "";
    elements.expenseAmountSearch.value = "";
    renderLedgerExpenses();
  });

  const onMonthChange = () => {
    const d = defaultDateForMonth();
    [elements.expenseForm, elements.incomeForm, elements.msiForm].forEach((form) => {
      const dateInput = form.querySelector('input[name="date"], input[name="purchaseDate"]');
      if (dateInput) dateInput.value = d;
    });
    elements.yearPicker.value = getMonthPickerValue().slice(0, 4);
    refreshFinanceViews();
  };
  elements.monthPickerMonth.addEventListener("change", onMonthChange);
  elements.monthPickerYear.addEventListener("change", onMonthChange);
  elements.refreshDataBtn.addEventListener("click", () => refreshFinanceViews());
}

function setupThemeToggle() {
  const btn = document.querySelector("#themeToggleBtn");
  function applyTheme(dark) {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    btn.textContent = dark ? "☽" : "☀︎";
    localStorage.setItem("finanzas-theme", dark ? "dark" : "light");
  }
  const isDark = document.documentElement.classList.contains("dark");
  btn.textContent = isDark ? "☽" : "☀︎";
  btn.addEventListener("click", () => {
    applyTheme(!document.documentElement.classList.contains("dark"));
  });
}

setupThemeToggle();
setupForms();
refreshFinanceViews();

elements.yearPicker.addEventListener("change", refreshYearlySummary);
