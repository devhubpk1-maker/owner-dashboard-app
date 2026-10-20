-- Owner dashboard schema. Paste into Supabase > SQL Editor > New query > Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE everywhere.

create table if not exists public.shops (
  id          bigint generated always as identity primary key,
  name        text,
  address     text,
  phone       text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.products (
  id                   bigint generated always as identity primary key,
  name                 text not null,
  barcode              text unique,
  category             text,
  cost_price           numeric(12,2) not null default 0,
  sale_price           numeric(12,2) not null default 0,
  stock_qty            numeric(12,2) not null default 0,
  low_stock_threshold  numeric(12,2) not null default 5,
  created_at           timestamptz not null default now()
);

create table if not exists public.customers (
  id          bigint generated always as identity primary key,
  name        text not null,
  phone       text,
  total_due   numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.sales (
  id              bigint generated always as identity primary key,
  invoice_number  text unique,
  subtotal        numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  tax             numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  payment_method  text not null default 'cash',  -- cash | card | udhaar
  customer_id     bigint references public.customers(id) on delete set null,
  paid_amount     numeric(12,2) not null default 0,
  due_amount      numeric(12,2) not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.sale_items (
  id            bigint generated always as identity primary key,
  sale_id       bigint not null references public.sales(id) on delete cascade,
  product_id    bigint references public.products(id) on delete set null,
  product_name  text,
  quantity      numeric(12,2) not null default 1,
  unit_price    numeric(12,2) not null default 0,
  line_total    numeric(12,2) not null default 0
);

create table if not exists public.customer_payments (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references public.customers(id) on delete cascade,
  amount       numeric(12,2) not null,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists sales_created_at_idx      on public.sales (created_at desc);
create index if not exists sales_customer_id_idx     on public.sales (customer_id);
create index if not exists sale_items_sale_id_idx    on public.sale_items (sale_id);
create index if not exists sale_items_product_id_idx on public.sale_items (product_id);
create index if not exists payments_customer_id_idx  on public.customer_payments (customer_id);

-- Keep customers.total_due in sync: udhaar sales add, payments subtract.
create or replace function public.recalc_customer_due(cid bigint)
returns void language sql security definer set search_path = public as $$
  update public.customers c
  set total_due = greatest(0,
        coalesce((select sum(due_amount) from public.sales s where s.customer_id = cid), 0)
      - coalesce((select sum(amount) from public.customer_payments p where p.customer_id = cid), 0))
  where c.id = cid;
$$;

create or replace function public.on_customer_ledger_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.customer_id is not null then
    perform public.recalc_customer_due(old.customer_id);
  end if;
  if tg_op in ('INSERT','UPDATE') and new.customer_id is not null then
    perform public.recalc_customer_due(new.customer_id);
  end if;
  return null;
end;
$$;

drop trigger if exists sales_due_sync on public.sales;
create trigger sales_due_sync after insert or update or delete on public.sales
  for each row execute function public.on_customer_ledger_change();

drop trigger if exists payments_due_sync on public.customer_payments;
create trigger payments_due_sync after insert or update or delete on public.customer_payments
  for each row execute function public.on_customer_ledger_change();

-- Row Level Security: the dashboard is read-only, so the public key may only SELECT.
alter table public.shops             enable row level security;
alter table public.products          enable row level security;
alter table public.customers         enable row level security;
alter table public.sales             enable row level security;
alter table public.sale_items        enable row level security;
alter table public.customer_payments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['shops','products','customers','sales','sale_items','customer_payments'] loop
    execute format('drop policy if exists "dashboard read" on public.%I', t);
    execute format('create policy "dashboard read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
