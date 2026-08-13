-- ActiveCFO no-auth data model.
-- The application server accesses these tables using the Supabase service role.
-- Browser clients never receive a Supabase credential and can select only saquib or rahat.

create extension if not exists pgcrypto;

create or replace function public.activecfo_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

alter function public.activecfo_touch_updated_at() set search_path = pg_catalog, public;

create table if not exists public.activecfo_profiles (
  code text primary key check (code in ('saquib', 'rahat')),
  display_name text not null unique,
  currency text not null default 'INR',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.activecfo_profiles (code, display_name)
values ('saquib', 'Saquib'), ('rahat', 'Rahat')
on conflict (code) do update set display_name = excluded.display_name;

create table if not exists public.activecfo_monthly_settings (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null references public.activecfo_profiles(code) on delete cascade,
  month_start date not null,
  opening_virtual_balance numeric(14,2) not null default 0 check (opening_virtual_balance >= 0),
  target_emergency_months integer not null default 6 check (target_emergency_months between 1 and 60),
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(profile_code, month_start)
);

create table if not exists public.activecfo_thresholds (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null references public.activecfo_profiles(code) on delete cascade,
  month_start date not null,
  bucket text not null check (bucket in ('NEEDS', 'WANTS', 'INVESTMENT')),
  category text not null,
  threshold_amount numeric(14,2) not null check (threshold_amount >= 0),
  warning_percentage numeric(5,2) not null default 80 check (warning_percentage between 1 and 100),
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(profile_code, month_start, bucket, category)
);

create table if not exists public.activecfo_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null references public.activecfo_profiles(code) on delete cascade,
  entry_date date not null default current_date,
  entry_type text not null check (entry_type in ('INCOME', 'EXPENSE')),
  bucket text not null check (bucket in ('INCOME', 'NEEDS', 'WANTS', 'INVESTMENT', 'OTHER')),
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.activecfo_investment_records (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null references public.activecfo_profiles(code) on delete cascade,
  record_type text not null check (record_type in ('EMERGENCY_FUND', 'MUTUAL_FUND', 'ETF', 'CRYPTO', 'CUSTOM')),
  name text not null,
  allocation_date date not null default current_date,
  units numeric(20,8),
  cost_basis numeric(14,2) not null default 0 check (cost_basis >= 0),
  current_value numeric(14,2),
  platform text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.activecfo_insurance_records (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null references public.activecfo_profiles(code) on delete cascade,
  insurance_type text not null check (insurance_type in ('TERM', 'HEALTH', 'CORPORATE')),
  provider text not null,
  policy_number text,
  cover_amount numeric(14,2) not null default 0 check (cover_amount >= 0),
  premium_amount numeric(14,2) not null default 0 check (premium_amount >= 0),
  premium_frequency text not null default 'ANNUAL' check (premium_frequency in ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL')),
  renewal_date date,
  covered_members text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.activecfo_guardrails (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null references public.activecfo_profiles(code) on delete cascade,
  guardrail_type text not null check (guardrail_type in ('SPEND_CAP', 'BALANCE_FLOOR', 'EMERGENCY_RUNWAY', 'INVESTMENT_CAP', 'INSURANCE_REVIEW')),
  label text not null,
  category text,
  threshold_amount numeric(14,2),
  threshold_percentage numeric(5,2) check (threshold_percentage between 0 and 100),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED')),
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.activecfo_strategies (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null references public.activecfo_profiles(code) on delete cascade,
  title text not null,
  area text not null check (area in ('NEEDS', 'WANTS', 'INVESTMENT', 'INSURANCE', 'CASHFLOW')),
  cadence text not null default 'MONTHLY' check (cadence in ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL')),
  trigger_text text,
  action_text text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'COMPLETE')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.activecfo_signals (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null references public.activecfo_profiles(code) on delete cascade,
  severity text not null default 'INFO' check (severity in ('INFO', 'ATTENTION', 'ALERT')),
  title text not null,
  message text not null,
  related_category text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.activecfo_help_articles (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('GETTING_STARTED', 'MONTHLY_SETUP', 'LEDGER', 'INVESTMENTS', 'GUARDRAILS')),
  slug text not null unique,
  title text not null,
  summary text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists activecfo_ledger_profile_date_idx on public.activecfo_ledger_entries(profile_code, entry_date desc);
create index if not exists activecfo_threshold_profile_month_idx on public.activecfo_thresholds(profile_code, month_start);
create index if not exists activecfo_investment_profile_type_idx on public.activecfo_investment_records(profile_code, record_type);

drop trigger if exists activecfo_profiles_touch_updated_at on public.activecfo_profiles;
create trigger activecfo_profiles_touch_updated_at before update on public.activecfo_profiles for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_monthly_settings_touch_updated_at on public.activecfo_monthly_settings;
create trigger activecfo_monthly_settings_touch_updated_at before update on public.activecfo_monthly_settings for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_thresholds_touch_updated_at on public.activecfo_thresholds;
create trigger activecfo_thresholds_touch_updated_at before update on public.activecfo_thresholds for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_ledger_entries_touch_updated_at on public.activecfo_ledger_entries;
create trigger activecfo_ledger_entries_touch_updated_at before update on public.activecfo_ledger_entries for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_investments_touch_updated_at on public.activecfo_investment_records;
create trigger activecfo_investments_touch_updated_at before update on public.activecfo_investment_records for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_insurance_touch_updated_at on public.activecfo_insurance_records;
create trigger activecfo_insurance_touch_updated_at before update on public.activecfo_insurance_records for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_guardrails_touch_updated_at on public.activecfo_guardrails;
create trigger activecfo_guardrails_touch_updated_at before update on public.activecfo_guardrails for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_strategies_touch_updated_at on public.activecfo_strategies;
create trigger activecfo_strategies_touch_updated_at before update on public.activecfo_strategies for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_signals_touch_updated_at on public.activecfo_signals;
create trigger activecfo_signals_touch_updated_at before update on public.activecfo_signals for each row execute function public.activecfo_touch_updated_at();
drop trigger if exists activecfo_help_touch_updated_at on public.activecfo_help_articles;
create trigger activecfo_help_touch_updated_at before update on public.activecfo_help_articles for each row execute function public.activecfo_touch_updated_at();

alter table public.activecfo_profiles enable row level security;
alter table public.activecfo_monthly_settings enable row level security;
alter table public.activecfo_thresholds enable row level security;
alter table public.activecfo_ledger_entries enable row level security;
alter table public.activecfo_investment_records enable row level security;
alter table public.activecfo_insurance_records enable row level security;
alter table public.activecfo_guardrails enable row level security;
alter table public.activecfo_strategies enable row level security;
alter table public.activecfo_signals enable row level security;
alter table public.activecfo_help_articles enable row level security;
