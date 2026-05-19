create table if not exists public.payment_settings (
  id text primary key default 'default' check (id = 'default'),
  monthly_price text not null default '7,500₮',
  access_days integer not null default 30 check (access_days > 0),
  bank_name text not null default 'Khan Bank',
  account_number text not null default '5000000000',
  account_name text not null default 'YotoKi',
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.payment_settings enable row level security;

drop policy if exists "Anyone can read payment settings" on public.payment_settings;
create policy "Anyone can read payment settings"
on public.payment_settings
for select
using (true);

drop policy if exists "Admins can update payment settings" on public.payment_settings;
create policy "Admins can update payment settings"
on public.payment_settings
for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
