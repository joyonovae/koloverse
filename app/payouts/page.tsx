import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

type PayoutRow = {
  id: string;
  group_id: string;
  amount: number | string | null;
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

export default async function PayoutsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id,group_id,amount,status,payout_cycle,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<PayoutRow[]>();

  const payoutRows = payouts ?? [];
  const groupIds = Array.from(
    new Set(payoutRows.map((payout) => payout.group_id))
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
  const paidPayoutTotal = payoutRows
    .filter((payout) => payout.status === "paid")
    .reduce((sum, payout) => sum + Number(payout.amount ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-sm font-black text-[#0d6b4e]">
            Back to dashboard
          </Link>

          <Link
            href="/groups"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
          >
            View groups
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Payouts
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              Your payout history
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              Payout records created by group owners. This is still manual
              accounting state, not money movement.
            </p>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Summary
            </p>
            <h2 className="mt-4 text-4xl font-black">
              {formatMoney(paidPayoutTotal)}
            </h2>
            <p className="mt-2 text-sm font-bold text-black/50">
              Total paid payout records visible to you
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="space-y-4">
            {payoutRows.length > 0 ? (
              payoutRows.map((payout) => (
                <div
                  key={payout.id}
                  className="flex flex-col gap-4 rounded-[28px] bg-[#f8f4ec] p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black/45">
                      {payout.created_at
                        ? new Date(payout.created_at).toLocaleDateString()
                        : "Date unavailable"}
                    </p>
                    <h2 className="mt-1 truncate text-2xl font-black">
                      {groupsById.get(payout.group_id)?.name ??
                        "Group unavailable"}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-black/45">
                      Cycle {payout.payout_cycle ?? 1}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-xl font-black">
                      {formatMoney(payout.amount)}
                    </p>
                    <span className="rounded-full bg-[#0d6b4e]/10 px-4 py-2 text-sm font-black capitalize text-[#0d6b4e]">
                      {payout.status ?? "paid"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f8f4ec] p-8">
                <p className="text-lg font-black">No payout records yet</p>
                <p className="mt-2 max-w-2xl text-black/55">
                  When a group owner records a payout for you, it will appear
                  here with the group, cycle, and amount.
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
