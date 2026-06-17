create table if not exists public.reserve_ledger (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  payout_cycle integer not null,
  amount numeric not null,
  reason text not null,
  source text not null,
  created_at timestamptz not null default now()
);

alter table public.reserve_ledger enable row level security;

create unique index if not exists reserve_ledger_group_cycle_source_key
on public.reserve_ledger (group_id, payout_cycle, source);

create index if not exists reserve_ledger_group_cycle_idx
on public.reserve_ledger (group_id, payout_cycle, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reserve_ledger'
      and policyname = 'Group participants can read reserve ledger'
  ) then
    create policy "Group participants can read reserve ledger"
    on public.reserve_ledger
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.groups
        where groups.id = reserve_ledger.group_id
          and groups.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.group_members
        where group_members.group_id = reserve_ledger.group_id
          and group_members.user_id = auth.uid()
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
      and tablename = 'reserve_ledger'
      and policyname = 'Group owners can insert reserve ledger entries'
  ) then
    create policy "Group owners can insert reserve ledger entries"
    on public.reserve_ledger
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.groups
        where groups.id = reserve_ledger.group_id
          and groups.owner_id = auth.uid()
      )
    );
  end if;
end $$;
