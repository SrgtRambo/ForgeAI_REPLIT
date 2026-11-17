-- Forge AI database schema.
-- Run this in the Supabase SQL editor (or via the migrations tooling Lovable manages).

create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  email text not null,
  type text not null check (type in ('website','restaurant','services','saas','social','spreadsheet','software')),
  tier text not null check (tier in ('standard','pro')),
  prompt text not null,
  amount_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending','queued','processing','ready','failed','cancelled')),
  progress integer not null default 0,
  progress_message text,
  project_name text,
  file_count integer,
  error text,
  license_key text,
  stripe_session_id text,
  storage_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index purchases_user_id_idx on purchases(user_id);
create index purchases_status_idx on purchases(status);
create index purchases_created_at_idx on purchases(created_at desc);

-- Enable RLS so users can only read their own purchases.
alter table purchases enable row level security;

create policy "Users can read their own purchases" on purchases
  for select using (auth.uid() = user_id);

create policy "Users can insert their own purchases" on purchases
  for insert with check (auth.uid() = user_id);

create policy "Service role can update purchases" on purchases
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for generated project zips (created at startup by server.js).
-- Buckets are created via the API, so no SQL is needed here.
