alter table finance.installment_plans
    add column if not exists start_month varchar(7);
