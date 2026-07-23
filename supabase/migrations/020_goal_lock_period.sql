alter table public.users
  add column if not exists goals_updated_at timestamptz not null default now();
