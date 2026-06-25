package com.pickster.finanzas;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {
    private final FinanceService service;

    public FinanceController(FinanceService service) {
        this.service = service;
    }

    @GetMapping("/catalogs")
    public Map<String, Object> catalogs() {
        return ok(service.catalogs());
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@RequestParam(defaultValue = "") String month) {
        return ok(service.dashboard(blankToCurrentMonth(month)));
    }

    @GetMapping("/yearly-summary")
    public Map<String, Object> yearlySummary(@RequestParam(defaultValue = "0") int year) {
        int resolvedYear = year > 0 ? year : LocalDate.now().getYear();
        return ok(service.yearlySummary(resolvedYear));
    }

    @GetMapping("/expenses")
    public Map<String, Object> expenses(@RequestParam(defaultValue = "") String month,
                                        @RequestParam(defaultValue = "100") int limit) {
        return items(service.expenses(blankToNull(month), limit));
    }

    @PostMapping("/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createExpense(@RequestBody Map<String, Object> payload) {
        return item(service.createExpense(payload));
    }

    @PostMapping("/expenses/{id}/update")
    public Map<String, Object> updateExpense(@PathVariable long id, @RequestBody Map<String, Object> payload) {
        return item(service.updateExpense(id, payload));
    }

    @GetMapping("/incomes")
    public Map<String, Object> incomes(@RequestParam(defaultValue = "") String month,
                                       @RequestParam(defaultValue = "100") int limit) {
        return items(service.incomes(blankToNull(month), limit));
    }

    @PostMapping("/incomes")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createIncome(@RequestBody Map<String, Object> payload) {
        return item(service.createIncome(payload));
    }

    @PostMapping("/incomes/{id}/update")
    public Map<String, Object> updateIncome(@PathVariable long id, @RequestBody Map<String, Object> payload) {
        return item(service.updateIncome(id, payload));
    }

    @GetMapping("/fixed-expenses")
    public Map<String, Object> fixedExpenses(@RequestParam(defaultValue = "") String month) {
        return items(service.fixedExpenses(blankToNull(month)));
    }

    @PostMapping("/fixed-expenses")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createFixedExpense(@RequestBody Map<String, Object> payload) {
        return item(service.createFixedExpense(payload));
    }

    @PostMapping("/fixed-expenses/delete")
    public Map<String, Object> deleteFixedExpense(@RequestBody Map<String, Object> payload) {
        return item(service.deactivateFixedExpense(payload));
    }

    @PostMapping("/fixed-expenses/status")
    public Map<String, Object> fixedExpenseStatus(@RequestBody Map<String, Object> payload) {
        return item(service.upsertFixedExpensePayment(payload));
    }

    @GetMapping("/fixed-incomes")
    public Map<String, Object> fixedIncomes(@RequestParam(name = "active_only", defaultValue = "true") boolean active_only) {
        return items(service.fixedIncomes(active_only));
    }

    @PostMapping("/fixed-incomes")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createFixedIncome(@RequestBody Map<String, Object> payload) {
        return item(service.createFixedIncome(payload));
    }

    @PostMapping("/fixed-incomes/delete")
    public Map<String, Object> deleteFixedIncome(@RequestBody Map<String, Object> payload) {
        return item(service.deactivateFixedIncome(payload));
    }

    @GetMapping("/installment-plans")
    public Map<String, Object> installmentPlans(@RequestParam(name = "active_only", defaultValue = "false") boolean active_only) {
        return items(service.installmentPlans(active_only));
    }

    @PostMapping("/installment-plans")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createInstallmentPlan(@RequestBody Map<String, Object> payload) {
        return item(service.createInstallmentPlan(payload));
    }

    @PatchMapping("/installment-plans/{id}")
    public Map<String, Object> updateInstallmentPlan(@PathVariable long id, @RequestBody Map<String, Object> payload) {
        return item(service.updateInstallmentPlan(id, payload));
    }

    @GetMapping("/account-cuts")
    public Map<String, Object> accountCuts(@RequestParam(name = "account_name", defaultValue = "") String account_name,
                                           @RequestParam(defaultValue = "50") int limit) {
        return items(service.accountCuts(blankToNull(account_name), limit));
    }

    @PostMapping("/account-cuts")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createAccountCut(@RequestBody Map<String, Object> payload) {
        return item(service.createAccountCut(payload));
    }

    @GetMapping("/account-payments")
    public Map<String, Object> accountPayments(@RequestParam String month) {
        return items(service.accountPayments(month));
    }

    @PostMapping("/account-payments")
    public Map<String, Object> accountPayment(@RequestBody Map<String, Object> payload) {
        return item(service.upsertAccountPayment(payload));
    }

    @PostMapping("/expense-categories")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createExpenseCategory(@RequestBody Map<String, Object> payload) {
        return item(service.createExpenseCategory(payload));
    }

    @PostMapping("/expense-categories/delete")
    public Map<String, Object> deleteExpenseCategory(@RequestBody Map<String, Object> payload) {
        return item(service.deactivateExpenseCategory(payload));
    }

    @ExceptionHandler(FinanceException.class)
    public ResponseEntity<Map<String, Object>> financeError(FinanceException error) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "error");
        body.put("error", error.getMessage());
        return ResponseEntity.badRequest().body(body);
    }

    private Map<String, Object> ok(Map<String, Object> payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.putAll(payload);
        return body;
    }

    private Map<String, Object> item(Map<String, Object> payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("item", payload);
        return body;
    }

    private Map<String, Object> items(java.util.List<Map<String, Object>> rows) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", rows.isEmpty() ? "empty" : "ok");
        body.put("items", rows);
        return body;
    }

    private String blankToNull(String value) {
        String clean = value == null ? "" : value.trim();
        return clean.isEmpty() ? null : clean;
    }

    private String blankToCurrentMonth(String value) {
        String clean = value == null ? "" : value.trim();
        return clean.isEmpty() ? LocalDate.now().toString().substring(0, 7) : clean;
    }
}
