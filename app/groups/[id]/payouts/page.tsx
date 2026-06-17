import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import {
  formatMoney,
  getDisplayName,
  getPayoutEngineSnapshot,
} from "../../../../lib/payout-engine";
import RecordPayoutForm from "./record-payout-form";
import StartCycleForm from "./start-cycle-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GroupAccessRow = {
  id: string;
  name: string;
  owner_id: string;
};

type MembershipRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: string | null;
};

function getQueueStatus(params: {
  hasReceivedPayout: boolean;
  isNext: boolean;
  hasPaid: boolean;
}) {
  if (params.hasReceivedPayout) {
    return "Received";
  }

  if (params.isNext) {
    return "Next beneficiary";
  }

  if (params.hasPaid) {
    return "Paid, pending";
  }

  return "Unpaid, skipped for now";
}

export default async function GroupPayoutsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id,name,owner_id")
    .eq("id", id)
    .single<GroupAccessRow>();

  if (!group) {
    redirect("/groups");
  }

  const isOwner = group.owner_id === user.id;

  const { data: membership } = isOwner
    ? { data: null }
    : await supabase
        .from("group_members")
        .select("id,group_id,user_id,role")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .maybeSingle<MembershipRow>();

  if (!isOwner && !membership) {
    redirect("/groups");
  }

  const payoutSnapshot = await getPayoutEngineSnapshot(supabase, id);

  if (!payoutSnapshot) {
    redirect("/groups");
  }

  const nextBeneficiaryId = payoutSnapshot.nextBeneficiary?.user_id ?? null;
  const scheduleQueue = payoutSnapshot.currentCycleQueue;
  const cycleSummary = payoutSnapshot.cycleSummary;

  const { data: groupMembers } = await supabase
    .from("group_members")
    .select("id,group_id,user_id,role")
    .eq("group_id", id)
    .returns<MembershipRow[]>();

  const rolesByUserId = new Map(
    (groupMembers ?? []).map((member) => [
      member.user_id,
      member.role ?? "member",
    ])
  );

  rolesByUserId.set(group.owner_id, "owner");

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/groups/${group.id}`}
            className="text-sm font-black text-[#0d6b4e]"
          >
            Back to group
          </Link>

          <Link
            href="/dashboard"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
          >
            Dashboard
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Payout schedule
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              {group.name}
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              Review payout order, current cycle status, and the next eligible
              beneficiary. Money movement is not active yet.
            </p>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Next beneficiary
            </p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[26px] bg-[#07161d] p-5 text-white">
                <p className="text-sm font-bold text-white/55">Recipient</p>
                <h2 className="mt-2 truncate text-3xl font-black">
                  {payoutSnapshot.nextBeneficiary
                    ? getDisplayName(payoutSnapshot.nextBeneficiary.email)
                    : "None ready"}
                </h2>
                <p className="mt-2 truncate text-sm text-white/55">
                  {payoutSnapshot.nextBeneficiary?.email ??
                    "A pending member must have a paid contribution first."}
                </p>
              </div>

              <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                <p className="text-sm font-bold text-black/45">Cycle</p>
                <h2 className="mt-2 text-3xl font-black">
                  {payoutSnapshot.currentCycle}
                </h2>
              </div>

              <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                <p className="text-sm font-bold text-black/45">Paid members</p>
                <h2 className="mt-2 text-3xl font-black">
                  {payoutSnapshot.calculations.paidMembers}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                  <p className="text-sm font-bold text-black/45">Group pool</p>
                  <h2 className="mt-2 text-2xl font-black">
                    {formatMoney(payoutSnapshot.calculations.groupPool)}
                  </h2>
                </div>

                <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                  <p className="text-sm font-bold text-black/45">
                    Reserve held
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[#0d6b4e]">
                    {formatMoney(payoutSnapshot.calculations.reserveAmount)}
                  </h2>
                </div>

                <div className="rounded-[26px] bg-[#07161d] p-5 text-white">
                  <p className="text-sm font-bold text-white/55">
                    Payout amount
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    {formatMoney(payoutSnapshot.calculations.payoutAmount)}
                  </h2>
                </div>
              </div>

              {isOwner ? (
                cycleSummary.isComplete ? (
                  <StartCycleForm groupId={group.id} />
                ) : (
                  <RecordPayoutForm
                    groupId={group.id}
                    disabled={!payoutSnapshot.nextBeneficiary}
                  />
                )
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                Queue
              </p>
              <h2 className="mt-2 text-3xl font-black">Payout rotation</h2>
            </div>

            <div className="rounded-full bg-[#0d6b4e]/10 px-4 py-3 text-sm font-black text-[#0d6b4e]">
              {cycleSummary.isComplete
                ? "Cycle complete"
                : `${cycleSummary.receivedPayouts}/${cycleSummary.totalEligibleMembers} received`}
            </div>
          </div>

          <div className="mt-6 rounded-[28px] bg-[#f8f4ec] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-black/45">
                  Cycle {cycleSummary.currentCycle} progress
                </p>
                <h3 className="mt-2 text-3xl font-black">
                  {cycleSummary.receivedPayouts}/
                  {cycleSummary.totalEligibleMembers} payouts received
                </h3>
              </div>

              <span
                className={`rounded-full px-4 py-3 text-sm font-black ${
                  cycleSummary.isComplete
                    ? "bg-[#0d6b4e] text-white"
                    : "bg-white text-black/65"
                }`}
              >
                {cycleSummary.isComplete ? "Complete" : "In progress"}
              </span>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-black/5">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-[#07161d] text-white">
                  <tr>
                    <th className="px-5 py-4 text-sm font-black">Position</th>
                    <th className="px-5 py-4 text-sm font-black">Member</th>
                    <th className="px-5 py-4 text-sm font-black">Role</th>
                    <th className="px-5 py-4 text-sm font-black">Cycle</th>
                    <th className="px-5 py-4 text-sm font-black">
                      Contribution
                    </th>
                    <th className="px-5 py-4 text-sm font-black">
                      Payout status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleQueue.length > 0 ? (
                    scheduleQueue.map((queueRow, index) => {
                      const profile = payoutSnapshot.profilesById.get(
                        queueRow.user_id
                      );
                      const hasPaid = payoutSnapshot.paidMemberIds.has(
                        queueRow.user_id
                      );
                      const isNext = nextBeneficiaryId === queueRow.user_id;
                      const role = rolesByUserId.get(queueRow.user_id) ?? "member";
                      const status = getQueueStatus({
                        hasReceivedPayout: queueRow.has_received_payout,
                        isNext,
                        hasPaid,
                      });

                      return (
                        <tr
                          key={queueRow.id}
                          className={
                            isNext
                              ? "bg-[#0d6b4e]/10"
                              : index % 2 === 0
                                ? "bg-white"
                                : "bg-[#f8f4ec]"
                          }
                        >
                          <td className="px-5 py-5 font-black">
                            #{queueRow.payout_position}
                          </td>
                          <td className="px-5 py-5">
                            <p className="font-black">
                              {getDisplayName(profile?.email)}
                            </p>
                            <p className="mt-1 text-sm text-black/45">
                              {profile?.email ?? "Member profile unavailable"}
                            </p>
                          </td>
                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-3 py-2 text-xs font-black capitalize ${
                                role === "owner"
                                  ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                                  : "bg-black/5 text-black/65"
                              }`}
                            >
                              {role}
                            </span>
                          </td>
                          <td className="px-5 py-5 font-bold text-black/60">
                            {queueRow.payout_cycle}
                          </td>
                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-3 py-2 text-xs font-black ${
                                hasPaid
                                  ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                                  : "bg-[#d8b86a]/20 text-[#8a6a00]"
                              }`}
                            >
                              {hasPaid ? "Paid" : "Unpaid"}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-3 py-2 text-xs font-black ${
                                isNext
                                  ? "bg-[#0d6b4e] text-white"
                                  : queueRow.has_received_payout
                                    ? "bg-black/10 text-black/60"
                                    : hasPaid
                                      ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                                      : "bg-[#d8b86a]/20 text-[#8a6a00]"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="bg-[#f8f4ec] px-5 py-8 text-black/55"
                      >
                        No payout queue rows yet. Run the payout queue migration
                        and make sure group members exist.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
