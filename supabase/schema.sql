-- Personal Finance Tracker — database schema
-- Run this in the Supabase SQL editor for a fresh project.
-- Every table is scoped to auth.uid() via Row Level Security so each user only ever sees their own data.

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles: one row per authenticated user
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency text not null default 'BDT',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, currency) values (new.id, 'BDT');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- accounts: named "wallets" (Cash, Bank, Card, mobile wallet, ...).
-- The detail fields (account/card number, branch) are optional and only
-- ever shown in the app behind a password re-check, or included in the
-- user's own deliberate "share this account" action — same trust boundary
-- as the rest of this user's financial data (RLS-scoped to them alone),
-- not a bank-grade secret vault.
-- ============================================================
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  account_type text not null default 'cash' check (account_type in ('cash', 'bank', 'card', 'mobile_wallet', 'brokerage', 'other')),
  institution_name text,
  account_number text,
  card_number text,
  branch_name text,
  branch_address text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists accounts_user_id_idx on accounts (user_id);
-- Manual display ordering, and an optional single "primary" flag per user
-- (enforced by the partial unique index below, not an application check).
alter table accounts add column if not exists sort_order integer not null default 0;
alter table accounts add column if not exists is_primary boolean not null default false;
create unique index if not exists accounts_one_primary_per_user on accounts (user_id) where is_primary;

-- "brokerage" covers a stock-exchange trading/ledger account (e.g. a DSE BO
-- account) — its cash figure is called a "ledger balance" in that domain,
-- but it's the same underlying concept as opening_balance below.
alter table accounts drop constraint if exists accounts_account_type_check;
alter table accounts add constraint accounts_account_type_check
  check (account_type in ('cash', 'bank', 'card', 'mobile_wallet', 'brokerage', 'other'));

-- The balance the account started at before any transactions were logged in
-- this app — e.g. what was already in your bank account, or a brokerage
-- account's settled ledger balance, the day you started using this app.
-- computeAccountBalances() adds this to the sum of the account's
-- transactions rather than starting every account's running total at 0.
alter table accounts add column if not exists opening_balance numeric(14, 2) not null default 0;

-- ============================================================
-- categories: user-editable expense/income categories
-- ============================================================
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  icon text,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);
create index if not exists categories_user_id_idx on categories (user_id);

-- ============================================================
-- events: trips / gatherings with their own budget
-- ============================================================
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  budget_amount numeric(14, 2),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists events_user_id_idx on events (user_id);

-- Packing/todo checklist items for an event — meaningless without their
-- parent event, so cascade delete (unlike transactions, which merely lose
-- their event tag via on delete set null).
create table if not exists event_checklist_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null check (length(trim(text)) > 0),
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists event_checklist_items_event_id_idx on event_checklist_items (event_id);

-- ============================================================
-- transactions: the core table — every expense and income entry
-- ============================================================
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount numeric(14, 2) not null check (amount > 0),
  category_id uuid references categories (id) on delete set null,
  account_id uuid references accounts (id) on delete set null,
  -- Only set for type='transfer' — account_id is the "from" side, this is
  -- the "to" side. A transfer never touches category_id/event_id/etc.
  to_account_id uuid references accounts (id) on delete set null,
  event_id uuid references events (id) on delete set null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_id_idx on transactions (user_id);
create index if not exists transactions_user_date_idx on transactions (user_id, occurred_on desc);
create index if not exists transactions_category_idx on transactions (category_id);
create index if not exists transactions_event_idx on transactions (event_id);

-- ============================================================
-- Event participant money tracking.
-- Model: every trip expense/income names who gave that money — a row here,
-- or null meaning the app's user ("Myself", not a row — always present in
-- the UI, never deletable, so it needs no table row of its own). A trip's
-- fair share is (everyone's total given) / (participant count incl.
-- Myself); a participant's balance is their total given minus that average.
-- Settling is a direct transfer between any two parties (participant or
-- Myself on either side) that nets against their balances — see
-- computeContributionBalances in src/lib/domain/split.ts.
-- ============================================================
create table if not exists event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists event_participants_event_id_idx on event_participants (event_id);

-- Who gave this money — null means the app's user ("Myself") did, which is
-- also what auto-creates a real personal-history record for it (see
-- in_personal_history below). Applies to both expense and income rows tied
-- to an event (kept out of transactions' own create table above because
-- event_participants must exist first).
alter table transactions add column if not exists paid_by_participant_id uuid references event_participants (id) on delete set null;
alter table transactions add column if not exists in_personal_history boolean not null default true;
create index if not exists transactions_paid_by_participant_idx on transactions (paid_by_participant_id);

-- Money that came from outside the group entirely (e.g. a parent funding
-- part of the trip) — paid_by_participant_id stays null same as "Myself",
-- but this flag keeps it out of the split: it still counts as real trip
-- spend/income, just isn't attributed to anyone's own contribution, so it
-- reduces what the group needs to split without inflating any one balance.
alter table transactions add column if not exists is_external boolean not null default false;

drop table if exists expense_splits;

drop table if exists participant_settlements;
create table participant_settlements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Either side null means "Myself" — never both (see check below).
  from_participant_id uuid references event_participants (id) on delete cascade,
  to_participant_id uuid references event_participants (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  settled_on date not null default current_date,
  -- Auto-set when either side is "Myself", since real cash then moved into
  -- or out of the user's own pocket — links to that personal-history row.
  transaction_id uuid references transactions (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint participant_settlements_different_parties check (from_participant_id is distinct from to_participant_id)
);
create index if not exists participant_settlements_event_id_idx on participant_settlements (event_id);
create index if not exists participant_settlements_from_idx on participant_settlements (from_participant_id);
create index if not exists participant_settlements_to_idx on participant_settlements (to_participant_id);

-- A planned expense/income for a trip — money you know you'll need or
-- expect to get, before anyone's actually paid it. Fulfilling one (fully
-- or partially) creates a normal transaction tagged back to it via
-- transactions.scheduled_item_id, so it flows through the balance table
-- like any other trip money; "remaining" is just amount minus the sum of
-- those linked transactions (computed in the service layer, not stored).
create table if not exists event_scheduled_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists event_scheduled_items_event_id_idx on event_scheduled_items (event_id);

alter table transactions add column if not exists scheduled_item_id uuid references event_scheduled_items (id) on delete set null;
create index if not exists transactions_scheduled_item_idx on transactions (scheduled_item_id);

-- Optional per-expense custom split ratios. A transaction with no rows here
-- falls back to the default equal split among all event participants
-- (unchanged legacy behavior) — see computeSplitBalances in
-- src/lib/domain/split.ts. The share_amounts for one transaction must sum to
-- that transaction's amount; enforced in the app layer, not here.
create table if not exists transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- null means "Myself" — same convention as transactions.paid_by_participant_id.
  participant_id uuid references event_participants (id) on delete cascade,
  share_amount numeric(14, 2) not null check (share_amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists transaction_splits_transaction_idx on transaction_splits (transaction_id);

alter table transaction_splits enable row level security;
create policy "transaction_splits: owner read/write" on transaction_splits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on transaction_splits to authenticated;

-- ============================================================
-- investments
-- ============================================================
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (length(trim(type)) > 0),
  amount_invested numeric(14, 2) not null,
  current_value numeric(14, 2) not null,
  date_invested date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists investments_user_id_idx on investments (user_id);

-- ============================================================
-- loans (given to someone, or taken from someone)
-- ============================================================
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_name text not null,
  direction text not null check (direction in ('given', 'taken')),
  principal_amount numeric(14, 2) not null,
  date_of_loan date not null default current_date,
  due_date date,
  status text not null default 'open' check (status in ('open', 'partly_paid', 'settled')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists loans_user_id_idx on loans (user_id);

-- Optional simple-interest rate (annual %, e.g. 5.5 for 5.5%/yr) — accrual is
-- computed in the app (date_of_loan to today, or to settled date once that's
-- tracked) rather than stored, so it's always current without a cron job.
alter table loans add column if not exists interest_rate numeric(6, 3);

create table if not exists loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  paid_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists loan_payments_loan_id_idx on loan_payments (loan_id);

-- ============================================================
-- budgets (optional monthly cap per category — Phase 6)
-- ============================================================
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  month date not null, -- first day of the month this budget applies to
  cap_amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table events enable row level security;
alter table event_checklist_items enable row level security;
alter table event_participants enable row level security;
alter table participant_settlements enable row level security;
alter table event_scheduled_items enable row level security;
alter table transactions enable row level security;
alter table investments enable row level security;
alter table loans enable row level security;
alter table loan_payments enable row level security;
alter table budgets enable row level security;

create policy "profiles: owner read/write" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "accounts: owner read/write" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories: owner read/write" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "events: owner read/write" on events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "event_checklist_items: owner read/write" on event_checklist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "event_participants: owner read/write" on event_participants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "participant_settlements: owner read/write" on participant_settlements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "event_scheduled_items: owner read/write" on event_scheduled_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions: owner read/write" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "investments: owner read/write" on investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "loans: owner read/write" on loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "loan_payments: owner read/write" on loan_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets: owner read/write" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Table-level grants
-- RLS policies above only filter *which* rows a query can touch — Postgres
-- still requires baseline table privileges before RLS is even evaluated.
-- These are the "Automatically expose new tables" grants, made explicit here
-- instead of relying on that project-wide dashboard toggle.
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  profiles, accounts, categories, events, event_checklist_items, event_participants,
  participant_settlements, event_scheduled_items, transactions, investments, loans, loan_payments, budgets
  to authenticated;

-- ============================================================
-- Seed default categories for a new user (called from the app after first login)
-- ============================================================
create or replace function public.seed_default_categories(p_user_id uuid)
returns void as $$
begin
  insert into categories (user_id, name, type, icon) values
    (p_user_id, 'Food & Dining', 'expense', 'utensils'),
    (p_user_id, 'Transport', 'expense', 'car'),
    (p_user_id, 'Groceries', 'expense', 'shopping-cart'),
    (p_user_id, 'Bills & Utilities', 'expense', 'receipt'),
    (p_user_id, 'Shopping', 'expense', 'shopping-bag'),
    (p_user_id, 'Health', 'expense', 'heart-pulse'),
    (p_user_id, 'Entertainment', 'expense', 'film'),
    (p_user_id, 'Education', 'expense', 'book-open'),
    (p_user_id, 'Rent', 'expense', 'home'),
    (p_user_id, 'Other', 'expense', 'more-horizontal'),
    (p_user_id, 'Salary', 'income', 'wallet'),
    (p_user_id, 'Freelance', 'income', 'briefcase'),
    (p_user_id, 'Gift', 'income', 'gift'),
    (p_user_id, 'Other Income', 'income', 'plus-circle')
  on conflict do nothing;
end;
$$ language plpgsql security definer;

grant execute on function public.seed_default_categories(uuid) to authenticated;

-- ============================================================
-- Everything the event detail page needs, in one round-trip instead of
-- ~10 separate queries. security invoker (the default) so RLS still scopes
-- every subquery to the caller — this is not a privilege escalation, purely
-- a way to fetch fewer, wider payloads instead of many small ones.
-- ============================================================
create or replace function public.get_event_detail(p_event_id uuid)
returns jsonb
language sql
security invoker
stable
as $$
  select jsonb_build_object(
    'event', (
      select to_jsonb(e) from events e where e.id = p_event_id
    ),
    'transactions', (
      select coalesce(jsonb_agg(row_to_json(x) order by x.occurred_on desc, x.created_at desc), '[]'::jsonb)
      from (
        select
          t.*,
          case when c.id is not null then jsonb_build_object('name', c.name, 'icon', c.icon) else null end as categories,
          case when a.id is not null then jsonb_build_object('name', a.name) else null end as accounts
        from transactions t
        left join categories c on c.id = t.category_id
        left join accounts a on a.id = t.account_id
        where t.event_id = p_event_id
      ) x
    ),
    'checklist', (
      select coalesce(jsonb_agg(row_to_json(i) order by i.created_at asc), '[]'::jsonb)
      from event_checklist_items i
      where i.event_id = p_event_id
    ),
    'participants', (
      select coalesce(jsonb_agg(row_to_json(p) order by p.name asc), '[]'::jsonb)
      from event_participants p
      where p.event_id = p_event_id
    ),
    'settlements', (
      select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      from participant_settlements s
      where s.event_id = p_event_id
    ),
    'scheduled_items', (
      select coalesce(jsonb_agg(row_to_json(si) order by si.created_at asc), '[]'::jsonb)
      from event_scheduled_items si
      where si.event_id = p_event_id
    ),
    'itinerary', (
      select coalesce(jsonb_agg(row_to_json(ii) order by ii.day_date asc, ii.time asc nulls last), '[]'::jsonb)
      from event_itinerary_items ii
      where ii.event_id = p_event_id
    ),
    'transaction_splits', (
      select coalesce(jsonb_agg(row_to_json(sp)), '[]'::jsonb)
      from transaction_splits sp
      join transactions t2 on t2.id = sp.transaction_id
      where t2.event_id = p_event_id
    ),
    'categories', (
      select coalesce(jsonb_agg(row_to_json(c) order by c.name asc), '[]'::jsonb)
      from categories c
    ),
    'accounts', (
      select coalesce(jsonb_agg(row_to_json(a) order by a.name asc), '[]'::jsonb)
      from accounts a
    ),
    'profile', (
      select to_jsonb(pr) from profiles pr where pr.id = auth.uid()
    )
  )
$$;

grant execute on function public.get_event_detail(uuid) to authenticated;

-- ============================================================
-- Self-service account deletion. Every table's user_id/id column already
-- references auth.users(id) on delete cascade, so removing the auth.users
-- row cascades through and deletes every one of this user's rows in every
-- table. security definer so it can run as the function owner (which has
-- privilege on auth.users), while `where id = auth.uid()` keeps it scoped to
-- only the caller's own account — a user can never delete anyone else's.
-- ============================================================
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

-- ============================================================
-- Day-by-day trip itinerary + a public, read-only "share this trip" link.
-- ============================================================

-- One planned stop/activity for a trip — meaningless without its parent
-- event, so cascade delete like the checklist above.
create table if not exists event_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_date date not null,
  time text,
  title text not null check (length(trim(title)) > 0),
  notes text,
  -- Free-text place name or address — "map view" is a plain Google Maps
  -- search link built from this, not an embedded map (no maps API key
  -- available), so no coordinates are stored, just what a person would type
  -- into a maps search box.
  location text,
  created_at timestamptz not null default now()
);
create index if not exists event_itinerary_items_event_id_idx on event_itinerary_items (event_id);
-- Covers an already-existing table from before these columns were added.
alter table event_itinerary_items add column if not exists location text;
-- Structured booking info: what kind of stop this is, plus an optional
-- confirmation/reference number (flight PNR, hotel booking ref, etc.) shown
-- distinctly from the free-text notes field.
alter table event_itinerary_items add column if not exists item_type text not null default 'activity';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_itinerary_items_item_type_check'
  ) then
    alter table event_itinerary_items add constraint event_itinerary_items_item_type_check
      check (item_type in ('activity', 'flight', 'hotel', 'transport', 'other'));
  end if;
end $$;
alter table event_itinerary_items add column if not exists confirmation_number text;

alter table event_itinerary_items enable row level security;
create policy "event_itinerary_items: owner read/write" on event_itinerary_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on event_itinerary_items to authenticated;

-- A random, unguessable token that — when set — makes an event's plan (not
-- its money) visible via a public link. Null (the default) means sharing is
-- off; nothing about the event is exposed until the owner explicitly enables it.
alter table events add column if not exists share_token uuid unique;

-- Deliberately excludes transactions, budget_amount, and anything about
-- money — a trip-plan link is for showing companions the itinerary, not
-- your spending. security definer so an anonymous visitor (no session,
-- normal RLS would show nothing) can read it, but only ever the one event
-- whose token they were given — every subquery is scoped by that same token.
create or replace function public.get_shared_trip(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'event', (
      select jsonb_build_object('name', name, 'start_date', start_date, 'end_date', end_date, 'notes', notes)
      from events where share_token = p_token
    ),
    'itinerary', (
      select coalesce(jsonb_agg(row_to_json(i) order by i.day_date asc, i.time asc nulls last), '[]'::jsonb)
      from event_itinerary_items i
      join events e on e.id = i.event_id
      where e.share_token = p_token
    ),
    'checklist', (
      select coalesce(jsonb_agg(jsonb_build_object('text', c.text, 'is_done', c.is_done) order by c.created_at asc), '[]'::jsonb)
      from event_checklist_items c
      join events e on e.id = c.event_id
      where e.share_token = p_token
    ),
    'participants', (
      select coalesce(jsonb_agg(jsonb_build_object('name', p.name) order by p.name asc), '[]'::jsonb)
      from event_participants p
      join events e on e.id = p.event_id
      where e.share_token = p_token
    )
  )
$$;

grant execute on function public.get_shared_trip(uuid) to anon, authenticated;

-- ============================================================
-- Receipt photos: one optional image attached per transaction, stored in a
-- private "receipts" Storage bucket under <user_id>/<transaction_id>.<ext>.
-- Signed URLs (short-lived) are how the app ever shows one — the bucket
-- itself is never public.
-- ============================================================
alter table transactions add column if not exists receipt_path text;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts: owner select" on storage.objects;
create policy "receipts: owner select" on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts: owner insert" on storage.objects;
create policy "receipts: owner insert" on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts: owner update" on storage.objects;
create policy "receipts: owner update" on storage.objects for update
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts: owner delete" on storage.objects;
create policy "receipts: owner delete" on storage.objects for delete
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Dashboard, consolidated into one round trip. The dashboard used to fire 9
-- independent Supabase queries in parallel (profile, month summary, recent
-- transactions, account balances, investment summary, loan net effect, loan
-- reminders, categories, recurring-detection history) — functionally fine,
-- but 9 simultaneous new HTTPS connections to the same host turned out to be
-- enough to occasionally blow past a ~10s connect timeout under real-world
-- network conditions (found via direct measurement, reproduced with a bare
-- Node script hitting the same endpoint — nothing Supabase- or app-specific,
-- just a burst-of-concurrent-connections problem). Same fix as
-- get_event_detail below: one function call, raw rows only — the actual
-- math (balances, summaries, urgency, recurring detection) stays in the
-- existing pure TypeScript domain functions, unchanged.
-- security invoker, so every subquery is still governed by that table's own
-- RLS policy exactly as if each had been queried separately.
-- ============================================================
create or replace function public.get_dashboard_data(p_month_start date, p_month_end date)
returns jsonb
language sql
security invoker
stable
as $$
  select jsonb_build_object(
    'profile', (
      select to_jsonb(pr) from profiles pr where pr.id = auth.uid()
    ),
    'month_transactions', (
      select coalesce(jsonb_agg(jsonb_build_object('type', t.type, 'amount', t.amount)), '[]'::jsonb)
      from transactions t
      where t.in_personal_history = true
        and t.type <> 'transfer'
        and t.occurred_on >= p_month_start
        and t.occurred_on <= p_month_end
    ),
    'recent_transactions', (
      select coalesce(jsonb_agg(row_to_json(x) order by x.occurred_on desc, x.created_at desc), '[]'::jsonb)
      from (
        select
          t.*,
          case when c.id is not null then jsonb_build_object('name', c.name, 'icon', c.icon) else null end as categories,
          case when a.id is not null then jsonb_build_object('name', a.name) else null end as accounts,
          case when e.id is not null then jsonb_build_object('name', e.name) else null end as events
        from transactions t
        left join categories c on c.id = t.category_id
        left join accounts a on a.id = t.account_id
        left join events e on e.id = t.event_id
        where t.in_personal_history = true
        order by t.occurred_on desc, t.created_at desc
        limit 6
      ) x
    ),
    'balance_accounts', (
      select coalesce(
        jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'opening_balance', a.opening_balance) order by a.name asc),
        '[]'::jsonb
      )
      from accounts a
    ),
    'balance_transactions', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'account_id', t.account_id, 'to_account_id', t.to_account_id, 'type', t.type, 'amount', t.amount
        )),
        '[]'::jsonb
      )
      from transactions t
      where t.in_personal_history = true
    ),
    'investments', (
      select coalesce(
        jsonb_agg(jsonb_build_object('amount_invested', i.amount_invested, 'current_value', i.current_value)),
        '[]'::jsonb
      )
      from investments i
    ),
    'loans', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'id', l.id,
          'person_name', l.person_name,
          'direction', l.direction,
          'principal_amount', l.principal_amount,
          'due_date', l.due_date,
          'status', l.status,
          'loan_payments', (
            select coalesce(jsonb_agg(jsonb_build_object('amount', lp.amount)), '[]'::jsonb)
            from loan_payments lp where lp.loan_id = l.id
          )
        )),
        '[]'::jsonb
      )
      from loans l
    ),
    'categories', (
      select coalesce(jsonb_agg(row_to_json(c) order by c.name asc), '[]'::jsonb)
      from categories c
    ),
    'recent_expenses', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'category_id', t.category_id, 'account_id', t.account_id, 'amount', t.amount,
          'occurred_on', t.occurred_on, 'note', t.note
        )),
        '[]'::jsonb
      )
      from transactions t
      where t.type = 'expense'
        and t.in_personal_history = true
        and t.occurred_on >= (current_date - interval '6 months')::date
    )
  )
$$;

grant execute on function public.get_dashboard_data(date, date) to authenticated;
