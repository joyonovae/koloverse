import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

type PaymentTransactionRow = {
  id: string;
  user_id: string;
  group_id: string;
  contribution_id: string | null;
  amount: number | string;
  currency: string;
  provider: string | null;
  provider_reference: string | null;
  status: string;
  transaction_type: string;
  payout_cycle: number;
  created_at: string | null;
};

type GroupRow = {
  id: string;
  name: string;
};

function formatMoney(currency: string, amount: number | string) {
  return `${currency || "NGN"} ${Number(amount ?? 0).toLocaleString()}`;
}

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: transactions } = await supabase
    .from("payment_transactions")
    .select(
      "id,user_id,group_id,contribution_id,amount,currency,provider,provider_reference,status,transaction_type,payout_cycle,created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<PaymentTransactionRow[]>();

  const groupIds = Array.from(
    new Set((transactions ?? []).map((transaction) => transaction.group_id))
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

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-sm font-black text-[#0d6b4e]">
            Back to dashboard
          </Link>

          <Link
            href="/wallet"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
          >
            Wallet
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.55fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Transactions
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              Payment readiness ledger
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              Manual records today, payment processor reconciliation tomorrow.
              No Paystack calls or real money movement happen here yet.
            </p>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Summary
            </p>
            <h2 className="mt-4 text-4xl font-black">
              {transactions?.length ?? 0}
            </h2>
            <p className="mt-2 text-sm font-bold text-black/50">
              Visible payment transaction records
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="overflow-hidden rounded-[28px] border border-black/5">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-[#07161d] text-white">
                  <tr>
                    <th className="px-5 py-4 text-sm font-black">Amount</th>
                    <th className="px-5 py-4 text-sm font-black">Type</th>
                    <th className="px-5 py-4 text-sm font-black">Group</th>
                    <th className="px-5 py-4 text-sm font-black">Status</th>
                    <th className="px-5 py-4 text-sm font-black">Provider</th>
                    <th className="px-5 py-4 text-sm font-black">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions && transactions.length > 0 ? (
                    transactions.map((transaction, index) => (
                      <tr
                        key={transaction.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-[#f8f4ec]"}
                      >
                        <td className="px-5 py-5 font-black text-[#0d6b4e]">
                          {formatMoney(transaction.currency, transaction.amount)}
                        </td>
                        <td className="px-5 py-5">
                          <span className="rounded-full bg-black/5 px-3 py-2 text-xs font-black capitalize text-black/65">
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td className="px-5 py-5 font-bold text-black/65">
                          {groupsById.get(transaction.group_id)?.name ??
                            "Group unavailable"}
                        </td>
                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full px-3 py-2 text-xs font-black capitalize ${
                              transaction.status === "success"
                                ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                                : transaction.status === "rejected"
                                  ? "bg-red-50 text-red-700"
                                : "bg-[#d8b86a]/20 text-[#8a6a00]"
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-5 py-5 font-bold capitalize text-black/55">
                          {transaction.provider ?? "Unassigned"}
                        </td>
                        <td className="px-5 py-5 text-sm font-bold text-black/50">
                          {transaction.created_at
                            ? new Date(transaction.created_at).toLocaleDateString()
                            : "Not recorded"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="bg-[#f8f4ec] px-5 py-8 text-black/55"
                      >
                        No payment transaction records yet. Manual contribution
                        entries will appear here after the payment transactions
                        migration is applied.
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
