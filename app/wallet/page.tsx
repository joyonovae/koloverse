import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

type PaymentTransactionRow = {
  id: string;
  group_id: string;
  amount: number | string;
  currency: string;
  provider: string | null;
  status: string;
  transaction_type: string;
  created_at: string | null;
};

type GroupRow = {
  id: string;
  name: string;
};

function formatMoney(currency: string, amount: number | string) {
  return `${currency || "NGN"} ${Number(amount ?? 0).toLocaleString()}`;
}

export default async function WalletPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: transactions } = await supabase
    .from("payment_transactions")
    .select("id,group_id,amount,currency,provider,status,transaction_type,created_at")
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
  const successfulTransactions = (transactions ?? []).filter(
    (transaction) => transaction.status === "success"
  );
  const contributionTotal = successfulTransactions
    .filter((transaction) => transaction.transaction_type === "contribution")
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-black text-[#0d6b4e]">
          Back to dashboard
        </Link>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[36px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Wallet overview
            </p>

            <h1 className="mt-5 text-5xl font-black tracking-tight">
              {formatMoney("NGN", contributionTotal)}
            </h1>

            <p className="mt-3 text-white/55">
              Visible successful contribution transactions recorded on your
              account.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Transactions", String(transactions?.length ?? 0)],
                ["Successful", String(successfulTransactions.length)],
                ["Manual records", String((transactions ?? []).filter((item) => item.provider === "manual").length)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5"
                >
                  <p className="text-sm text-white/50">{label}</p>
                  <p className="mt-3 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
              Quick actions
            </p>

            <div className="mt-8 grid gap-4">
              <Link
                href="/groups"
                className="rounded-2xl bg-[#0d6b4e] px-6 py-5 text-left font-black text-white"
              >
                Make contribution
              </Link>

              <Link
                href="/payouts"
                className="rounded-2xl bg-[#07161d] px-6 py-5 text-left font-black text-white"
              >
                View payout schedule
              </Link>

              <Link
                href="/transactions"
                className="rounded-2xl border border-black/5 bg-[#f8f4ec] px-6 py-5 text-left font-black"
              >
                View transactions
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
                Transactions
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Recent wallet activity
              </h2>
            </div>

            <Link
              href="/transactions"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
            >
              View all
            </Link>
          </div>

          <div className="mt-8 space-y-4">
            {transactions && transactions.length > 0 ? (
              transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 rounded-[24px] bg-[#f8f4ec] p-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black capitalize">
                      {transaction.transaction_type}
                    </p>
                    <p className="mt-1 truncate text-sm text-black/45">
                      {groupsById.get(transaction.group_id)?.name ??
                        "Group unavailable"}{" "}
                      - {transaction.provider ?? "unassigned"} -{" "}
                      {transaction.status}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-lg font-black ${
                      transaction.status === "success"
                        ? "text-[#0d6b4e]"
                        : transaction.status === "rejected"
                          ? "text-red-700"
                        : "text-[#8a6a00]"
                    }`}
                  >
                    {formatMoney(transaction.currency, transaction.amount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] bg-[#f8f4ec] p-5 text-black/55">
                No payment transaction records yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
