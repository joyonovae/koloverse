import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { formatMoney } from "../../../../lib/payout-engine";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GroupAccessRow = {
  id: string;
  name: string;
  owner_id: string;
  reserve_percentage: number | string | null;
};

type MembershipRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: string | null;
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

export default async function GroupReservePage({ params }: PageProps) {
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
    .select("id,name,owner_id,reserve_percentage")
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

  const { data: reserveLedger } = await supabase
    .from("reserve_ledger")
    .select("*")
    .eq("group_id", id)
    .order("payout_cycle", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ReserveLedgerRow[]>();

  const ledgerRows = reserveLedger ?? [];
  const totalReserve = ledgerRows.reduce(
    (sum, entry) => sum + Number(entry.amount ?? 0),
    0
  );

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
              Reserve ledger
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              {group.name}
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              A transparent record of reserve amounts withheld from payout
              pools. This is accounting state only, not a wallet transfer.
            </p>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Reserve summary
            </p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                <p className="text-sm font-bold text-black/45">Reserve rate</p>
                <h2 className="mt-2 text-3xl font-black">
                  {Number(group.reserve_percentage ?? 0)}%
                </h2>
              </div>

              <div className="rounded-[26px] bg-[#07161d] p-5 text-white">
                <p className="text-sm font-bold text-white/55">
                  Total reserve held
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {formatMoney(totalReserve)}
                </h2>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              History
            </p>
            <h2 className="mt-2 text-3xl font-black">Reserve entries</h2>
          </div>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-black/5">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-[#07161d] text-white">
                  <tr>
                    <th className="px-5 py-4 text-sm font-black">Cycle</th>
                    <th className="px-5 py-4 text-sm font-black">Amount</th>
                    <th className="px-5 py-4 text-sm font-black">Reason</th>
                    <th className="px-5 py-4 text-sm font-black">Source</th>
                    <th className="px-5 py-4 text-sm font-black">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length > 0 ? (
                    ledgerRows.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-[#f8f4ec]"}
                      >
                        <td className="px-5 py-5 font-black">
                          {entry.payout_cycle}
                        </td>
                        <td className="px-5 py-5 font-black text-[#0d6b4e]">
                          {formatMoney(Number(entry.amount ?? 0))}
                        </td>
                        <td className="px-5 py-5 font-bold text-black/65">
                          {entry.reason}
                        </td>
                        <td className="px-5 py-5">
                          <span className="rounded-full bg-black/5 px-3 py-2 text-xs font-black text-black/65">
                            {entry.source}
                          </span>
                        </td>
                        <td className="px-5 py-5 text-sm font-bold text-black/50">
                          {entry.created_at
                            ? new Date(entry.created_at).toLocaleDateString()
                            : "Not recorded"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="bg-[#f8f4ec] px-5 py-8 text-black/55"
                      >
                        No reserve entries yet. A reserve row is recorded when
                        the owner records a payout for a cycle.
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
