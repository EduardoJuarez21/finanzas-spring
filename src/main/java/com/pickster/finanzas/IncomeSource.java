package com.pickster.finanzas;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "income_sources", schema = "finance")
public class IncomeSource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String name;

    @Column(name = "is_active")
    public boolean active = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public OffsetDateTime updatedAt;
}
