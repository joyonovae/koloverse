do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_members'
      and policyname = 'Users can read their own memberships'
  ) then
    create policy "Users can read their own memberships"
    on public.group_members
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_members'
      and policyname = 'Group owners can read group memberships'
  ) then
    create policy "Group owners can read group memberships"
    on public.group_members
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.groups
        where groups.id = group_members.group_id
          and groups.owner_id = auth.uid()
      )
    );
  end if;
end $$;
