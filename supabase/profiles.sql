create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  user_number integer not null unique check (user_number between 1 and 10000),
  role text not null default 'user' check (role in ('user', 'admin')),
  watch_access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

alter table public.profiles
add column if not exists watch_access_expires_at timestamptz;

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can create their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins can read all profiles"
on public.profiles
for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update all profiles"
on public.profiles
for update
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check (true);
