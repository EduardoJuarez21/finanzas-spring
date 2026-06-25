alter table finance.fixed_expense_payments
  add column if not exists created_at timestamptz not null default now();
