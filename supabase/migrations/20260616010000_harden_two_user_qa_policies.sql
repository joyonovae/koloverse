drop policy if exists "Users can insert their own manual payment transactions"
on public.payment_transactions;

drop policy if exists "Users can insert pending manual contribution transactions"
on public.payment_transactions;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_transactions'
      and policyname = 'Users can insert own pending manual contribution transactions'
  ) then
    create policy "Users can insert own pending manual contribution transactions"
    on public.payment_transactions
    for insert
    to authenticated
    with check (
      user_id = auth.uid()
      and transaction_type = 'contribution'
      and provider = 'manual'
      and status = 'pending_verification'
      and exists (
        select 1
        from public.contributions
        where contributions.id = payment_transactions.contribution_id
          and contributions.group_id = payment_transactions.group_id
          and contributions.user_id = auth.uid()
          and contributions.status = 'pending'
      )
    );
  end if;
end $$;

drop policy if exists "Authenticated group participants can insert notifications"
on public.notifications;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Authenticated group participants can notify group participants'
  ) then
    create policy "Authenticated group participants can notify group participants"
    on public.notifications
    for insert
    to authenticated
    with check (
      (
        group_id is null
        and user_id = auth.uid()
      )
      or (
        (
          exists (
            select 1
            from public.groups
            where groups.id = notifications.group_id
              and groups.owner_id = auth.uid()
          )
          or exists (
            select 1
            from public.group_members actor_membership
            where actor_membership.group_id = notifications.group_id
              and actor_membership.user_id = auth.uid()
          )
        )
        and (
          exists (
            select 1
            from public.groups
            where groups.id = notifications.group_id
              and groups.owner_id = notifications.user_id
          )
          or exists (
            select 1
            from public.group_members recipient_membership
            where recipient_membership.group_id = notifications.group_id
              and recipient_membership.user_id = notifications.user_id
          )
        )
      )
    );
  end if;
end $$;
