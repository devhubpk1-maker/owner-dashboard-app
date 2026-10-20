-- Optional sample data so the dashboard shows something. Run after 001_create_tables.sql.
-- Skip this file if your POS will fill the tables with real data.

insert into public.shops (name, address, phone)
select 'My Shop', 'Main Bazaar, Lahore', '0300-1234567'
where not exists (select 1 from public.shops);

insert into public.products (name, barcode, category, cost_price, sale_price, stock_qty, low_stock_threshold) values
  ('Basmati Rice 5kg',   '8961000000011', 'Grocery',   1450, 1650, 24, 5),
  ('Cooking Oil 1L',     '8961000000028', 'Grocery',    520,  590,  3, 6),
  ('Sugar 1kg',          '8961000000035', 'Grocery',    140,  160, 40, 10),
  ('Tea 450g',           '8961000000042', 'Beverages',  780,  880,  2, 5),
  ('Washing Powder 1kg', '8961000000059', 'Household',  350,  420, 15, 5)
on conflict (barcode) do nothing;

insert into public.customers (name, phone)
select v.name, v.phone from (values ('Ahmed Khan', '0301-1111111'), ('Sara Bibi', '0302-2222222')) as v(name, phone)
where not exists (select 1 from public.customers where customers.name = v.name);

with new_sales as (
  insert into public.sales (invoice_number, subtotal, total, payment_method, customer_id, paid_amount, due_amount, created_at)
  values
    ('INV-1001', 3300, 3300, 'cash',   null, 3300, 0, now() - interval '2 hours'),
    ('INV-1002', 1180, 1180, 'card',   null, 1180, 0, now() - interval '1 hour'),
    ('INV-1003', 2530, 2530, 'udhaar', (select id from public.customers where name = 'Ahmed Khan' limit 1), 0, 2530, now() - interval '30 minutes')
  on conflict (invoice_number) do nothing
  returning id, invoice_number
)
insert into public.sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
select s.id, p.id, p.name, i.qty, p.sale_price, p.sale_price * i.qty
from new_sales s
join (values
  ('INV-1001', '8961000000011', 2),
  ('INV-1002', '8961000000028', 2),
  ('INV-1003', '8961000000011', 1),
  ('INV-1003', '8961000000042', 1)
) as i(invoice, barcode, qty) on i.invoice = s.invoice_number
join public.products p on p.barcode = i.barcode;

insert into public.customer_payments (customer_id, amount, note)
select id, 500, 'Partial payment' from public.customers
where name = 'Ahmed Khan'
  and not exists (select 1 from public.customer_payments cp where cp.customer_id = customers.id);
