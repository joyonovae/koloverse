create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  contribution_id uuid references public.contributions(id) on delete set null,
  amount numeric not null,
  currency text not null default 'NGN',
  provider text,
  provider_reference text,
  status text not null default 'pending',
  transaction_type text not null,
  payout_cycle integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_transactions enable row level security;

create index if not exists payment_transactions_user_created_idx
on public.payment_transactions (user_id, created_at desc);

create index if not exists payment_transactions_group_created_idx
on public.payment_transactions (group_id, created_at desc);

create index if not exists payment_transactions_contribution_idx
on public.payment_transactions (contribution_id);

create index if not exists payment_transactions_provider_reference_idx
on public.payment_transactions (provider, provider_reference)
where provider_reference is not null;

create or replace function public.set_payment_transactions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payment_transactions_updated_at
on public.payment_transactions;

create trigger set_payment_transactions_updated_at
before update on public.payment_transactions
for each row
execute function public.set_payment_transactions_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_transactions'
      and policyname = 'Users can read their own payment transactions'
  ) then
    create policy "Users can read their own payment transactions"
    on public.payment_transactions
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_transactions'
      and policyname = 'Group owners can read group payment transactions'
  ) then
    create policy "Group owners can read group payment transactions"
    on public.payment_transactions
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.groups
        where groups.id = payment_transactions.group_id
          and groups.owner_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_transactions'
      and policyname = 'Users can insert their own manual payment transactions'
  ) then
    create policy "Users can insert their own manual payment transactions"
    on public.payment_transactions
    for insert
    to authenticated
    with check (
      user_id = auth.uid()
      and transaction_type in ('contribution')
      and coalesce(provider, 'manual') = 'manual'
      and status in ('pending', 'success')
    );
  end if;
end $$;
