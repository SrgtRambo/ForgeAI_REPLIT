-- Forge AI backend schema. Run once in the SQL editor of the Supabase project this backend uses.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  type text not null,
  tier text not null check (tier in ('standard', 'pro')),
  prompt text not null check (char_length(prompt) between 20 and 6000),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'queued', 'processing', 'ready', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  progress_message text,
  stripe_session_id text unique,
  storage_path text,
  project_name text,
  file_count integer,
  error text,
  license_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep existing installations aligned with the types supported by src/archetypes.js.
alter table public.purchases drop constraint if exists purchases_type_check;
alter table public.purchases
  add constraint purchases_type_check
  check (type in ('website', 'restaurant', 'services', 'saas', 'social', 'spreadsheet', 'software'));

create index if not exists purchases_user_created_idx on public.purchases (user_id, created_at desc);
create index if not exists purchases_status_idx on public.purchases (status) where status in ('queued', 'processing');

create or replace function public.touch_purchases_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists purchases_touch_updated_at on public.purchases;
create trigger purchases_touch_updated_at before update on public.purchases
  for each row execute function public.touch_purchases_updated_at();

-- Customers may only read their own purchases. All writes go through the backend (service role).
alter table public.purchases enable row level security;
drop policy if exists "Customers read own purchases" on public.purchases;
create policy "Customers read own purchases" on public.purchases
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.purchases from anon, authenticated;
grant select on public.purchases to authenticated;
grant all on public.purchases to service_role;

-- Private bucket for finished zips; downloads use short-lived signed links.
insert into storage.buckets (id, name, public)
values ('projects', 'projects', false)
on conflict (id) do update set public = false;

-- Optional: lets the website show live progress without polling.
do $$
begin
  alter publication supabase_realtime add table public.purchases;
exception when duplicate_object or undefined_object then null;
end $$;
