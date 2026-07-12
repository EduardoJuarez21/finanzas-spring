package com.pickster.finanzas;

import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

@Service
@Transactional
public class FinanceService {
    @PersistenceContext
    private EntityManager em;

    public Map<String, Object> catalogs() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accounts", accounts().stream().map(this::accountJson).toList());
        data.put("expense_categories", categories().stream().map(this::categoryJson).toList());
        data.put("income_sources", sources().stream().map(this::sourceJson).toList());
        return data;
    }

    public List<Map<String, Object>> expenses(String month, int limit) {
        int cappedLimit = Math.max(1, Math.min(limit, 500));
        List<Map<String, Object>> rows = new ArrayList<>();
        if (month != null) {
            YearMonth ym = requireMonth(month);
            LocalDate start = ym.atDay(1);
            LocalDate end = ym.plusMonths(1).atDay(1);
            rows.addAll(em.createQuery("""
                    select e from Expense e
                    join fetch e.account a
                    join fetch e.category c
                    where e.expenseDate >= :start and e.expenseDate < :end
                    order by e.expenseDate desc, e.id desc
                    """, Expense.class)
                .setParameter("start", start)
                .setParameter("end", end)
                .setMaxResults(cappedLimit)
                .getResultList()
                .stream()
                .map(this::expenseJson)
                .toList());
            rows.addAll(monthlyFixedExpenseEntries(ym));
        } else {
            rows.addAll(em.createQuery("""
                    select e from Expense e
                    join fetch e.account a
                    join fetch e.category c
                    order by e.expenseDate desc, e.id desc
                    """, Expense.class)
                .setMaxResults(cappedLimit)
                .getResultList()
                .stream()
                .map(this::expenseJson)
                .toList());
        }
        rows.sort((a, b) -> String.valueOf(b.get("date")).compareTo(String.valueOf(a.get("date"))));
        return rows.stream().limit(cappedLimit).toList();
    }

    public Map<String, Object> createExpense(Map<String, Object> payload) {
        Expense item = new Expense();
        applyExpense(item, payload);
        em.persist(item);
        em.flush();
        return expenseJson(item);
    }

    public Map<String, Object> updateExpense(long id, Map<String, Object> payload) {
        Expense item = find(Expense.class, id, "Gasto");
        applyExpense(item, payload);
        em.flush();
        return expenseJson(item);
    }

    public List<Map<String, Object>> incomes(String month, int limit) {
        int cappedLimit = Math.max(1, Math.min(limit, 500));
        String where = "";
        if (month != null) {
            requireMonth(month);
            where = "where i.incomeDate >= :start and i.incomeDate < :end";
        }
        var query = em.createQuery("""
                select i from Income i
                join fetch i.source s
                %s
                order by i.incomeDate desc, i.id desc
                """.formatted(where), Income.class);
        if (month != null) {
            YearMonth ym = YearMonth.parse(month);
            query.setParameter("start", ym.atDay(1));
            query.setParameter("end", ym.plusMonths(1).atDay(1));
        }
        return query.setMaxResults(cappedLimit).getResultList().stream().map(this::incomeJson).toList();
    }

    public Map<String, Object> createIncome(Map<String, Object> payload) {
        Income item = new Income();
        applyIncome(item, payload);
        em.persist(item);
        em.flush();
        return incomeJson(item);
    }

    public Map<String, Object> updateIncome(long id, Map<String, Object> payload) {
        Income item = find(Income.class, id, "Ingreso");
        applyIncome(item, payload);
        em.flush();
        return incomeJson(item);
    }

    public List<Map<String, Object>> fixedExpenses(String month) {
        YearMonth ym = month == null ? null : requireMonth(month);
        Map<Long, FixedExpensePayment> payments = ym == null ? Map.of() : fixedExpensePaymentsByMonth(ym.toString());
        return em.createQuery("""
                select f from FixedExpense f
                join fetch f.account a
                join fetch f.category c
                where f.active = true
                order by f.dueDay asc, f.name asc
                """, FixedExpense.class)
            .getResultList()
            .stream()
            .map(f -> fixedExpenseJson(f, ym, payments))
            .toList();
    }

    public Map<String, Object> createFixedExpense(Map<String, Object> payload) {
        FixedExpense item = new FixedExpense();
        item.name = requireText(payload, "name");
        item.amount = requireAmount(payload, "amount");
        item.dueDay = requireDay(payload, "due_day");
        item.account = accountByName(requireText(payload, "account_name"));
        item.category = categoryByName(requireText(payload, "category_name"));
        item.active = true;
        em.persist(item);
        em.flush();
        return fixedExpenseJson(item, null, Map.of());
    }

    public Map<String, Object> deactivateFixedExpense(Map<String, Object> payload) {
        FixedExpense item = find(FixedExpense.class, requireLong(payload, "fixed_expense_id"), "Gasto fijo");
        item.active = false;
        return map("id", item.id, "name", item.name, "is_active", false);
    }

    public Map<String, Object> upsertFixedExpensePayment(Map<String, Object> payload) {
        FixedExpense fixed = find(FixedExpense.class, requireLong(payload, "fixed_expense_id"), "Gasto fijo");
        String month = requireMonthText(payload, "payment_month");
        String status = choice(text(payload.get("status"), "pending"), "status", Set.of("pending", "paid"));
        FixedExpensePayment payment = findFixedExpensePayment(fixed, month).orElseGet(FixedExpensePayment::new);
        payment.fixedExpense = fixed;
        payment.paymentMonth = month;
        payment.status = status;
        payment.paidDate = "paid".equals(status) ? LocalDate.now() : null;
        if (payment.id == null) {
            em.persist(payment);
        }
        em.flush();
        return fixedExpensePaymentJson(payment);
    }

    public List<Map<String, Object>> fixedIncomes(boolean activeOnly) {
        String where = activeOnly ? "where f.active = true" : "";
        return em.createQuery("""
                select f from FixedIncome f
                join fetch f.source s
                left join fetch f.account a
                %s
                order by f.name asc
                """.formatted(where), FixedIncome.class)
            .getResultList()
            .stream()
            .map(this::fixedIncomeJson)
            .toList();
    }

    public Map<String, Object> createFixedIncome(Map<String, Object> payload) {
        FixedIncome item = new FixedIncome();
        item.name = requireText(payload, "name");
        item.amount = requireAmount(payload, "amount");
        item.source = sourceByName(requireText(payload, "source_name"));
        item.kind = choice(text(payload.get("kind"), "cash"), "kind", Set.of("cash", "in_kind"));
        String accountName = text(payload.get("account_name"), "");
        item.account = accountName.isBlank() ? null : accountByName(accountName);
        item.active = true;
        em.persist(item);
        em.flush();
        return fixedIncomeJson(item);
    }

    public Map<String, Object> deactivateFixedIncome(Map<String, Object> payload) {
        FixedIncome item = find(FixedIncome.class, requireLong(payload, "fixed_income_id"), "Ingreso fijo");
        item.active = false;
        return map("id", item.id, "name", item.name, "is_active", false);
    }

    public List<Map<String, Object>> installmentPlans(boolean activeOnly) {
        return installmentPlans(activeOnly, null);
    }

    public List<Map<String, Object>> installmentPlans(boolean activeOnly, String month) {
        YearMonth referenceMonth = month == null ? null : requireMonth(month);
        String where = activeOnly ? "where p.status = 'active'" : "";
        List<Map<String, Object>> rows = em.createQuery("""
                select p from InstallmentPlan p
                join fetch p.account a
                left join fetch p.category c
                %s
                order by p.id desc
                """.formatted(where), InstallmentPlan.class)
            .getResultList()
            .stream()
            .map(this::installmentJson)
            .toList();
        if (!activeOnly) {
            return rows;
        }
        return rows.stream()
            .filter(row -> number(row.get("months_remaining")).intValue() > 0)
            .filter(row -> number(row.get("pending_total")).compareTo(BigDecimal.ZERO) > 0)
            .filter(row -> referenceMonth == null || installmentActiveInMonth(row, referenceMonth))
            .toList();
    }

    public Map<String, Object> createInstallmentPlan(Map<String, Object> payload) {
        InstallmentPlan item = new InstallmentPlan();
        item.purchaseName = requireText(payload, "purchase_name");
        item.account = accountByName(requireText(payload, "account_name"));
        String categoryName = text(payload.get("category_name"), "");
        item.category = categoryName.isBlank() ? null : categoryByName(categoryName);
        item.monthlyPayment = requireAmount(payload, "monthly_payment");
        item.monthsRemaining = requireInt(payload, "months_remaining", 0);
        item.monthsTotal = intOrDefault(payload.get("months_total"), item.monthsRemaining);
        item.pendingTotal = amountOrDefault(payload.get("pending_total"), item.monthlyPayment.multiply(BigDecimal.valueOf(item.monthsRemaining)));
        item.purchaseDate = optionalDate(payload.get("purchase_date"));
        if (item.purchaseDate == null) {
            item.purchaseDate = LocalDate.now();
        }
        item.status = choice(text(payload.get("status"), "active"), "status", Set.of("active", "closed"));
        item.startMonth = resolveStartMonth(item.account, item.purchaseDate);
        item.endMonth = text(payload.get("end_month"), "");
        if (item.endMonth.isBlank()) {
            item.endMonth = YearMonth.parse(item.startMonth).plusMonths(Math.max(0, item.monthsRemaining - 1)).toString();
        } else {
            requireMonth(item.endMonth);
        }
        em.persist(item);
        em.flush();
        return installmentJson(item);
    }

    public Map<String, Object> updateInstallmentPlan(long id, Map<String, Object> payload) {
        InstallmentPlan item = find(InstallmentPlan.class, id, "MSI");
        if (payload.containsKey("purchase_name")) item.purchaseName = requireText(payload, "purchase_name");
        if (payload.containsKey("monthly_payment")) item.monthlyPayment = requireAmount(payload, "monthly_payment");
        if (payload.containsKey("months_remaining")) item.monthsRemaining = requireInt(payload, "months_remaining", 0);
        if (payload.containsKey("months_total")) item.monthsTotal = requireInt(payload, "months_total", 1);
        if (payload.containsKey("pending_total")) item.pendingTotal = requireAmount(payload, "pending_total");
        if (payload.containsKey("purchase_date")) item.purchaseDate = optionalDate(payload.get("purchase_date"));
        if (payload.containsKey("status")) item.status = choice(text(payload.get("status"), "active"), "status", Set.of("active", "closed"));
        if (payload.containsKey("category_name")) {
            String categoryName = text(payload.get("category_name"), "");
            item.category = categoryName.isBlank() ? null : categoryByName(categoryName);
        }
        if (item.pendingTotal == null && item.monthlyPayment != null && item.monthsRemaining != null) {
            item.pendingTotal = item.monthlyPayment.multiply(BigDecimal.valueOf(item.monthsRemaining));
        }
        if (item.purchaseDate != null && item.monthsRemaining != null) {
            item.endMonth = YearMonth.from(item.purchaseDate).plusMonths(Math.max(0, item.monthsRemaining - 1)).toString();
        }
        em.flush();
        return installmentJson(item);
    }

    public List<Map<String, Object>> accountCuts(String accountName, int limit) {
        int cappedLimit = Math.max(1, Math.min(limit, 200));
        String where = accountName == null ? "" : "where lower(a.name) = lower(:accountName)";
        var query = em.createQuery("""
                select c from AccountCutEvent c
                join fetch c.account a
                %s
                order by c.cutDate desc, c.id desc
                """.formatted(where), AccountCutEvent.class);
        if (accountName != null) {
            query.setParameter("accountName", accountName);
        }
        return query.setMaxResults(cappedLimit).getResultList().stream().map(this::accountCutJson).toList();
    }

    public Map<String, Object> createAccountCut(Map<String, Object> payload) {
        Account account = accountByName(requireText(payload, "account_name"));
        LocalDate cutDate = optionalDate(payload.get("cut_date"));
        if (cutDate == null) {
            cutDate = LocalDate.now();
        }
        Optional<AccountCutEvent> existing = accountCut(account, cutDate);
        AccountCutEvent item = existing.orElseGet(AccountCutEvent::new);
        item.account = account;
        item.cutDate = cutDate;
        if (item.id == null) {
            em.persist(item);
        }
        em.flush();
        return accountCutJson(item);
    }

    public List<Map<String, Object>> accountPayments(String month) {
        String monthValue = requireMonthText(month, "month");
        return em.createQuery("""
                select p from AccountPaymentStatus p
                join fetch p.account a
                where p.paymentMonth = :month
                order by a.name asc
                """, AccountPaymentStatus.class)
            .setParameter("month", monthValue)
            .getResultList()
            .stream()
            .map(this::accountPaymentJson)
            .toList();
    }

    public Map<String, Object> upsertAccountPayment(Map<String, Object> payload) {
        Account account = accountByName(requireText(payload, "account_name"));
        String month = requireMonthText(payload, "payment_month");
        String status = choice(text(payload.get("status"), "pending"), "status", Set.of("pending", "paid"));
        AccountPaymentStatus payment = findAccountPayment(account, month).orElseGet(AccountPaymentStatus::new);
        payment.account = account;
        payment.paymentMonth = month;
        payment.status = status;
        payment.paidDate = "paid".equals(status) ? LocalDate.now() : null;
        if (payment.id == null) {
            em.persist(payment);
        }
        em.flush();
        return accountPaymentJson(payment);
    }

    public Map<String, Object> createExpenseCategory(Map<String, Object> payload) {
        ExpenseCategory item = new ExpenseCategory();
        item.name = requireText(payload, "name");
        item.kind = choice(text(payload.get("kind"), "variable"), "kind", Set.of("variable", "fixed", "debt"));
        item.active = true;
        em.persist(item);
        em.flush();
        return categoryJson(item);
    }

    public Map<String, Object> deactivateExpenseCategory(Map<String, Object> payload) {
        ExpenseCategory item = categoryByName(requireText(payload, "name"));
        item.active = false;
        return map("id", item.id, "name", item.name, "is_active", false);
    }

    public Map<String, Object> dashboard(String month) {
        YearMonth ym = requireMonth(month);
        List<Map<String, Object>> monthlyExpenses = expenses(month, 500);
        List<Map<String, Object>> activeMsi = installmentPlans(true, month);
        BigDecimal income = sum(incomes(month, 500), "amount").add(
            fixedIncomes(true).stream()
                .filter(row -> "cash".equals(row.get("kind")))
                .map(row -> number(row.get("amount")))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
        );
        BigDecimal expense = monthlyExpenses.stream()
            .filter(row -> !Boolean.TRUE.equals(row.get("is_virtual")))
            .map(row -> number(row.get("amount")))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal msiCommitment = activeMsi.stream()
            .filter(row -> installmentActiveInMonth(row, ym))
            .map(row -> number(row.get("monthly_payment")))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fixedCommitment = monthlyExpenses.stream()
            .filter(row -> "fixed".equals(row.get("entry_type")))
            .filter(row -> !"paid".equals(row.get("payment_status")))
            .filter(row -> !Boolean.TRUE.equals(row.get("is_virtual")))
            .map(row -> number(row.get("amount")))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> byAccountExpenses = groupSum(monthlyExpenses, "account_name", "amount");
        Map<String, Map<String, Object>> byAccountCutSummary = accountCutSummaryAmounts(ym);
        Map<String, BigDecimal> byAccountMsi = new LinkedHashMap<>();
        Map<String, BigDecimal> byAccountFixed = new LinkedHashMap<>();
        Set<String> virtualAccounts = new HashSet<>();
        for (Map<String, Object> row : monthlyExpenses) {
            if (Boolean.TRUE.equals(row.get("is_virtual"))) {
                virtualAccounts.add(String.valueOf(row.get("account_name")));
            }
            if ("fixed".equals(row.get("entry_type")) && !"paid".equals(row.get("payment_status"))) {
                byAccountFixed.merge(String.valueOf(row.get("account_name")), number(row.get("amount")), BigDecimal::add);
            }
        }
        for (Map<String, Object> row : activeMsi) {
            if (installmentActiveInMonth(row, ym)) {
                byAccountMsi.merge(String.valueOf(row.get("account_name")), number(row.get("monthly_payment")), BigDecimal::add);
            }
        }
        Set<String> accounts = new TreeSet<>();
        byAccountExpenses.forEach((name, amount) -> {
            if (amount.compareTo(BigDecimal.ZERO) > 0) {
                accounts.add(name);
            }
        });
        byAccountCutSummary.forEach((name, cutSummary) -> {
            if (number(cutSummary.get("payable_cut_amount")).compareTo(BigDecimal.ZERO) > 0
                || number(cutSummary.get("open_cut_amount")).compareTo(BigDecimal.ZERO) > 0) {
                accounts.add(name);
            }
        });
        accounts.addAll(byAccountMsi.keySet());

        List<Map<String, Object>> expenseByAccount = accounts.stream().map(name -> {
            BigDecimal expenseAmount = byAccountExpenses.getOrDefault(name, BigDecimal.ZERO);
            Map<String, Object> cutSummary = byAccountCutSummary.get(name);
            BigDecimal openCutAmount = BigDecimal.ZERO;
            BigDecimal fixedAmount = BigDecimal.ZERO;
            if (cutSummary != null) {
                expenseAmount = number(cutSummary.get("payable_cut_amount"));
                openCutAmount = number(cutSummary.get("open_cut_amount"));
                fixedAmount = byAccountFixed.getOrDefault(name, BigDecimal.ZERO);
            }
            BigDecimal msiAmount = byAccountMsi.getOrDefault(name, BigDecimal.ZERO);
            return map(
                "account_name", name,
                "amount", expenseAmount.add(fixedAmount).add(msiAmount),
                "expense_amount", expenseAmount,
                "fixed_amount", fixedAmount,
                "msi_amount", msiAmount,
                "uses_cut_cycle", cutSummary != null,
                "open_cut_amount", openCutAmount,
                "next_payable_amount", cutSummary == null ? null : cutSummary.get("next_payable_amount"),
                "payable_cut_start", cutSummary == null ? null : cutSummary.get("payable_cut_start"),
                "payable_cut_end", cutSummary == null ? null : cutSummary.get("payable_cut_end"),
                "open_cut_start", cutSummary == null ? null : cutSummary.get("open_cut_start"),
                "open_cut_end", cutSummary == null ? null : cutSummary.get("open_cut_end"),
                "is_virtual", virtualAccounts.contains(name)
            );
        }).sorted((a, b) -> number(b.get("amount")).compareTo(number(a.get("amount")))).toList();
        BigDecimal adjustedExpense = expenseByAccount.stream()
            .filter(row -> !Boolean.TRUE.equals(row.get("is_virtual")))
            .map(row -> number(row.get("expense_amount")).add(number(row.get("fixed_amount"))))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> expenseByCategory = groupSum(monthlyExpenses, "category_name", "amount").entrySet().stream()
            .map(e -> map("category_name", e.getKey(), "amount", e.getValue()))
            .sorted((a, b) -> number(b.get("amount")).compareTo(number(a.get("amount"))))
            .toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("month", month);
        data.put("totals", map(
            "income", income,
            "expense", adjustedExpense,
            "fixed_commitment", fixedCommitment,
            "installment_commitment", msiCommitment,
            "balance", income.subtract(adjustedExpense).subtract(msiCommitment)
        ));
        data.put("msi", map(
            "active_count", activeMsi.size(),
            "remaining_months", activeMsi.stream().mapToInt(row -> number(row.get("months_remaining")).intValue()).sum(),
            "pending_total", sum(activeMsi, "pending_total")
        ));
        data.put("expense_by_account", expenseByAccount);
        data.put("expense_by_category", expenseByCategory);
        data.put("recent_expenses", monthlyExpenses.stream().limit(10).toList());
        return data;
    }

    public Map<String, Object> yearlySummary(int year) {
        List<Map<String, Object>> months = new ArrayList<>();
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        BigDecimal totalMsi = BigDecimal.ZERO;
        BigDecimal cumulative = BigDecimal.ZERO;
        BigDecimal fixedIncomeCash = fixedIncomes(true).stream()
            .filter(row -> "cash".equals(row.get("kind")))
            .map(row -> number(row.get("amount")))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Map<String, Object>> allActivePlans = installmentPlans(true);
        for (int m = 1; m <= 12; m++) {
            String month = "%04d-%02d".formatted(year, m);
            YearMonth ym = YearMonth.parse(month);
            BigDecimal income = sum(incomes(month, 500), "amount").add(fixedIncomeCash);
            BigDecimal expense = adjustedExpenseForMonth(month, ym);
            BigDecimal msi = allActivePlans.stream()
                .filter(row -> installmentActiveInMonth(row, ym))
                .map(row -> number(row.get("monthly_payment")))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal balance = income.subtract(expense).subtract(msi);
            cumulative = cumulative.add(balance);
            totalIncome = totalIncome.add(income);
            totalExpense = totalExpense.add(expense);
            totalMsi = totalMsi.add(msi);
            months.add(map("month", month, "income", income, "expense", expense, "msi", msi, "balance", balance, "cumulative", cumulative));
        }
        return map(
            "year", year,
            "months", months,
            "totals", map("income", totalIncome, "expense", totalExpense, "msi", totalMsi, "balance", totalIncome.subtract(totalExpense).subtract(totalMsi))
        );
    }

    private BigDecimal adjustedExpenseForMonth(String month, YearMonth ym) {
        List<Map<String, Object>> monthlyExpenses = expenses(month, 500);
        Map<String, BigDecimal> byAccountExpenses = groupSum(monthlyExpenses, "account_name", "amount");
        Map<String, Map<String, Object>> byAccountCutSummary = accountCutSummaryAmounts(ym);
        Map<String, BigDecimal> byAccountFixed = new LinkedHashMap<>();
        Set<String> virtualAccounts = new HashSet<>();
        Set<String> debitAccounts = new HashSet<>();
        for (Map<String, Object> row : monthlyExpenses) {
            String accountName = String.valueOf(row.get("account_name"));
            if (Boolean.TRUE.equals(row.get("is_virtual"))) {
                virtualAccounts.add(accountName);
            }
            if ("debit".equals(row.get("account_type")) || "cash".equals(row.get("account_type"))) {
                debitAccounts.add(accountName);
            }
            if ("fixed".equals(row.get("entry_type")) && !"paid".equals(row.get("payment_status"))) {
                byAccountFixed.merge(accountName, number(row.get("amount")), BigDecimal::add);
            }
        }
        Set<String> accounts = new TreeSet<>();
        byAccountExpenses.forEach((name, amount) -> {
            if (amount.compareTo(BigDecimal.ZERO) > 0) {
                accounts.add(name);
            }
        });
        byAccountCutSummary.forEach((name, cutSummary) -> {
            if (number(cutSummary.get("payable_cut_amount")).compareTo(BigDecimal.ZERO) > 0
                || number(cutSummary.get("open_cut_amount")).compareTo(BigDecimal.ZERO) > 0) {
                accounts.add(name);
            }
        });
        // Débito: sumar gasto directo (ya viene en byAccountExpenses)
        BigDecimal debitTotal = debitAccounts.stream()
            .map(name -> byAccountExpenses.getOrDefault(name, BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tarjetas: payable_cut si hay corte formal, open_cut si no (misma regla que dashboard)
        BigDecimal creditTotal = accounts.stream()
            .filter(name -> !virtualAccounts.contains(name) && !debitAccounts.contains(name))
            .map(name -> {
                Map<String, Object> cutSummary = byAccountCutSummary.get(name);
                if (cutSummary == null) {
                    return byAccountExpenses.getOrDefault(name, BigDecimal.ZERO);
                }
                BigDecimal payable = number(cutSummary.get("payable_cut_amount"));
                BigDecimal fixed = byAccountFixed.getOrDefault(name, BigDecimal.ZERO);
                BigDecimal openCut = number(cutSummary.get("open_cut_amount"));
                return payable.compareTo(BigDecimal.ZERO) > 0
                    ? payable.add(fixed)
                    : openCut.add(fixed);
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return debitTotal.add(creditTotal);
    }

    private Map<String, Map<String, Object>> accountCutSummaryAmounts(YearMonth month) {
        LocalDate previousMonthStart = month.minusMonths(1).atDay(1);
        LocalDate startInclusive = month.atDay(1);
        LocalDate endExclusive = month.plusMonths(1).atDay(1);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  a.name as account_name,
                  payable_start.cut_date as payable_cut_start,
                  payable_end.cut_date as payable_cut_end,
                  payable_total.amount as payable_cut_amount,
                  open_anchor.cut_date as open_cut_start,
                  next_cut.cut_date as open_cut_end,
                  open_total.amount as open_cut_amount,
                  next_payable_total.amount as next_payable_amount
                from finance.accounts a
                left join lateral (
                  select c.cut_date, c.created_at
                  from finance.account_cut_events c
                  where c.account_id = a.id
                    and (
                      (
                        lower(trim(a.name)) = 'stori'
                        and c.cut_date >= :previousMonthStart
                        and c.cut_date < :startInclusive
                      )
                      or (
                        lower(trim(a.name)) <> 'stori'
                        and c.cut_date >= :startInclusive
                        and c.cut_date < :endExclusive
                      )
                    )
                  order by c.cut_date desc, c.created_at desc
                  limit 1
                ) payable_end on true
                left join lateral (
                  select c.cut_date, c.created_at
                  from finance.account_cut_events c
                  where c.account_id = a.id
                    and payable_end.cut_date is not null
                    and (
                      c.cut_date < payable_end.cut_date
                      or (c.cut_date = payable_end.cut_date and c.created_at < payable_end.created_at)
                    )
                  order by c.cut_date desc, c.created_at desc
                  limit 1
                ) payable_start on true
                left join lateral (
                  select c.cut_date, c.created_at
                  from finance.account_cut_events c
                  where c.account_id = a.id
                    and c.cut_date < :endExclusive
                  order by c.cut_date desc, c.created_at desc
                  limit 1
                ) open_anchor on true
                left join lateral (
                  select c.cut_date, c.created_at
                  from finance.account_cut_events c
                  where c.account_id = a.id
                    and open_anchor.cut_date is not null
                    and (
                      c.cut_date > open_anchor.cut_date
                      or (c.cut_date = open_anchor.cut_date and c.created_at > open_anchor.created_at)
                    )
                  order by c.cut_date asc, c.created_at asc
                  limit 1
                ) next_cut on true
                left join lateral (
                  select coalesce(sum(e.amount), 0) as amount
                  from finance.expenses e
                  where e.account_id = a.id
                    and payable_end.cut_date is not null
                    and (
                      payable_start.cut_date is null
                      or e.expense_date > payable_start.cut_date
                      or (e.expense_date = payable_start.cut_date and e.created_at > payable_start.created_at)
                    )
                    and (
                      payable_end.cut_date is null
                      or e.expense_date < payable_end.cut_date
                      or (e.expense_date = payable_end.cut_date and e.created_at < payable_end.created_at)
                    )
                ) payable_total on true
                left join lateral (
                  select coalesce(sum(e.amount), 0) as amount
                  from finance.expenses e
                  where e.account_id = a.id
                    and open_anchor.cut_date is not null
                    and (
                      e.expense_date > open_anchor.cut_date
                      or (e.expense_date = open_anchor.cut_date and e.created_at > open_anchor.created_at)
                    )
                    and (
                      next_cut.cut_date is null
                      or e.expense_date < next_cut.cut_date
                      or (e.expense_date = next_cut.cut_date and e.created_at < next_cut.created_at)
                    )
                ) open_total on true
                left join lateral (
                  select coalesce(sum(e.amount), 0) as amount
                  from finance.expenses e
                  where e.account_id = a.id
                    and payable_end.cut_date is not null
                    and open_anchor.cut_date is not null
                    and (
                      open_anchor.cut_date > payable_end.cut_date
                      or (open_anchor.cut_date = payable_end.cut_date and open_anchor.created_at > payable_end.created_at)
                    )
                    and (
                      e.expense_date > payable_end.cut_date
                      or (e.expense_date = payable_end.cut_date and e.created_at > payable_end.created_at)
                    )
                    and (
                      e.expense_date < open_anchor.cut_date
                      or (e.expense_date = open_anchor.cut_date and e.created_at < open_anchor.created_at)
                    )
                ) next_payable_total on true
                where a.account_type in ('credit', 'store_card')
                  and a.is_active = true
                """)
            .setParameter("previousMonthStart", previousMonthStart)
            .setParameter("startInclusive", startInclusive)
            .setParameter("endExclusive", endExclusive)
            .getResultList();
        Map<String, Map<String, Object>> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String accountName = String.valueOf(row[0]);
            result.put(accountName, map(
                "payable_cut_start", row[1],
                "payable_cut_end", row[2],
                "payable_cut_amount", row[3],
                "open_cut_start", row[4],
                "open_cut_end", row[5],
                "open_cut_amount", row[6],
                "next_payable_amount", row[7]
            ));
        }
        return result;
    }

    private void applyExpense(Expense item, Map<String, Object> payload) {
        item.expenseDate = requireDate(payload, "date");
        item.amount = requireAmount(payload, "amount");
        item.description = requireText(payload, "description");
        item.account = accountByName(requireText(payload, "account_name"));
        item.category = categoryByName(requireText(payload, "category_name"));
        item.notes = text(payload.get("notes"), null);
    }

    private void applyIncome(Income item, Map<String, Object> payload) {
        item.incomeDate = requireDate(payload, "date");
        item.amount = requireAmount(payload, "amount");
        item.description = requireText(payload, "description");
        item.source = sourceByName(requireText(payload, "source_name"));
        item.notes = text(payload.get("notes"), null);
    }

    private List<Map<String, Object>> monthlyFixedExpenseEntries(YearMonth ym) {
        return fixedExpenses(ym.toString()).stream().map(row -> {
            Map<String, Object> copy = new LinkedHashMap<>(row);
            copy.put("date", ym.atDay(Math.min((Integer) row.get("due_day"), ym.lengthOfMonth())).toString());
            copy.put("description", row.get("name"));
            copy.put("entry_type", "fixed");
            copy.put("fixed_expense_id", row.get("id"));
            return copy;
        }).toList();
    }

    private Map<String, Object> expenseJson(Expense item) {
        return map(
            "id", item.id,
            "date", item.expenseDate,
            "amount", item.amount,
            "description", item.description,
            "account_name", item.account.name,
            "account_type", item.account.accountType,
            "cutoff_day", item.account.cutoffDay,
            "payment_due_day", item.account.paymentDueDay,
            "category_name", item.category.name,
            "notes", item.notes,
            "created_at", item.createdAt,
            "entry_type", "expense",
            "fixed_expense_id", null,
            "payment_status", null,
            "paid_date", null,
            "is_virtual", item.account.virtualAccount
        );
    }

    private Map<String, Object> incomeJson(Income item) {
        return map("id", item.id, "date", item.incomeDate, "amount", item.amount, "description", item.description,
            "source_name", item.source.name, "notes", item.notes, "created_at", item.createdAt);
    }

    private Map<String, Object> fixedExpenseJson(FixedExpense item, YearMonth ym, Map<Long, FixedExpensePayment> paymentsById) {
        Optional<FixedExpensePayment> payment = ym == null ? Optional.empty() : Optional.ofNullable(paymentsById.get(item.id));
        return map(
            "id", item.id,
            "name", item.name,
            "amount", item.amount,
            "due_day", item.dueDay,
            "account_name", item.account.name,
            "account_type", item.account.accountType,
            "category_name", item.category.name,
            "payment_month", ym == null ? null : ym.toString(),
            "payment_status", payment.map(p -> p.status).orElse("pending"),
            "paid_date", payment.map(p -> p.paidDate).orElse(null),
            "is_active", item.active,
            "created_at", item.createdAt,
            "is_virtual", item.account.virtualAccount
        );
    }

    private Map<String, Object> fixedIncomeJson(FixedIncome item) {
        return map("id", item.id, "name", item.name, "amount", item.amount, "source_name", item.source.name,
            "is_active", item.active, "created_at", item.createdAt, "kind", item.kind,
            "account_id", item.account == null ? null : item.account.id, "account_name", item.account == null ? null : item.account.name);
    }

    private Map<String, Object> installmentJson(InstallmentPlan item) {
        int monthsRemaining = item.monthsRemaining == null ? 0 : item.monthsRemaining;
        BigDecimal pending = item.pendingTotal != null ? item.pendingTotal : item.monthlyPayment.multiply(BigDecimal.valueOf(monthsRemaining));
        return map(
            "id", item.id,
            "purchase_name", item.purchaseName,
            "account_name", item.account.name,
            "monthly_payment", item.monthlyPayment,
            "months_total", item.monthsTotal,
            "months_remaining", monthsRemaining,
            "pending_total", pending,
            "purchase_date", item.purchaseDate,
            "status", item.status,
            "created_at", item.createdAt,
            "updated_at", item.updatedAt,
            "end_month", item.endMonth,
            "first_payment_month", item.startMonth != null ? item.startMonth
                : item.purchaseDate == null ? null : YearMonth.from(item.purchaseDate).toString(),
            "category_name", item.category == null ? null : item.category.name
        );
    }

    private String resolveStartMonth(Account account, LocalDate purchaseDate) {
        YearMonth purchaseMonth = YearMonth.from(purchaseDate);
        LocalDate latestCut = em.createQuery("""
                select c.cutDate from AccountCutEvent c
                where c.account = :account
                order by c.cutDate desc, c.id desc
                """, LocalDate.class)
            .setParameter("account", account)
            .setMaxResults(1)
            .getResultStream()
            .findFirst()
            .orElse(null);
        if (latestCut != null && !purchaseDate.isBefore(latestCut)) {
            return purchaseMonth.plusMonths(1).toString();
        }
        return purchaseMonth.toString();
    }

    private Map<String, Object> accountCutJson(AccountCutEvent item) {
        return map("id", item.id, "account_name", item.account.name, "cut_date", item.cutDate, "created_at", item.createdAt);
    }

    private Map<String, Object> accountPaymentJson(AccountPaymentStatus item) {
        return map("id", item.id, "account_name", item.account.name, "payment_month", item.paymentMonth,
            "status", item.status, "paid_date", item.paidDate, "updated_at", item.updatedAt);
    }

    private Map<String, Object> fixedExpensePaymentJson(FixedExpensePayment item) {
        return map("id", item.id, "fixed_expense_id", item.fixedExpense.id, "payment_month", item.paymentMonth,
            "status", item.status, "paid_date", item.paidDate, "updated_at", item.updatedAt);
    }

    private Map<String, Object> accountJson(Account item) {
        return map("id", item.id, "name", item.name, "account_type", item.accountType, "cutoff_day", item.cutoffDay,
            "payment_due_day", item.paymentDueDay, "is_virtual", item.virtualAccount);
    }

    private Map<String, Object> categoryJson(ExpenseCategory item) {
        return map("id", item.id, "name", item.name, "kind", item.kind, "created_at", item.createdAt);
    }

    private Map<String, Object> sourceJson(IncomeSource item) {
        return map("id", item.id, "name", item.name, "created_at", item.createdAt);
    }

    private List<Account> accounts() {
        return em.createQuery("select a from Account a where a.active = true order by a.name asc", Account.class).getResultList();
    }

    private List<ExpenseCategory> categories() {
        return em.createQuery("select c from ExpenseCategory c where c.active = true order by c.name asc", ExpenseCategory.class).getResultList();
    }

    private List<IncomeSource> sources() {
        return em.createQuery("select s from IncomeSource s where s.active = true order by s.name asc", IncomeSource.class).getResultList();
    }

    private Account accountByName(String name) {
        return byName(Account.class, name, "Cuenta");
    }

    private ExpenseCategory categoryByName(String name) {
        return byName(ExpenseCategory.class, name, "Categoria");
    }

    private IncomeSource sourceByName(String name) {
        return byName(IncomeSource.class, name, "Fuente");
    }

    private <T> T byName(Class<T> type, String name, String label) {
        String entity = type.getSimpleName();
        try {
            return em.createQuery("select x from " + entity + " x where lower(x.name) = lower(:name) and x.active = true", type)
                .setParameter("name", name)
                .setMaxResults(1)
                .getSingleResult();
        } catch (NoResultException error) {
            throw new FinanceException(label + " no encontrada: " + name);
        }
    }

    private <T> T find(Class<T> type, long id, String label) {
        T item = em.find(type, id);
        if (item == null) {
            throw new FinanceException(label + " no encontrado: " + id);
        }
        return item;
    }

    private Optional<FixedExpensePayment> findFixedExpensePayment(FixedExpense fixed, String month) {
        return em.createQuery("""
                select p from FixedExpensePayment p
                where p.fixedExpense = :fixed and p.paymentMonth = :month
                """, FixedExpensePayment.class)
            .setParameter("fixed", fixed)
            .setParameter("month", month)
            .setMaxResults(1)
            .getResultStream()
            .findFirst();
    }

    private Map<Long, FixedExpensePayment> fixedExpensePaymentsByMonth(String month) {
        List<FixedExpensePayment> list = em.createQuery("""
                select p from FixedExpensePayment p
                join fetch p.fixedExpense f
                where p.paymentMonth = :month
                """, FixedExpensePayment.class)
            .setParameter("month", month)
            .getResultList();
        Map<Long, FixedExpensePayment> byId = new HashMap<>();
        for (FixedExpensePayment p : list) {
            byId.put(p.fixedExpense.id, p);
        }
        return byId;
    }

    private Optional<AccountPaymentStatus> findAccountPayment(Account account, String month) {
        return em.createQuery("""
                select p from AccountPaymentStatus p
                where p.account = :account and p.paymentMonth = :month
                """, AccountPaymentStatus.class)
            .setParameter("account", account)
            .setParameter("month", month)
            .setMaxResults(1)
            .getResultStream()
            .findFirst();
    }

    private Optional<AccountCutEvent> accountCut(Account account, LocalDate cutDate) {
        return em.createQuery("""
                select c from AccountCutEvent c
                where c.account = :account and c.cutDate = :cutDate
                """, AccountCutEvent.class)
            .setParameter("account", account)
            .setParameter("cutDate", cutDate)
            .setMaxResults(1)
            .getResultStream()
            .findFirst();
    }

    private YearMonth requireMonth(String value) {
        try {
            return YearMonth.parse(value);
        } catch (Exception error) {
            throw new FinanceException("Formato invalido para month. Usa YYYY-MM.");
        }
    }

    private String requireMonthText(Map<String, Object> payload, String field) {
        return requireMonthText(text(payload.get(field), ""), field);
    }

    private String requireMonthText(String value, String field) {
        String clean = text(value, "");
        requireMonth(clean);
        return clean;
    }

    private LocalDate requireDate(Map<String, Object> payload, String field) {
        LocalDate date = optionalDate(payload.get(field));
        if (date == null) {
            throw new FinanceException("Falta " + field + ".");
        }
        return date;
    }

    private LocalDate optionalDate(Object raw) {
        String value = text(raw, "");
        if (value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (Exception error) {
            throw new FinanceException("Formato invalido para fecha. Usa YYYY-MM-DD.");
        }
    }

    private String requireText(Map<String, Object> payload, String field) {
        String value = text(payload.get(field), "");
        if (value.isBlank()) {
            throw new FinanceException("Falta " + field + ".");
        }
        return value;
    }

    private BigDecimal requireAmount(Map<String, Object> payload, String field) {
        BigDecimal value = number(payload.get(field));
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new FinanceException(field + " no puede ser negativo.");
        }
        return value;
    }

    private BigDecimal amountOrDefault(Object raw, BigDecimal fallback) {
        String value = text(raw, "");
        return value.isBlank() ? fallback : number(raw);
    }

    private int requireInt(Map<String, Object> payload, String field, int min) {
        int value = intOrDefault(payload.get(field), Integer.MIN_VALUE);
        if (value < min) {
            throw new FinanceException(field + " debe ser mayor o igual a " + min + ".");
        }
        return value;
    }

    private int requireDay(Map<String, Object> payload, String field) {
        int day = requireInt(payload, field, 1);
        if (day > 31) {
            throw new FinanceException(field + " debe estar entre 1 y 31.");
        }
        return day;
    }

    private long requireLong(Map<String, Object> payload, String field) {
        return number(payload.get(field)).longValue();
    }

    private int intOrDefault(Object raw, int fallback) {
        String value = text(raw, "");
        if (value.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException error) {
            throw new FinanceException("Numero invalido.");
        }
    }

    private String choice(String value, String field, Set<String> allowed) {
        String clean = value.trim().toLowerCase(Locale.ROOT);
        if (!allowed.contains(clean)) {
            throw new FinanceException(field + " invalido.");
        }
        return clean;
    }

    private String text(Object raw, String fallback) {
        if (raw == null) {
            return fallback;
        }
        return String.valueOf(raw).trim();
    }

    private BigDecimal number(Object raw) {
        if (raw instanceof BigDecimal value) {
            return value;
        }
        if (raw instanceof Number value) {
            return BigDecimal.valueOf(value.doubleValue());
        }
        String text = text(raw, "");
        if (text.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException error) {
            throw new FinanceException("Monto invalido.");
        }
    }

    private BigDecimal sum(List<Map<String, Object>> rows, String field) {
        return rows.stream().map(row -> number(row.get(field))).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Map<String, BigDecimal> groupSum(List<Map<String, Object>> rows, String keyField, String valueField) {
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String key = String.valueOf(row.get(keyField));
            totals.merge(key, number(row.get(valueField)), BigDecimal::add);
        }
        return totals;
    }

    private boolean installmentActiveInMonth(Map<String, Object> row, YearMonth month) {
        String first = text(row.get("first_payment_month"), "");
        String end = text(row.get("end_month"), "");
        if (first.isBlank() || end.isBlank()) {
            return false;
        }
        YearMonth firstMonth = YearMonth.parse(first);
        YearMonth endMonth = YearMonth.parse(end);
        return !month.isBefore(firstMonth) && !month.isAfter(endMonth);
    }

    private Map<String, Object> map(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2) {
            result.put(String.valueOf(values[i]), values[i + 1]);
        }
        return result;
    }
}
