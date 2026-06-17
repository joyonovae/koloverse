create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  metadata jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_created_idx
on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
on public.notifications (user_id, is_read, created_at desc);

create index if not exists notifications_group_idx
on public.notifications (group_id, created_at desc);

create unique index if not exists notifications_dedupe_key_idx
on public.notifications (
  user_id,
  type,
  coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid),
  (metadata ->> 'dedupe_key')
)
where metadata ? 'dedupe_key';

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Users can read own notifications'
  ) then
    create policy "Users can read own notifications"
    on public.notifications
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
      and tablename = 'notifications'
      and policyname = 'Users can update own notifications'
  ) then
    create policy "Users can update own notifications"
    on public.notifications
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Authenticated group participants can insert notifications'
  ) then
    create policy "Authenticated group participants can insert notifications"
    on public.notifications
    for insert
    to authenticated
    with check (
      (
        group_id is null
        and user_id = auth.uid()
      )
      or exists (
        select 1
        from public.groups
        where groups.id = notifications.group_id
          and groups.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.group_members
        where group_members.group_id = notifications.group_id
          and group_members.user_id = auth.uid()
      )
    );
  end if;
end $$;
