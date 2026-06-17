alter table public.contributions
add column if not exists payout_cycle integer not null default 1;

create index if not exists contributions_group_cycle_user_idx
on public.contributions (group_id, payout_cycle, user_id);

create index if not exists payout_queue_group_cycle_received_idx
on public.payout_queue (group_id, payout_cycle, has_received_payout);
