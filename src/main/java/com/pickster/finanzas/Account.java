package com.pickster.finanzas;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "accounts", schema = "finance")
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String name;

    @Column(name = "account_type")
    public String accountType;

    @Column(name = "cutoff_day")
    public Integer cutoffDay;

    @Column(name = "payment_due_day")
    public Integer paymentDueDay;

    @Column(name = "is_virtual")
    public boolean virtualAccount;

    @Column(name = "is_active")
    public boolean active = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public OffsetDateTime updatedAt;
}
