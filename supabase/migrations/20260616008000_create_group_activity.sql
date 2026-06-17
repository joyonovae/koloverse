create table if not exists public.group_activity (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  activity_type text not null,
  title text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.group_activity enable row level security;

create index if not exists group_activity_group_created_idx
on public.group_activity (group_id, created_at desc);

create index if not exists group_activity_actor_idx
on public.group_activity (actor_id);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_activity'
      and policyname = 'Group participants can read group activity'
  ) then
    create policy "Group participants can read group activity"
    on public.group_activity
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.groups
        where groups.id = group_activity.group_id
          and groups.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.group_members
        where group_members.group_id = group_activity.group_id
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
      and tablename = 'group_activity'
      and policyname = 'Group participants can insert group activity'
  ) then
    create policy "Group participants can insert group activity"
    on public.group_activity
    for insert
    to authenticated
    with check (
      actor_id = auth.uid()
      and (
        exists (
          select 1
          from public.groups
          where groups.id = group_activity.group_id
            and groups.owner_id = auth.uid()
        )
        or exists (
          select 1
          from public.group_members
          where group_members.group_id = group_activity.group_id
            and group_members.user_id = auth.uid()
        )
      )
    );
  end if;
end $$;
