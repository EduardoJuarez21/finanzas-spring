package com.pickster.finanzas;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "installment_plans", schema = "finance")
public class InstallmentPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "purchase_name")
    public String purchaseName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    public Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    public ExpenseCategory category;

    @Column(name = "monthly_payment")
    public BigDecimal monthlyPayment;

    @Column(name = "months_total")
    public Integer monthsTotal;

    @Column(name = "months_remaining")
    public Integer monthsRemaining;

    @Column(name = "pending_total")
    public BigDecimal pendingTotal;

    @Column(name = "purchase_date")
    public LocalDate purchaseDate;

    @Column(name = "end_month")
    public String endMonth;

    @Column(name = "start_month")
    public String startMonth;

    public String status;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public OffsetDateTime updatedAt;
}
