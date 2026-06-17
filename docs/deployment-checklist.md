# Koloverse Staging Deployment Checklist

Use this checklist before deploying Koloverse to Vercel or another Node.js-capable Next.js host.

## Required Environment Variables

Set these in the staging deployment environment before building:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL for the staging database.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public API key for the same project.
- `NEXT_PUBLIC_SITE_URL`: Canonical app URL for the deployed environment, for example `https://staging.example.com`.

Do not add a Supabase service role key to any `NEXT_PUBLIC_` variable. This app currently does not require a service role key in the Next.js runtime.

## Supabase Migrations

Apply all migrations in order before opening staging to QA:

1. `20260616000000_add_group_invite_codes.sql`
2. `20260616001000_harden_invite_membership_policies.sql`
3. `20260616002000_create_payout_queue.sql`
4. `20260616003000_harden_payout_execution.sql`
5. `20260616004000_add_contribution_cycles.sql`
6. `20260616005000_create_reserve_ledger.sql`
7. `20260616006000_create_payment_transactions.sql`
8. `20260616007000_manual_contribution_approval.sql`
9. `20260616008000_create_group_activity.sql`
10. `20260616009000_create_notifications.sql`
11. `20260616010000_harden_two_user_qa_policies.sql`

## Supabase Auth URL Settings

In Supabase Dashboard, configure the staging project under Authentication settings.

Set Site URL to the staging app URL:

- `https://staging.example.com`

Add Redirect URLs for local development, staging, and production when available:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/**`
- `https://staging.example.com/auth/callback`
- `https://staging.example.com/**`
- `https://www.production-domain.com/auth/callback`
- `https://www.production-domain.com/**`

Replace the example staging and production domains with the real deployment domains. Signup currently uses the browser origin for `emailRedirectTo`, so each deployed domain that can initiate signup must be allowlisted.

## Build And Deploy Checks

Run these locally before deployment:

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

The app uses Next.js server rendering and Supabase cookies, so deploy to a platform that supports the Next.js Node.js runtime. Static export is not appropriate for this MVP.

## Route Readiness

Core MVP routes expected for staging:

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/wallet`
- `/transactions`
- `/notifications`
- `/groups`
- `/groups/create`
- `/groups/join`
- `/groups/[id]`
- `/groups/[id]/contribute`
- `/groups/[id]/contributions`
- `/groups/[id]/payouts`
- `/groups/[id]/reserve`
- `/groups/[id]/activity`

Deprecated/demo routes still present:

- `/groups/invite`
- `/groups/monthly-savers`

Decision for staging: leave these unlinked and do not use them in QA. They should be redirected or removed in a separate cleanup task after confirming no stakeholder still needs them for demos.

## Security Checklist

- Confirm RLS is enabled on every MVP table.
- Confirm `groups` are selectable by invite code only for authenticated users.
- Confirm `group_members` only allows users to join as themselves, with join flow inserting `role = 'member'`.
- Confirm owner rows can only be inserted by the group owner.
- Confirm group detail, contribution review, payout schedule, reserve, and activity pages require owner or member access.
- Confirm `contributions.status = 'pending'` does not count in payout calculations.
- Confirm `payment_transactions` user inserts are restricted to linked pending manual contribution records.
- Confirm notification inserts only target the group owner or group members.
- Confirm `group_activity` is readable only by group participants.
- Confirm `reserve_ledger` inserts are owner-only and de-duplicated by group, cycle, and source.
- Confirm payout execution is owner-only and de-duplicated by `payout_queue_id`.
- Confirm cycle reset is owner-only and prevents duplicate next-cycle queues.

## Manual QA Checklist

Run with two staging users. Use the detailed script in [`docs/staging-qa-script.md`](./staging-qa-script.md).

1. User A signs up or logs in.
2. User A creates a group.
3. Confirm User A is inserted into `group_members` with role `owner`.
4. Confirm invite code and full invite link are visible.
5. User B signs up or logs in.
6. User B joins using the invite link.
7. Confirm User B appears as a member.
8. User B submits a manual contribution.
9. Confirm User A gets a notification.
10. User A approves the contribution.
11. Confirm User B gets a notification.
12. Confirm contribution status becomes `paid`.
13. Confirm payment transaction status becomes `success`.
14. Confirm payout engine counts User B as paid.
15. User A submits and approves their own contribution if needed.
16. Confirm payout schedule shows an eligible next beneficiary.
17. User A records a payout.
18. Confirm a payout row is created.
19. Confirm the relevant payout queue row is marked received.
20. Confirm reserve ledger row is created.
21. Confirm group activity logs the key events.
22. Confirm wallet and transaction pages show correct statuses.
23. Complete the payout cycle if enough eligible members exist.
24. Start the next cycle.
25. Confirm the new cycle queue is prepared without deleting history.

## Known Limitations

- No Paystack or payment processor integration yet.
- No real money movement.
- No email or SMS notifications.
- No admin dashboard.
- No referral system.
- Manual contributions require owner approval before counting toward payout readiness.
- Payout recording is manual accounting state only.
- Demo routes `/groups/invite` and `/groups/monthly-savers` remain in the codebase but should not be used for staging QA.

## Deployment Notes

- Ensure Vercel environment variables are set for Preview and Production separately.
- Rebuild after changing any `NEXT_PUBLIC_` variable because Next.js inlines public env values at build time.
- Confirm Supabase Auth redirect allowlist before testing signup confirmation links.
- For production later, repeat the full two-user QA checklist on the production Supabase project before launch.
