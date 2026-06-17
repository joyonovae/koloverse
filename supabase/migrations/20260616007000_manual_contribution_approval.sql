create index if not exists contributions_group_status_created_idx
on public.contributions (group_id, status, created_at desc);

create index if not exists payment_transactions_contribution_status_idx
on public.payment_transactions (contribution_id, status);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_transactions'
      and policyname = 'Users can insert pending manual contribution transactions'
  ) then
    create policy "Users can insert pending manual contribution transactions"
    on public.payment_transactions
    for insert
    to authenticated
    with check (
      user_id = auth.uid()
      and transaction_type = 'contribution'
      and provider = 'manual'
      and status = 'pending_verification'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contributions'
      and policyname = 'Group owners can update contribution review status'
  ) then
    create policy "Group owners can update contribution review status"
    on public.contributions
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.groups
        where groups.id = contributions.group_id
          and groups.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.groups
        where groups.id = contributions.group_id
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
      and policyname = 'Group owners can update payment transaction review status'
  ) then
    create policy "Group owners can update payment transaction review status"
    on public.payment_transactions
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.groups
        where groups.id = payment_transactions.group_id
          and groups.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.groups
        where groups.id = payment_transactions.group_id
          and groups.owner_id = auth.uid()
      )
    );
  end if;
end $$;
