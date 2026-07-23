alter table public.users
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_plan text,
  add column if not exists premium_since timestamptz,
  add column if not exists revenuecat_id text;
