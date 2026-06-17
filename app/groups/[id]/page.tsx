import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import {
  generateInviteCode,
  isMissingInviteCodeColumnError,
} from "../../../lib/invite-codes";
import {
  formatMoney as formatPayoutMoney,
  getDisplayName as getPayoutDisplayName,
  getPayoutEngineSnapshot,
} from "../../../lib/payout-engine";
import { getGroupActivity } from "../../../lib/group-activity";
import CopyInviteButton from "./copy-invite-button";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GroupRow = {
  id: string;
  name: string;
  contribution_amount: number | string | null;
  frequency: string | null;
  total_members: number | string | null;
  reserve_percentage: number | string | null;
  owner_id: string;
  invite_code?: string | null;
  status: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  created_at: string | null;
};

type GroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: string | null;
  joined_at: string | null;
};

type MoneyRow = {
  id: string;
  group_id: string;
  user_id: string;
  amount: number | string | null;
  note?: string | null;
  status: string | null;
  created_at: string | null;
};

type ReserveLedgerRow = {
  id: string;
  group_id: string;
  payout_cycle: number;
  amount: number | string;
  reason: string;
  source: string;
  created_at: string | null;
};

type ActivityProfileRow = {
  id: string;
  email: string | null;
};

type RosterMember = {
  id: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: string | null;
  isOwner: boolean;
  contributionTotal: number;
  hasPaid: boolean;
};

function formatMoney(amount: number) {
  return `NGN ${amount.toLocaleString()}`;
}

function getDisplayName(email: string) {
  return email.split("@")[0] || "Member";
}

function getInitial(email: string) {
  return getDisplayName(email).charAt(0).toUpperCase() || "M";
}

function activityBadgeClass(activityType: string) {
  if (
    activityType === "contribution_approved" ||
    activityType === "payout_recorded" ||
    activityType === "reserve_recorded"
  ) {
    return "bg-[#0d6b4e]/10 text-[#0d6b4e]";
  }

  if (activityType === "contribution_rejected") {
    return "bg-red-50 text-red-700";
  }

  if (
    activityType === "contribution_submitted" ||
    activityType === "cycle_started"
  ) {
    return "bg-[#d8b86a]/20 text-[#8a6a00]";
  }

  return "bg-black/5 text-black/65";
}

function getRequestOrigin(headersList: Headers) {
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "";
  }

  const protocol =
    headersList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

export default async function GroupDetailsPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const requestOrigin = getRequestOrigin(await headers());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single<GroupRow>();

  if (!group) {
    redirect("/groups");
  }

  const isOwner = group.owner_id === user.id;
  let inviteCode = group.invite_code ?? null;
  let inviteCodeMessage = "";

  if (!inviteCode && isOwner) {
    const generatedInviteCode = generateInviteCode();

    const { data: updatedGroup, error: inviteCodeError } = await supabase
      .from("groups")
      .update({ invite_code: generatedInviteCode })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("invite_code")
      .maybeSingle<{ invite_code: string | null }>();

    if (updatedGroup?.invite_code) {
      inviteCode = updatedGroup.invite_code;
    } else if (inviteCodeError && isMissingInviteCodeColumnError(inviteCodeError)) {
      inviteCodeMessage =
        "Invite codes are not enabled in Supabase yet. Run the invite_code migration to activate group joining.";
    } else {
      inviteCodeMessage =
        "Invite code is not available yet. Refresh after the migration or update succeeds.";
    }
  } else if (!inviteCode) {
    inviteCodeMessage =
      "This group does not have an invite code yet. Ask the owner to open the group after the invite_code migration is applied.";
  }

  const { data: currentMembership } = isOwner
    ? { data: null }
    : await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .maybeSingle<GroupMemberRow>();

  if (!isOwner && !currentMembership) {
    redirect("/groups");
  }

  const payoutSnapshot = await getPayoutEngineSnapshot(supabase, id);

  const { data: groupMembers } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", id)
    .order("joined_at", { ascending: true })
    .returns<GroupMemberRow[]>();

  const { data: contributions } = await supabase
    .from("contributions")
    .select("*")
    .eq("group_id", id)
    .order("created_at", { ascending: false })
    .returns<MoneyRow[]>();

  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("group_id", id)
    .order("created_at", { ascending: false })
    .returns<MoneyRow[]>();

  const { data: reserveLedger } = await supabase
    .from("reserve_ledger")
    .select("*")
    .eq("group_id", id)
    .order("created_at", { ascending: false })
    .returns<ReserveLedgerRow[]>();

  const recentActivity = await getGroupActivity(supabase, id, 5);
  const activityActorIds = recentActivity
    .map((activity) => activity.actor_id)
    .filter((actorId): actorId is string => Boolean(actorId));

  const memberRows = groupMembers ?? [];
  const profileIds = Array.from(
    new Set([
      group.owner_id,
      ...memberRows.map((member) => member.user_id),
      ...activityActorIds,
    ])
  );

  const { data: profiles } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,email,created_at")
          .in("id", profileIds)
          .returns<ProfileRow[]>()
      : { data: [] as ProfileRow[] };

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  ) as Map<string, ActivityProfileRow>;

  const contributionsByUser = new Map<string, MoneyRow[]>();

  for (const contribution of contributions ?? []) {
    const userContributions = contributionsByUser.get(contribution.user_id) ?? [];
    userContributions.push(contribution);
    contributionsByUser.set(contribution.user_id, userContributions);
  }

  const ownerMembership = memberRows.find(
    (member) => member.user_id === group.owner_id
  );

  const ownerProfile = profilesById.get(group.owner_id);
  const ownerEmail =
    ownerProfile?.email ??
    (group.owner_id === user.id ? user.email ?? "Group owner" : "Group owner");

  const ownerRosterMember: RosterMember = {
    id: ownerMembership?.id ?? `owner-${group.owner_id}`,
    userId: group.owner_id,
    email: ownerEmail,
    role: "Owner",
    joinedAt: ownerMembership?.joined_at ?? group.created_at,
    isOwner: true,
    contributionTotal:
      contributionsByUser
        .get(group.owner_id)
        ?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0,
    hasPaid:
      contributionsByUser
        .get(group.owner_id)
        ?.some((item) => item.status === "paid") ?? false,
  };

  const rosterMembers: RosterMember[] = [
    ownerRosterMember,
    ...memberRows
      .filter((member) => member.user_id !== group.owner_id)
      .map((member) => {
        const profile = profilesById.get(member.user_id);
        const memberContributions = contributionsByUser.get(member.user_id) ?? [];

        return {
          id: member.id,
          userId: member.user_id,
          email: profile?.email ?? "Invited member",
          role: member.role ?? "member",
          joinedAt: member.joined_at,
          isOwner: false,
          contributionTotal: memberContributions.reduce(
            (sum, item) => sum + Number(item.amount ?? 0),
            0
          ),
          hasPaid: memberContributions.some((item) => item.status === "paid"),
        };
      }),
  ];

  const contributionAmount = Number(group.contribution_amount ?? 0);
  const expectedMemberCount = Number(group.total_members ?? 0);
  const actualMemberCount = rosterMembers.length;
  const reservePercentage = Number(group.reserve_percentage ?? 10);

  const expectedGroupTotal = contributionAmount * expectedMemberCount;
  const reserveAmount = (expectedGroupTotal * reservePercentage) / 100;
  const payoutAmount = expectedGroupTotal - reserveAmount;

  const totalContributions =
    contributions?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0;

  const totalPayouts =
    payouts?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0;

  const paidMembers = rosterMembers.filter((member) => member.hasPaid).length;
  const openSlots = Math.max(expectedMemberCount - actualMemberCount, 0);
  const invitePath = inviteCode
    ? `/groups/join?code=${encodeURIComponent(inviteCode)}`
    : null;
  const inviteLink =
    invitePath && requestOrigin ? `${requestOrigin}${invitePath}` : invitePath;
  const nextBeneficiaryEmail = payoutSnapshot?.nextBeneficiary?.email ?? null;
  const cycleSummary = payoutSnapshot?.cycleSummary ?? {
    currentCycle: 1,
    totalEligibleMembers: 0,
    receivedPayouts: 0,
    pendingPayouts: 0,
    isComplete: false,
  };
  const currentCycleReserve =
    reserveLedger
      ?.filter((entry) => entry.payout_cycle === cycleSummary.currentCycle)
      .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0) ?? 0;
  const lifetimeReserveTotal =
    reserveLedger?.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0) ??
    0;

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/groups" className="text-sm font-black text-[#0d6b4e]">
            Back to groups
          </Link>

          <Link
            href="/dashboard"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
          >
            Dashboard
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Group details
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              {group.name}
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              Track this contribution circle, monitor reserve protection, and
              keep every member aligned on contributions and payouts.
            </p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/55">Group owner</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7be0b7] font-black text-[#07161d]">
                  {getInitial(ownerRosterMember.email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black">
                    {getDisplayName(ownerRosterMember.email)}
                  </p>
                  <p className="truncate text-sm text-white/55">
                    {ownerRosterMember.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/55">Contribution</p>
                <h3 className="mt-2 text-2xl font-black">
                  {formatMoney(contributionAmount)}
                </h3>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/55">Members</p>
                <h3 className="mt-2 text-2xl font-black">
                  {actualMemberCount}/{expectedMemberCount || actualMemberCount}
                </h3>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/55">Frequency</p>
                <h3 className="mt-2 text-2xl font-black">
                  {group.frequency ?? "Monthly"}
                </h3>
              </div>
            </div>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
              Cycle summary
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                <p className="text-sm font-bold text-black/45">
                  Expected group total
                </p>
                <h3 className="mt-2 text-3xl font-black">
                  {formatMoney(expectedGroupTotal)}
                </h3>
              </div>

              <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                <p className="text-sm font-bold text-black/45">
                  {reservePercentage}% reserve withheld
                </p>
                <h3 className="mt-2 text-3xl font-black text-[#0d6b4e]">
                  {formatMoney(reserveAmount)}
                </h3>
              </div>

              <div className="rounded-[26px] bg-[#07161d] p-5 text-white">
                <p className="text-sm font-bold text-white/55">
                  Estimated payout amount
                </p>
                <h3 className="mt-2 text-3xl font-black">
                  {formatMoney(payoutAmount)}
                </h3>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-4">
          <div className="rounded-[36px] border border-black/5 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Contributions
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {formatMoney(totalContributions)}
            </h2>

            <p className="mt-2 text-sm text-black/50">
              Total recorded contributions for this group.
            </p>
          </div>

          <div className="rounded-[36px] border border-black/5 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Payouts
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {formatMoney(totalPayouts)}
            </h2>

            <p className="mt-2 text-sm text-black/50">
              Total recorded payouts for this group.
            </p>
          </div>

          <div className="rounded-[36px] border border-black/5 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Paid members
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {paidMembers}/{actualMemberCount}
            </h2>

            <p className="mt-2 text-sm text-black/50">
              Members with at least one paid contribution.
            </p>
          </div>

          <div className="rounded-[36px] border border-black/5 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Group status
            </p>

            <h2 className="mt-3 text-3xl font-black capitalize">
              {group.status ?? "active"}
            </h2>

            <p className="mt-2 text-sm text-black/50">
              {openSlots > 0
                ? `${openSlots} member slot${openSlots === 1 ? "" : "s"} open.`
                : "The member roster matches the group target."}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                Reserve transparency
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Funds held for protection
              </h2>
            </div>

            <Link
              href={`/groups/${group.id}/reserve`}
              className="rounded-full bg-[#07161d] px-5 py-3 text-sm font-black text-white"
            >
              View reserve ledger
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[26px] bg-[#f8f4ec] p-5">
              <p className="text-sm font-bold text-black/45">
                Reserve percentage
              </p>
              <h3 className="mt-2 text-3xl font-black">
                {reservePercentage}%
              </h3>
            </div>

            <div className="rounded-[26px] bg-[#f8f4ec] p-5">
              <p className="text-sm font-bold text-black/45">
                Current cycle reserve
              </p>
              <h3 className="mt-2 text-3xl font-black text-[#0d6b4e]">
                {formatMoney(currentCycleReserve)}
              </h3>
            </div>

            <div className="rounded-[26px] bg-[#07161d] p-5 text-white">
              <p className="text-sm font-bold text-white/55">
                Lifetime reserve total
              </p>
              <h3 className="mt-2 text-3xl font-black">
                {formatMoney(lifetimeReserveTotal)}
              </h3>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                Payout engine
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Current cycle overview
              </h2>
            </div>

            <Link
              href={`/groups/${group.id}/payouts`}
              className="rounded-full bg-[#07161d] px-5 py-3 text-sm font-black text-white"
            >
              View payout schedule
            </Link>

            <Link
              href={`/groups/${group.id}/contributions`}
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
            >
              Review contributions
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[26px] bg-[#07161d] p-5 text-white xl:col-span-2">
              <p className="text-sm text-white/55">Next beneficiary</p>
              <h3 className="mt-2 truncate text-3xl font-black">
                {nextBeneficiaryEmail
                  ? getPayoutDisplayName(nextBeneficiaryEmail)
                  : "No eligible member yet"}
              </h3>
              <p className="mt-2 truncate text-sm text-white/55">
                {nextBeneficiaryEmail ??
                  "A member must have paid and be pending in the queue."}
              </p>
            </div>

            <div className="rounded-[26px] bg-[#f8f4ec] p-5">
              <p className="text-sm font-bold text-black/45">Payout cycle</p>
              <h3 className="mt-2 text-3xl font-black">
                {payoutSnapshot?.currentCycle ?? 1}
              </h3>
            </div>

            <div className="rounded-[26px] bg-[#f8f4ec] p-5">
              <p className="text-sm font-bold text-black/45">Paid members</p>
              <h3 className="mt-2 text-3xl font-black">
                {payoutSnapshot?.calculations.paidMembers ?? 0}
              </h3>
            </div>

            <div className="rounded-[26px] bg-[#f8f4ec] p-5">
              <p className="text-sm font-bold text-black/45">Reserve held</p>
              <h3 className="mt-2 text-3xl font-black text-[#0d6b4e]">
                {formatPayoutMoney(
                  payoutSnapshot?.calculations.reserveAmount ?? 0
                )}
              </h3>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-[26px] border border-black/5 bg-[#0d6b4e]/10 p-5">
              <p className="text-sm font-bold text-[#0d6b4e]">
                Estimated payout amount
              </p>
              <h3 className="mt-2 text-4xl font-black text-[#07161d]">
                {formatPayoutMoney(
                  payoutSnapshot?.calculations.payoutAmount ?? 0
                )}
              </h3>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Calculated from paid members only: contribution amount
                multiplied by paid members, minus the group reserve.
              </p>
            </div>

            <div className="rounded-[26px] border border-black/5 bg-[#f8f4ec] p-5">
              <p className="text-sm font-bold text-black/45">Cycle summary</p>
              <h3 className="mt-2 text-3xl font-black">
                Cycle {cycleSummary.currentCycle}
              </h3>
              <p className="mt-2 text-sm font-bold text-black/60">
                {cycleSummary.receivedPayouts}/
                {cycleSummary.totalEligibleMembers} payouts received
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    cycleSummary.isComplete
                      ? "bg-[#0d6b4e] text-white"
                      : "bg-white text-black/65"
                  }`}
                >
                  {cycleSummary.isComplete ? "Complete" : "In progress"}
                </span>
                <Link
                  href={`/groups/${group.id}/payouts`}
                  className="rounded-full bg-[#07161d] px-4 py-2 text-xs font-black text-white"
                >
                  Payout schedule
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                Recent activity
              </p>
              <h2 className="mt-2 text-3xl font-black">Group audit trail</h2>
            </div>

            <Link
              href={`/groups/${group.id}/activity`}
              className="rounded-full bg-[#07161d] px-5 py-3 text-sm font-black text-white"
            >
              View full timeline
            </Link>
          </div>

          <div className="mt-8 grid gap-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => {
                const actorProfile = activity.actor_id
                  ? profilesById.get(activity.actor_id)
                  : null;
                const actorEmail = actorProfile?.email ?? null;

                return (
                  <div
                    key={activity.id}
                    className="flex flex-wrap items-start justify-between gap-4 rounded-[26px] bg-[#f8f4ec] p-5"
                  >
                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ${activityBadgeClass(
                          activity.activity_type
                        )}`}
                      >
                        {activity.activity_type.replaceAll("_", " ")}
                      </span>
                      <h3 className="mt-3 text-lg font-black">
                        {activity.title}
                      </h3>
                      {activity.description ? (
                        <p className="mt-1 text-sm leading-6 text-black/55">
                          {activity.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs font-bold text-black/40">
                        {actorEmail
                          ? `By ${getDisplayName(actorEmail)}`
                          : "By system"}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-bold text-black/45">
                      {activity.created_at
                        ? new Date(activity.created_at).toLocaleDateString()
                        : "No date"}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[26px] bg-[#f8f4ec] p-5 text-black/55">
                No activity recorded yet. New group actions will appear here.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                  Members
                </p>
                <h2 className="mt-2 text-3xl font-black">Group roster</h2>
              </div>

              <Link
                href="/groups/join"
                className="rounded-full bg-[#07161d] px-5 py-3 text-sm font-black text-white"
              >
                Join with code
              </Link>
            </div>

            <div className="mt-8 overflow-hidden rounded-[28px] border border-black/5">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead className="bg-[#07161d] text-white">
                    <tr>
                      <th className="px-5 py-4 text-sm font-black">Member</th>
                      <th className="px-5 py-4 text-sm font-black">Role</th>
                      <th className="px-5 py-4 text-sm font-black">Contribution</th>
                      <th className="px-5 py-4 text-sm font-black">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterMembers.map((member, index) => (
                      <tr
                        key={member.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-[#f8f4ec]"}
                      >
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0d6b4e]/10 font-black text-[#0d6b4e]">
                              {getInitial(member.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-black">
                                {getDisplayName(member.email)}
                              </p>
                              <p className="truncate text-sm text-black/45">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full px-3 py-2 text-xs font-black capitalize ${
                              member.isOwner
                                ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                                : "bg-black/5 text-black/65"
                            }`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="px-5 py-5">
                          <div>
                            <span
                              className={`rounded-full px-3 py-2 text-xs font-black ${
                                member.hasPaid
                                  ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                                  : "bg-[#d8b86a]/20 text-[#8a6a00]"
                              }`}
                            >
                              {member.hasPaid ? "Paid" : "Unpaid"}
                            </span>
                            <p className="mt-2 text-sm font-bold text-black/50">
                              {formatMoney(member.contributionTotal)}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-5 text-sm font-bold text-black/50">
                          {member.joinedAt
                            ? new Date(member.joinedAt).toLocaleDateString()
                            : "Not recorded"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                Invite members
              </p>

              <h2 className="mt-2 text-3xl font-black">Group invite</h2>

              <div className="mt-6 rounded-[28px] bg-[#f8f4ec] p-6">
                <p className="text-sm font-bold text-black/45">Invite code</p>
                {inviteCode ? (
                  <h3 className="mt-2 break-all text-3xl font-black tracking-[0.08em]">
                    {inviteCode}
                  </h3>
                ) : (
                  <p className="mt-2 text-sm font-bold leading-6 text-black/55">
                    {inviteCodeMessage}
                  </p>
                )}
              </div>

              {inviteLink ? (
                <div className="mt-4 rounded-[28px] border border-black/5 bg-white p-5">
                  <p className="text-sm font-bold text-black/45">
                    Invite link
                  </p>
                  <p className="mt-2 break-all text-sm font-black text-[#07161d]">
                    {inviteLink}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {inviteLink ? (
                  <CopyInviteButton value={inviteLink} label="Copy invite link" />
                ) : (
                  <Link
                    href="/groups/join"
                    className="inline-flex justify-center rounded-full bg-[#07161d] px-5 py-4 text-sm font-black text-white"
                  >
                    Join group
                  </Link>
                )}

                {inviteCode ? (
                  <CopyInviteButton
                    value={inviteCode}
                    label="Copy code"
                    variant="secondary"
                  />
                ) : (
                  <Link
                    href="/groups/join"
                    className="inline-flex justify-center rounded-full border border-black/10 bg-white px-5 py-4 text-sm font-black"
                  >
                    Join group
                  </Link>
                )}

                <Link
                  href={`/groups/${group.id}/contribute`}
                  className="inline-flex justify-center rounded-full bg-[#0d6b4e] px-5 py-4 text-sm font-black text-white sm:col-span-2"
                >
                  Add contribution
                </Link>
              </div>
            </div>

            <div className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                Recent contributions
              </p>

              <div className="mt-8 space-y-4">
                {contributions && contributions.length > 0 ? (
                  contributions.slice(0, 5).map((item) => {
                    const profile = profilesById.get(item.user_id);
                    const email =
                      profile?.email ??
                      (item.user_id === user.id ? user.email ?? "You" : "Member");

                    return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8f4ec] px-5 py-5"
                    >
                      <div className="min-w-0">
                          <p className="truncate font-black">
                            {getDisplayName(email)}
                          </p>
                          <p className="mt-1 text-sm text-black/50">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : "No date"}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ${
                            item.status === "paid"
                              ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                              : item.status === "rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-[#d8b86a]/20 text-[#8a6a00]"
                          }`}
                        >
                          {item.status ?? "pending"}
                        </span>
                      </div>

                        <p className="shrink-0 text-lg font-black text-[#0d6b4e]">
                          {formatMoney(Number(item.amount ?? 0))}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-[#f8f4ec] px-5 py-5 text-black/55">
                    No contributions recorded for this group yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
