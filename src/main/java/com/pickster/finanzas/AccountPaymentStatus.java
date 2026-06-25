package com.pickster.finanzas;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "account_payment_statuses", schema = "finance")
public class AccountPaymentStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    public Account account;

    @Column(name = "payment_month")
    public String paymentMonth;

    public String status;

    @Column(name = "paid_date")
    public LocalDate paidDate;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public OffsetDateTime updatedAt;
}
