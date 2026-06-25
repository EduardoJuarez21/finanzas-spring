create schema if not exists finance;

create table finance.accounts (
  id bigserial primary key,
  name varchar(120) not null unique,
  account_type varchar(30) not null,
  cutoff_day integer,
  payment_due_day integer,
  is_virtual boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table finance.expense_categories (
  id bigserial primary key,
  name varchar(120) not null unique,
  kind varchar(30) not null default 'variable',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table finance.income_sources (
  id bigserial primary key,
  name varchar(120) not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table finance.expenses (
  id bigserial primary key,
  expense_date date not null,
  amount numeric(14, 2) not null,
  description varchar(160) not null,
  account_id bigint not null references finance.accounts(id),
  category_id bigint not null references finance.expense_categories(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expenses_expense_date on finance.expenses(expense_date);
create index idx_expenses_account_id on finance.expenses(account_id);
create index idx_expenses_category_id on finance.expenses(category_id);

create table finance.incomes (
  id bigserial primary key,
  income_date date not null,
  amount numeric(14, 2) not null,
  description varchar(160) not null,
  income_source_id bigint not null references finance.income_sources(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_incomes_income_date on finance.incomes(income_date);

create table finance.fixed_expenses (
  id bigserial primary key,
  name varchar(160) not null,
  amount numeric(14, 2) not null,
  due_day integer not null,
  account_id bigint not null references finance.accounts(id),
  category_id bigint not null references finance.expense_categories(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table finance.fixed_expense_payments (
  id bigserial primary key,
  fixed_expense_id bigint not null references finance.fixed_expenses(id),
  payment_month varchar(7) not null,
  status varchar(20) not null default 'pending',
  paid_date date,
  updated_at timestamptz not null default now(),
  unique(fixed_expense_id, payment_month)
);

create table finance.fixed_incomes (
  id bigserial primary key,
  name varchar(160) not null,
  amount numeric(14, 2) not null,
  income_source_id bigint not null references finance.income_sources(id),
  kind varchar(20) not null default 'cash',
  account_id bigint references finance.accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table finance.installment_plans (
  id bigserial primary key,
  purchase_name varchar(160) not null,
  account_id bigint not null references finance.accounts(id),
  category_id bigint references finance.expense_categories(id),
  monthly_payment numeric(14, 2) not null,
  months_total integer,
  months_remaining integer not null,
  pending_total numeric(14, 2) not null,
  purchase_date date,
  end_month varchar(7),
  status varchar(20) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table finance.account_cut_events (
  id bigserial primary key,
  account_id bigint not null references finance.accounts(id),
  cut_date date not null,
  created_at timestamptz not null default now(),
  unique(account_id, cut_date)
);

create table finance.account_payment_statuses (
  id bigserial primary key,
  account_id bigint not null references finance.accounts(id),
  payment_month varchar(7) not null,
  status varchar(20) not null default 'pending',
  paid_date date,
  updated_at timestamptz not null default now(),
  unique(account_id, payment_month)
);

insert into finance.accounts (name, account_type, cutoff_day, payment_due_day, is_virtual) values
  ('SANTANDER LIKE U', 'credit', null, null, false),
  ('HSBC 2 NOW', 'credit', null, null, false),
  ('HSBC VIVA', 'credit', null, null, false),
  ('BANAMEX', 'credit', null, null, false),
  ('STORI', 'credit', null, null, false),
  ('DEBITO', 'debit', null, null, false),
  ('BBVA', 'debit', null, null, false),
  ('LIVERPOOL', 'store_card', null, null, false),
  ('SUBURBIA', 'store_card', null, null, false),
  ('VALES', 'cash', null, null, true)
on conflict (name) do nothing;

insert into finance.expense_categories (name, kind) values
  ('Supermercado', 'variable'),
  ('Gasolina', 'variable'),
  ('Comida', 'variable'),
  ('Servicios', 'fixed'),
  ('Renta', 'fixed'),
  ('Salud', 'variable'),
  ('Educacion', 'fixed'),
  ('Suscripciones', 'fixed'),
  ('Deuda', 'debt'),
  ('MSI', 'debt')
on conflict (name) do nothing;

insert into finance.income_sources (name) values
  ('Salario Elisa'),
  ('Salario Lalo'),
  ('Ingreso extra')
on conflict (name) do nothing;
