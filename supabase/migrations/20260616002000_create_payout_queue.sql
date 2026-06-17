create table if not exists public.payout_queue (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null,
  payout_position integer not null,
  payout_cycle integer not null default 1,
  has_received_payout boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, user_id, payout_cycle),
  unique (group_id, payout_position, payout_cycle)
);

alter table public.payout_queue enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payout_queue'
      and policyname = 'Group participants can read payout queue'
  ) then
    create policy "Group participants can read payout queue"
    on public.payout_queue
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.groups
        where groups.id = payout_queue.group_id
          and groups.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.group_members
        where group_members.group_id = payout_queue.group_id
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
      and tablename = 'payout_queue'
      and policyname = 'Group owners can manage payout queue'
  ) then
    create policy "Group owners can manage payout queue"
    on public.payout_queue
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.groups
        where groups.id = payout_queue.group_id
          and groups.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.groups
        where groups.id = payout_queue.group_id
          and groups.owner_id = auth.uid()
      )
    );
  end if;
end $$;

create or replace function public.add_member_to_payout_queue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_position integer;
begin
  select coalesce(max(payout_position), 0) + 1
  into next_position
  from public.payout_queue
  where group_id = new.group_id
    and payout_cycle = 1;

  insert into public.payout_queue (
    group_id,
    user_id,
    payout_position,
    payout_cycle,
    has_received_payout
  )
  values (
    new.group_id,
    new.user_id,
    next_position,
    1,
    false
  )
  on conflict (group_id, user_id, payout_cycle) do nothing;

  return new;
end;
$$;

drop trigger if exists add_member_to_payout_queue_after_insert
on public.group_members;

create trigger add_member_to_payout_queue_after_insert
after insert on public.group_members
for each row
execute function public.add_member_to_payout_queue();

with participant_seed as (
  select
    group_members.group_id,
    group_members.user_id,
    group_members.joined_at as joined_at
  from public.group_members

  union all

  select
    groups.id as group_id,
    groups.owner_id as user_id,
    groups.created_at as joined_at
  from public.groups
),
deduped_participants as (
  select distinct on (group_id, user_id)
    group_id,
    user_id,
    joined_at
  from participant_seed
  order by group_id, user_id, joined_at nulls last
),
missing_participants as (
  select
    deduped_participants.group_id,
    deduped_participants.user_id,
    deduped_participants.joined_at
  from deduped_participants
  where not exists (
    select 1
    from public.payout_queue
    where payout_queue.group_id = deduped_participants.group_id
      and payout_queue.user_id = deduped_participants.user_id
      and payout_queue.payout_cycle = 1
  )
),
numbered_participants as (
  select
    missing_participants.group_id,
    missing_participants.user_id,
    coalesce(existing_queue.max_position, 0)
      + row_number() over (
        partition by missing_participants.group_id
        order by missing_participants.joined_at nulls last, missing_participants.user_id
      ) as payout_position
  from missing_participants
  left join (
    select group_id, max(payout_position) as max_position
    from public.payout_queue
    where payout_cycle = 1
    group by group_id
  ) existing_queue on existing_queue.group_id = missing_participants.group_id
)
insert into public.payout_queue (
  group_id,
  user_id,
  payout_position,
  payout_cycle,
  has_received_payout
)
select
  group_id,
  user_id,
  payout_position,
  1,
  false
from numbered_participants
on conflict (group_id, user_id, payout_cycle) do nothing;
