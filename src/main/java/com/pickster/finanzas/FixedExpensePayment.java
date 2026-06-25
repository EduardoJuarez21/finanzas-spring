package com.pickster.finanzas;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fixed_expense_payments", schema = "finance")
public class FixedExpensePayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fixed_expense_id")
    public FixedExpense fixedExpense;

    @Column(name = "payment_month")
    public String paymentMonth;

    public String status;

    @Column(name = "paid_date")
    public LocalDate paidDate;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public OffsetDateTime updatedAt;
}
