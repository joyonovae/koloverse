import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { formatMoney, getDisplayName } from "../../../../lib/payout-engine";
import ReviewButtons from "./review-buttons";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GroupRow = {
  id: string;
  name: string;
  owner_id: string;
};

type MembershipRow = {
  id: string;
};

type ContributionRow = {
  id: string;
  group_id: string;
  user_id: string;
  amount: number | string | null;
  note: string | null;
  status: string | null;
  payout_cycle: number | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
};

type PaymentTransactionRow = {
  id: string;
  contribution_id: string | null;
  status: string;
  provider: string | null;
};

function statusClass(status: string | null) {
  if (status === "paid") {
    return "bg-[#0d6b4e]/10 text-[#0d6b4e]";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-[#d8b86a]/20 text-[#8a6a00]";
}

export default async function GroupContributionsPage({ params }: PageProps) {
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
    .single<GroupRow>();

  if (!group) {
    redirect("/groups");
  }

  const isOwner = group.owner_id === user.id;

  const { data: membership } = isOwner
    ? { data: null }
    : await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .maybeSingle<MembershipRow>();

  if (!isOwner && !membership) {
    redirect("/groups");
  }

  const { data: contributions } = await supabase
    .from("contributions")
    .select("id,group_id,user_id,amount,note,status,payout_cycle,created_at")
    .eq("group_id", id)
    .order("created_at", { ascending: false })
    .returns<ContributionRow[]>();

  const contributionRows = contributions ?? [];
  const contributorIds = Array.from(
    new Set(contributionRows.map((contribution) => contribution.user_id))
  );
  const contributionIds = contributionRows.map((contribution) => contribution.id);

  const { data: profiles } =
    contributorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,email")
          .in("id", contributorIds)
          .returns<ProfileRow[]>()
      : { data: [] as ProfileRow[] };

  const { data: transactions } =
    contributionIds.length > 0
      ? await supabase
          .from("payment_transactions")
          .select("id,contribution_id,status,provider")
          .in("contribution_id", contributionIds)
          .returns<PaymentTransactionRow[]>()
      : { data: [] as PaymentTransactionRow[] };

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );
  const transactionsByContributionId = new Map(
    (transactions ?? [])
      .filter((transaction) => transaction.contribution_id)
      .map((transaction) => [transaction.contribution_id as string, transaction])
  );

  const pendingCount = contributionRows.filter(
    (contribution) => contribution.status === "pending"
  ).length;
  const paidCount = contributionRows.filter(
    (contribution) => contribution.status === "paid"
  ).length;
  const rejectedCount = contributionRows.filter(
    (contribution) => contribution.status === "rejected"
  ).length;

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
            href={`/groups/${group.id}/payouts`}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
          >
            Payout schedule
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Contributions
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight">
              {group.name}
            </h1>
            <p className="mt-4 max-w-2xl text-white/60">
              Review manual contributions before they count toward payout
              readiness.
            </p>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Review summary
            </p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                <p className="text-sm font-bold text-black/45">Pending</p>
                <h2 className="mt-2 text-3xl font-black">{pendingCount}</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[26px] bg-[#0d6b4e]/10 p-5">
                  <p className="text-sm font-bold text-[#0d6b4e]">Paid</p>
                  <h2 className="mt-2 text-3xl font-black">{paidCount}</h2>
                </div>
                <div className="rounded-[26px] bg-red-50 p-5">
                  <p className="text-sm font-bold text-red-700">Rejected</p>
                  <h2 className="mt-2 text-3xl font-black">{rejectedCount}</h2>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="overflow-hidden rounded-[28px] border border-black/5">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-[#07161d] text-white">
                  <tr>
                    <th className="px-5 py-4 text-sm font-black">Contributor</th>
                    <th className="px-5 py-4 text-sm font-black">Amount</th>
                    <th className="px-5 py-4 text-sm font-black">Note</th>
                    <th className="px-5 py-4 text-sm font-black">Status</th>
                    <th className="px-5 py-4 text-sm font-black">Transaction</th>
                    <th className="px-5 py-4 text-sm font-black">Date</th>
                    {isOwner ? (
                      <th className="px-5 py-4 text-sm font-black">Review</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {contributionRows.length > 0 ? (
                    contributionRows.map((contribution, index) => {
                      const profile = profilesById.get(contribution.user_id);
                      const transaction = transactionsByContributionId.get(
                        contribution.id
                      );

                      return (
                        <tr
                          key={contribution.id}
                          className={index % 2 === 0 ? "bg-white" : "bg-[#f8f4ec]"}
                        >
                          <td className="px-5 py-5">
                            <p className="font-black">
                              {getDisplayName(profile?.email)}
                            </p>
                            <p className="mt-1 text-sm text-black/45">
                              {profile?.email ?? "Profile unavailable"}
                            </p>
                          </td>
                          <td className="px-5 py-5 font-black text-[#0d6b4e]">
                            {formatMoney(Number(contribution.amount ?? 0))}
                          </td>
                          <td className="max-w-[220px] px-5 py-5 text-sm font-bold text-black/55">
                            {contribution.note || "No note"}
                          </td>
                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-3 py-2 text-xs font-black capitalize ${statusClass(
                                contribution.status
                              )}`}
                            >
                              {contribution.status ?? "pending"}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-sm font-bold text-black/55">
                            <span className="capitalize">
                              {transaction?.status ?? "No transaction"}
                            </span>
                            <p className="mt-1 text-black/40">
                              {transaction?.provider ?? "manual"}
                            </p>
                          </td>
                          <td className="px-5 py-5 text-sm font-bold text-black/50">
                            {contribution.created_at
                              ? new Date(
                                  contribution.created_at
                                ).toLocaleDateString()
                              : "Not recorded"}
                          </td>
                          {isOwner ? (
                            <td className="px-5 py-5">
                              {contribution.status === "pending" ? (
                                <ReviewButtons
                                  groupId={group.id}
                                  contributionId={contribution.id}
                                />
                              ) : (
                                <span className="text-sm font-bold text-black/45">
                                  Reviewed
                                </span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={isOwner ? 7 : 6}
                        className="bg-[#f8f4ec] px-5 py-8 text-black/55"
                      >
                        No contributions have been submitted for this group yet.
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
