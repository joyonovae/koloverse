import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

type ContributionRow = {
  id: string;
  group_id: string;
  amount: number | string | null;
  note: string | null;
  status: string | null;
  payout_cycle: number | null;
  created_at: string | null;
};

type GroupRow = {
  id: string;
  name: string;
};

function formatMoney(amount: number | string | null) {
  return `NGN ${Number(amount ?? 0).toLocaleString()}`;
}

function statusClass(status: string | null) {
  if (status === "paid") {
    return "bg-[#0d6b4e]/10 text-[#0d6b4e]";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-[#d8b86a]/20 text-[#8a6a00]";
}

export default async function ContributionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: contributions } = await supabase
    .from("contributions")
    .select("id,group_id,amount,note,status,payout_cycle,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ContributionRow[]>();

  const groupIds = Array.from(
    new Set((contributions ?? []).map((contribution) => contribution.group_id))
  );

  const { data: groups } =
    groupIds.length > 0
      ? await supabase
          .from("groups")
          .select("id,name")
          .in("id", groupIds)
          .returns<GroupRow[]>()
      : { data: [] as GroupRow[] };

  const groupsById = new Map((groups ?? []).map((group) => [group.id, group]));
  const contributionRows = contributions ?? [];
  const pendingCount = contributionRows.filter(
    (contribution) => contribution.status === "pending"
  ).length;
  const paidTotal = contributionRows
    .filter((contribution) => contribution.status === "paid")
    .reduce(
      (sum, contribution) => sum + Number(contribution.amount ?? 0),
      0
    );

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-black text-[#0d6b4e]"
          >
            Back to dashboard
          </Link>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/groups"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
            >
              View groups
            </Link>

            <Link
              href="/wallet"
              className="rounded-full bg-[#07161d] px-6 py-3 text-sm font-black text-white"
            >
              View wallet
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.6fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Contributions
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              Your contribution history
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              Track submitted, approved, and rejected contribution records
              across your Koloverse groups.
            </p>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Summary
            </p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                <p className="text-sm font-bold text-black/45">
                  Approved total
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {formatMoney(paidTotal)}
                </h2>
              </div>
              <div className="rounded-[26px] bg-[#d8b86a]/20 p-5">
                <p className="text-sm font-bold text-[#8a6a00]">
                  Pending review
                </p>
                <h2 className="mt-2 text-3xl font-black">{pendingCount}</h2>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="space-y-4">
            {contributionRows.length > 0 ? (
              contributionRows.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex flex-col gap-4 rounded-[28px] bg-[#f8f4ec] p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black/45">
                      {contribution.created_at
                        ? new Date(contribution.created_at).toLocaleDateString()
                        : "Date unavailable"}
                    </p>
                    <h2 className="mt-1 truncate text-2xl font-black">
                      {groupsById.get(contribution.group_id)?.name ??
                        "Group unavailable"}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-black/45">
                      Cycle {contribution.payout_cycle ?? 1}
                      {contribution.note ? ` - ${contribution.note}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-xl font-black">
                      {formatMoney(contribution.amount)}
                    </p>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-black capitalize ${statusClass(
                        contribution.status
                      )}`}
                    >
                      {contribution.status ?? "pending"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f8f4ec] p-8">
                <p className="text-lg font-black">No contributions yet</p>
                <p className="mt-2 max-w-2xl text-black/55">
                  Contributions you submit from a group page will appear here
                  with their approval status.
                </p>
                <Link
                  href="/groups"
                  className="mt-5 inline-flex rounded-full bg-[#0d6b4e] px-5 py-3 text-sm font-black text-white"
                >
                  Go to groups
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
