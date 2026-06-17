alter table public.payouts
add column if not exists payout_cycle integer not null default 1;

alter table public.payouts
add column if not exists payout_queue_id uuid references public.payout_queue(id) on delete set null;

create unique index if not exists payouts_payout_queue_id_key
on public.payouts (payout_queue_id)
where payout_queue_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payouts'
      and policyname = 'Group participants can read payouts'
  ) then
    create policy "Group participants can read payouts"
    on public.payouts
    for select
    to authenticated
    using (
      user_id = auth.uid()
      or exists (
        select 1
        from public.groups
        where groups.id = payouts.group_id
          and groups.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.group_members
        where group_members.group_id = payouts.group_id
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
      and tablename = 'payouts'
      and policyname = 'Group owners can record payouts'
  ) then
    create policy "Group owners can record payouts"
    on public.payouts
    for insert
    to authenticated
    with check (
      status = 'paid'
      and exists (
        select 1
        from public.groups
        where groups.id = payouts.group_id
          and groups.owner_id = auth.uid()
      )
    );
  end if;
end $$;
