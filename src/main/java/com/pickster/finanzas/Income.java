package com.pickster.finanzas;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "incomes", schema = "finance")
public class Income {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "income_date")
    public LocalDate incomeDate;

    public BigDecimal amount;
    public String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "income_source_id")
    public IncomeSource source;

    public String notes;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public OffsetDateTime updatedAt;
}
