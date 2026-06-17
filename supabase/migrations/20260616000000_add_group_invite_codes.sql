alter table public.groups
add column if not exists invite_code text;

create unique index if not exists groups_invite_code_key
on public.groups (invite_code)
where invite_code is not null;

update public.groups
set invite_code = 'KLV-' || upper(substr(replace(id::text, '-', ''), 1, 6))
where invite_code is null;

alter table public.groups
alter column invite_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'groups'
      and policyname = 'Authenticated users can find groups by invite code'
  ) then
    create policy "Authenticated users can find groups by invite code"
    on public.groups
    for select
    to authenticated
    using (invite_code is not null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_members'
      and policyname = 'Users can insert their own group membership'
  ) then
    create policy "Users can insert their own group membership"
    on public.group_members
    for insert
    to authenticated
    with check (
      auth.uid() = user_id
      and (
        role = 'member'
        or (
          role = 'owner'
          and exists (
            select 1
            from public.groups
            where groups.id = group_members.group_id
              and groups.owner_id = auth.uid()
          )
        )
      )
    );
  end if;
end $$;
