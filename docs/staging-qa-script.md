# Koloverse Staging QA Script

Use this script to run a real two-user QA session on staging. Keep the session manual so it exercises the same browser, auth, RLS, and redirect behavior real users will hit.

## QA Users

Use two staging-only accounts:

- Owner user: `koloverse.owner+staging@example.com`
- Member user: `koloverse.member+staging@example.com`

Use real inboxes or email aliases that can receive Supabase confirmation links if email confirmation is enabled.

## Recommended Test Data

- Group name: `QA Ajo Circle 2026-06-17`
- Contribution amount: `10000`
- Members count: `2`
- Reserve percentage: `10`
- Owner contribution note: `Owner cycle 1 contribution`
- Member contribution note: `Member cycle 1 contribution`
- Rejection test note: `Rejected QA contribution`

If the same staging database is used repeatedly, append the current date/time to the group name, for example `QA Ajo Circle 2026-06-17 14:30`.

## Pre-flight Checks

Before starting:

1. Confirm the latest migrations have been applied through `20260616010000_harden_two_user_qa_policies.sql`.
2. Confirm the staging app has these env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
3. Confirm Supabase Auth allows the staging callback URL.
4. Open two browsers, profiles, or private windows so Owner and Member sessions do not share cookies.

## Manual QA Flow

### 1. Owner Signup/Login

1. In Browser A, open the staging app.
2. Sign up or log in as the Owner user.
3. Land on `/dashboard`.
4. Confirm the dashboard notification bell appears.

### 2. Owner Creates Group

1. Go to `/groups/create`.
2. Create a group with the recommended test data.
3. Confirm redirect to `/groups/[id]`.
4. Confirm the group detail page shows:
   - group name
   - owner identity
   - invite code
   - full invite link
   - member roster with Owner role
5. In Supabase, optionally confirm `group_members` has a row for the owner with `role = 'owner'`.

### 3. Member Joins Group

1. Copy the invite link from Browser A.
2. In Browser B, sign up or log in as the Member user.
3. Paste the invite link.
4. Confirm Browser B joins and redirects to the group detail page.
5. Confirm Browser B can see group details but does not see owner-only payout execution controls.
6. In Browser A, refresh the group detail page and confirm the Member appears in the roster.
7. Confirm the Owner receives a `member_joined` notification.

### 4. Member Submits Contribution

1. In Browser B, click `Add contribution`.
2. Submit amount `10000` with note `Member cycle 1 contribution`.
3. Confirm redirect to the group page.
4. Confirm recent contributions show the Member contribution as `pending`.
5. Confirm `/wallet`, `/transactions`, and `/contributions` show pending or pending-verification state for the Member.
6. In Browser A, confirm the Owner receives a `contribution_submitted` notification.

### 5. Owner Rejects A Contribution

Use this step only if you want to test rejection before approval. If you want the first Member contribution to count toward payout readiness, submit a separate second contribution for rejection.

1. In Browser B, submit a second contribution with note `Rejected QA contribution`.
2. In Browser A, open `/groups/[id]/contributions`.
3. Reject the second contribution.
4. In Browser B, confirm:
   - contribution status becomes `rejected`
   - linked transaction status becomes `rejected`
   - rejection notification appears
   - rejected contribution does not count toward payout readiness

### 6. Owner Approves Member Contribution

1. In Browser A, open `/groups/[id]/contributions`.
2. Approve the Member contribution with note `Member cycle 1 contribution`.
3. Confirm the row becomes `paid`.
4. Confirm linked transaction becomes `success`.
5. In Browser B, confirm approval notification appears.
6. Confirm `/wallet`, `/transactions`, and `/contributions` reflect `success` or `paid`.
7. Confirm payout engine paid member count increments.

### 7. Owner Submits And Approves Own Contribution

Because the test group has two members, the owner should also submit a contribution for a complete cycle.

1. In Browser A, submit amount `10000` with note `Owner cycle 1 contribution`.
2. Return to `/groups/[id]/contributions`.
3. Approve the owner contribution.
4. Confirm payout engine paid member count is `2`.
5. Confirm payout schedule shows an eligible next beneficiary.

### 8. Payout Execution

1. In Browser A, open `/groups/[id]/payouts`.
2. Confirm the next beneficiary card is populated.
3. Confirm group pool, reserve held, and payout amount:
   - group pool should be `NGN 20,000`
   - reserve held should be `NGN 2,000`
   - payout amount should be `NGN 18,000`
4. Click `Record payout`.
5. Confirm:
   - payout row is created
   - current next beneficiary queue row is marked received
   - reserve ledger has one row for cycle 1 and source `payout_execution`
   - beneficiary receives a `payout_recorded` notification
   - group activity shows payout and reserve events
6. Refresh the page and confirm duplicate payout recording is prevented.

### 9. Complete Cycle And Start Next Cycle

1. Continue recording payouts until each eligible queue member in cycle 1 has received payout.
2. Confirm cycle status becomes complete.
3. Click `Start next cycle`.
4. Confirm:
   - new payout queue rows are created for cycle 2
   - payout order is preserved
   - history for cycle 1 remains visible
   - group members receive `cycle_started` notifications
   - group activity logs `cycle_started`
5. Refresh and confirm starting the same next cycle again is prevented.

### 10. Visibility And Access Checks

1. As Member, open:
   - `/groups/[id]`
   - `/groups/[id]/contribute`
   - `/groups/[id]/contributions`
   - `/groups/[id]/payouts`
   - `/groups/[id]/reserve`
   - `/groups/[id]/activity`
2. Confirm Member can view allowed group information.
3. Confirm Member cannot approve contributions, record payouts, or start cycles.
4. Log out as Member and try a group URL. Confirm redirect to `/login`.
5. Optional: use a third staging user that is not in the group and confirm they cannot access group routes.

## QA Result Checklist

| Step | User | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Owner signup/login | Owner | User reaches `/dashboard` with authenticated session |  |  |
| Create group | Owner | Group is created and owner lands on group detail page |  |  |
| Owner membership | Owner | `group_members` contains owner row with `role = 'owner'` |  |  |
| Invite link | Owner | Invite code and full staging invite link are visible/copyable |  |  |
| Member signup/login | Member | User reaches authenticated state |  |  |
| Join group | Member | Member joins via invite link and lands on group detail page |  |  |
| Member roster | Owner | Member appears in group roster with `member` role |  |  |
| Member contribution submit | Member | Contribution status is `pending`; transaction is `pending_verification` |  |  |
| Owner notification | Owner | Owner receives contribution submitted notification |  |  |
| Reject contribution | Owner/Member | Rejected contribution and transaction show `rejected` |  |  |
| Approve contribution | Owner | Approved contribution shows `paid` |  |  |
| Transaction success | Owner/Member | Linked payment transaction shows `success` |  |  |
| Member notification | Member | Member receives approval/rejection notification |  |  |
| Payout paid count | Owner/Member | Payout engine counts only paid contributions |  |  |
| Owner contribution | Owner | Owner contribution can be submitted and approved |  |  |
| Payout schedule | Owner/Member | Eligible next beneficiary appears after paid contributions |  |  |
| Record payout | Owner | Payout row created and queue row marked received |  |  |
| Duplicate payout guard | Owner | Second record attempt is blocked or no duplicate row appears |  |  |
| Reserve ledger | Owner/Member | Reserve row exists once for the cycle/source |  |  |
| Wallet | Owner/Member | Wallet reflects contribution transaction statuses |  |  |
| Transactions | Owner/Member | Transactions page reflects status and provider correctly |  |  |
| Notifications read state | Owner/Member | Mark read and mark all read update unread count |  |  |
| Activity timeline | Owner/Member | Key member/contribution/payout/reserve/cycle events appear |  |  |
| Cycle complete | Owner | Cycle complete only after all queue members receive payout |  |  |
| Start next cycle | Owner | Cycle 2 queue is prepared and history remains |  |  |
| Member restrictions | Member | Member cannot approve, record payout, or start cycle |  |  |
| Non-member restriction | Third user | Non-member cannot access group routes |  |  |

## Manual Supabase Cleanup Guidance

Prefer cleaning through the Supabase Dashboard table editor for a small staging QA run.

Recommended manual cleanup order for a single QA group:

1. Find the QA group in `groups` by name, for example `QA Ajo Circle 2026-06-17`.
2. Copy the group `id`.
3. Delete rows for that `group_id` from:
   - `notifications`
   - `group_activity`
   - `reserve_ledger`
   - `payment_transactions`
   - `payouts`
   - `contributions`
   - `payout_queue`
   - `group_members`
4. Delete the group row from `groups`.
5. Optionally delete the test auth users from Supabase Authentication if they are not needed for future QA.

Dangerous SQL cleanup pattern, for reference only. Run only after replacing the group id and confirming the staging project is not production:

```sql
-- Dangerous: staging cleanup only.
-- Replace the UUID below with the QA group id.
begin;

delete from public.notifications where group_id = '00000000-0000-0000-0000-000000000000';
delete from public.group_activity where group_id = '00000000-0000-0000-0000-000000000000';
delete from public.reserve_ledger where group_id = '00000000-0000-0000-0000-000000000000';
delete from public.payment_transactions where group_id = '00000000-0000-0000-0000-000000000000';
delete from public.payouts where group_id = '00000000-0000-0000-0000-000000000000';
delete from public.contributions where group_id = '00000000-0000-0000-0000-000000000000';
delete from public.payout_queue where group_id = '00000000-0000-0000-0000-000000000000';
delete from public.group_members where group_id = '00000000-0000-0000-0000-000000000000';
delete from public.groups where id = '00000000-0000-0000-0000-000000000000';

commit;
```

Do not commit service role keys, admin SQL credentials, exported user data, or production cleanup scripts to this repository.

## Notes For Testers

- No Paystack integration exists yet.
- No real money moves in this QA flow.
- Payouts and reserves are accounting records only.
- Manual contributions must be approved before they count toward payout readiness.
- Use `/groups/[id]/activity` as the source of truth for the group audit trail.
- Use `/notifications` to validate in-app alerts and read/unread behavior.
