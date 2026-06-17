"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { logGroupActivity } from "../../../../lib/group-activity";
import { createNotification } from "../../../../lib/notifications";

type Group = {
  id: string;
  name: string;
  owner_id: string;
  contribution_amount: number | null;
  frequency: string | null;
  total_members: number | null;
  reserve_percentage: number | null;
};

type ContributionRecord = {
  id: string;
};

type MembershipRecord = {
  id: string;
};

export default function ContributePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const groupId = params.id;

  const [group, setGroup] = useState<Group | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payoutCycle, setPayoutCycle] = useState(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadGroup() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error || !data) {
        router.push("/groups");
        return;
      }

      if (data.owner_id !== user.id) {
        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", user.id)
          .maybeSingle<MembershipRecord>();

        if (!membership) {
          router.push("/groups");
          return;
        }
      }

      setGroup(data);
      setAmount(String(data.contribution_amount ?? ""));

      const { data: queueRows } = await supabase
        .from("payout_queue")
        .select("payout_cycle")
        .eq("group_id", groupId)
        .order("payout_cycle", { ascending: false })
        .limit(1);

      setPayoutCycle(Number(queueRows?.[0]?.payout_cycle ?? 1));
      setLoading(false);
    }

    loadGroup();
  }, [groupId, router, supabase]);

  async function handleContribution(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSubmitting(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const contributionAmount = Number(amount);

    if (!contributionAmount || contributionAmount <= 0) {
      setErrorMessage("Please enter a valid contribution amount.");
      setSubmitting(false);
      return;
    }

    const { data: contribution, error } = await supabase
      .from("contributions")
      .insert({
        group_id: groupId,
        user_id: user.id,
        amount: contributionAmount,
        payout_cycle: payoutCycle,
        status: "pending",
        note,
      })
      .select("id")
      .single<ContributionRecord>();

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        group_id: groupId,
        contribution_id: contribution.id,
        amount: contributionAmount,
        currency: "NGN",
        provider: "manual",
        status: "pending_verification",
        transaction_type: "contribution",
        payout_cycle: payoutCycle,
        metadata: {
          note,
          entry_method: "manual_contribution_form",
        },
      });

    if (transactionError) {
      setErrorMessage(
        "The contribution was recorded, but its payment transaction could not be created. Confirm the payment transactions migration has run."
      );
      setSubmitting(false);
      return;
    }

    await logGroupActivity(supabase, {
      groupId,
      actorId: user.id,
      activityType: "contribution_submitted",
      title: "Contribution submitted",
      description:
        "A manual contribution was submitted and is waiting for owner review.",
      metadata: {
        contribution_id: contribution.id,
        amount: contributionAmount,
        payout_cycle: payoutCycle,
        status: "pending",
      },
    });

    if (group?.owner_id && group.owner_id !== user.id) {
      await createNotification(supabase, {
        userId: group.owner_id,
        groupId,
        type: "contribution_submitted",
        title: "Contribution submitted",
        message: `${user.email ?? "A group member"} submitted a manual contribution for owner review.`,
        metadata: {
          contribution_id: contribution.id,
          contributor_id: user.id,
          amount: contributionAmount,
          payout_cycle: payoutCycle,
        },
        dedupeKey: `contribution_submitted:${contribution.id}:owner`,
      });
    }

    router.push(`/groups/${groupId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
        <div className="mx-auto max-w-3xl">
          <p className="font-black text-[#0d6b4e]">Loading contribution...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/groups/${groupId}`}
          className="text-sm font-black text-[#0d6b4e]"
        >
          ← Back to group
        </Link>

        <section className="mt-8 overflow-hidden rounded-[40px] border border-black/5 bg-white p-8 shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
            Make contribution
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            {group?.name}
          </h1>

          <p className="mt-4 text-black/55">
            Submit a manual contribution for owner review. It counts toward
            payout readiness after the group owner approves it.
          </p>

          <div className="mt-8 rounded-[28px] bg-[#07161d] p-6 text-white">
            <p className="text-sm text-white/55">Suggested contribution</p>
            <h2 className="mt-2 text-4xl font-black">
              ₦{Number(group?.contribution_amount ?? 0).toLocaleString()}
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Frequency: {group?.frequency ?? "Monthly"} - Cycle {payoutCycle}
            </p>
          </div>

          <form onSubmit={handleContribution} className="mt-8 space-y-6">
            <div>
              <label className="text-sm font-black text-black/60">
                Amount
              </label>

              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10000"
                className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-5 text-lg font-bold outline-none focus:border-[#0d6b4e]"
              />
            </div>

            <div>
              <label className="text-sm font-black text-black/60">
                Note optional
              </label>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g. August contribution"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-5 text-lg outline-none focus:border-[#0d6b4e]"
              />
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#0d6b4e] px-6 py-5 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Submitting contribution..." : "Submit for review"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
