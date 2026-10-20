-- Speed + live sync. Run AFTER 001_create_tables.sql (Supabase > SQL Editor > New query > Run).
-- Safe to re-run.

-- Relationships (NOT VALID = existing rows are not checked, so this never fails on old data).
do $$
begin
  begin
    alter table public.sale_items add constraint sale_items_sale_id_fkey
      foreign key (sale_id) references public.sales(id) on delete cascade not valid;
  exception when others then raise notice 'sale_items.sale_id fk skipped: %', sqlerrm;
  end;
  begin
    alter table public.sale_items add constraint sale_items_product_id_fkey
      foreign key (product_id) references public.products(id) on delete set null not valid;
  exception when others then raise notice 'sale_items.product_id fk skipped: %', sqlerrm;
  end;
  begin
    alter table public.sales add constraint sales_customer_id_fkey
      foreign key (customer_id) references public.customers(id) on delete set null not valid;
  exception when others then raise notice 'sales.customer_id fk skipped: %', sqlerrm;
  end;
  begin
    alter table public.customer_payments add constraint customer_payments_customer_id_fkey
      foreign key (customer_id) references public.customers(id) on delete cascade not valid;
  exception when others then raise notice 'customer_payments.customer_id fk skipped: %', sqlerrm;
  end;
end $$;

create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sales_created_at_idx on public.sales (created_at desc);
create index if not exists customer_payments_customer_idx on public.customer_payments (customer_id);
create index if not exists customers_total_due_idx on public.customers (total_due) where total_due > 0;
create index if not exists products_low_stock_idx  on public.products (stock_qty);
create index if not exists sales_customer_method_idx on public.sales (customer_id, payment_method);

-- Whole dashboard in ONE request instead of six.
create or replace function public.dashboard_summary(start_at timestamptz)
returns json language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'salesTotal',   coalesce((select sum(total) from sales where created_at >= start_at), 0),
    'transactions', (select count(*) from sales where created_at >= start_at),
    'profit',       coalesce((
                      select sum(si.line_total - coalesce(p.cost_price, 0) * si.quantity)
                      from sale_items si
                      join sales s on s.id = si.sale_id
                      left join products p on p.id = si.product_id
                      where s.created_at >= start_at), 0),
    'udhaar',       coalesce((select sum(total_due) from customers where total_due > 0), 0),
    'recent',       coalesce((
                      select json_agg(r) from (
                        select id, invoice_number, total, payment_method, created_at
                        from sales order by created_at desc limit 5) r), '[]'::json),
    'lowStock',     coalesce((
                      select json_agg(l) from (
                        select id, name, stock_qty, low_stock_threshold
                        from products where stock_qty <= low_stock_threshold
                        order by stock_qty asc limit 5) l), '[]'::json),
    'shopUpdatedAt', (select updated_at from shops order by id limit 1)
  );
$$;

-- Sales totals aggregated in the database instead of downloading every row.
create or replace function public.sales_summary(start_at timestamptz)
returns json language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'count', count(*),
    'total', coalesce(sum(total), 0)
  ) from sales where created_at >= start_at;
$$;

grant execute on function public.dashboard_summary(timestamptz) to anon, authenticated;
grant execute on function public.sales_summary(timestamptz)     to anon, authenticated;

-- Supabase Realtime: push every change to the app instantly.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['shops','products','customers','sales','sale_items','customer_payments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Refresh PostgREST so the new tables/functions are visible to the API immediately.
notify pgrst, 'reload schema';
