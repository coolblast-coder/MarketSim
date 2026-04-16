-- MarketSim Supabase Schema
-- Paste this entire file into the Supabase SQL Editor and click "Run"

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_color text not null default '#00d4ff',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- ============================================================
-- 2. BALANCES
-- ============================================================
create table if not exists public.balances (
  id uuid primary key references auth.users(id) on delete cascade,
  amount numeric not null default 10000
);

alter table public.balances enable row level security;

create policy "Users can read own balance"
  on public.balances for select
  using (auth.uid() = id);

create policy "Users can insert own balance"
  on public.balances for insert
  with check (auth.uid() = id);

create policy "Users can update own balance"
  on public.balances for update
  using (auth.uid() = id);

create policy "Users can delete own balance"
  on public.balances for delete
  using (auth.uid() = id);

-- ============================================================
-- 3. POSITIONS
-- ============================================================
create table if not exists public.positions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  shares numeric not null default 0,
  avg_cost numeric not null default 0,
  unique(user_id, symbol)
);

alter table public.positions enable row level security;

create policy "Users can read own positions"
  on public.positions for select
  using (auth.uid() = user_id);

create policy "Users can insert own positions"
  on public.positions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own positions"
  on public.positions for update
  using (auth.uid() = user_id);

create policy "Users can delete own positions"
  on public.positions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 4. TRANSACTIONS
-- ============================================================
create table if not exists public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('BUY', 'SELL')),
  symbol text not null,
  shares numeric not null,
  price numeric not null,
  total numeric not null,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);
