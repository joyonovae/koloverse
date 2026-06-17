"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import {
  generateInviteCode,
  isMissingInviteCodeColumnError,
} from "../../../lib/invite-codes";
import { logGroupActivity } from "../../../lib/group-activity";

type CreatedGroup = {
  id: string;
};

export default function CreateGroupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [groupName, setGroupName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("Monthly");
  const [members, setMembers] = useState("");
  const [reserve, setReserve] = useState("10");

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setCheckingAuth(false);
    }

    checkUser();
  }, [router, supabase]);

  async function handleCreateGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const inviteCode = generateInviteCode();
    const contributionAmount = Number(amount);
    const totalMembers = Number(members);
    const reservePercentage = Number(reserve);

    if (
      !groupName.trim() ||
      contributionAmount <= 0 ||
      totalMembers <= 0 ||
      reservePercentage < 0
    ) {
      setErrorMessage("Enter valid group details before creating a group.");
      setLoading(false);
      return;
    }

    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        name: groupName.trim(),
        contribution_amount: contributionAmount,
        frequency,
        total_members: totalMembers,
        reserve_percentage: reservePercentage,
        owner_id: user.id,
        invite_code: inviteCode,
        status: "active",
      })
      .select("id")
      .single<CreatedGroup>();

    if (error) {
      setErrorMessage(
        isMissingInviteCodeColumnError(error)
          ? "Invite codes are not enabled in Supabase yet. Run the invite_code migration, then create the group again."
          : error.message
      );
      setLoading(false);
      return;
    }

    const { error: membershipError } = await supabase
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: "owner",
      });

    if (membershipError && membershipError.code !== "23505") {
      setErrorMessage(
        "The group was created, but Koloverse could not add you as the owner member. Check the group_members insert policy in Supabase."
      );
      setLoading(false);
      return;
    }

    await logGroupActivity(supabase, {
      groupId: group.id,
      actorId: user.id,
      activityType: "group_created",
      title: "Group created",
      description: `${groupName.trim()} was created and is ready for members.`,
      metadata: {
        frequency,
        contribution_amount: contributionAmount,
        total_members: totalMembers,
        reserve_percentage: reservePercentage,
      },
    });

    await logGroupActivity(supabase, {
      groupId: group.id,
      actorId: user.id,
      activityType: "invite_code_generated",
      title: "Invite code generated",
      description: "A permanent invite code was created for this group.",
    });

    router.push(`/groups/${group.id}`);
    router.refresh();
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
        <div className="mx-auto max-w-5xl">
          <p className="font-black text-[#0d6b4e]">Loading group form...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm font-black text-[#0d6b4e]">
          Back to dashboard
        </Link>

        <div className="mt-8 rounded-[40px] border border-black/5 bg-white p-8 shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
            Create group
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            Set up your contribution group.
          </h1>

          <form onSubmit={handleCreateGroup} className="mt-10 space-y-6">
            <div>
              <label className="text-sm font-black text-black/60">
                Group name
              </label>

              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Monthly Savers"
                className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-5 text-lg outline-none"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-black text-black/60">
                  Contribution amount
                </label>

                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000"
                  className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-5 text-lg outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-black text-black/60">
                  Frequency
                </label>

                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-5 text-lg outline-none"
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-black text-black/60">
                  Total members
                </label>

                <input
                  type="number"
                  required
                  min="1"
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                  placeholder="12"
                  className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-5 text-lg outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-black text-black/60">
                  Reserve percentage
                </label>

                <input
                  type="number"
                  required
                  min="0"
                  value={reserve}
                  onChange={(e) => setReserve(e.target.value)}
                  placeholder="10"
                  className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-5 text-lg outline-none"
                />
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#0d6b4e] px-6 py-5 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Creating group..." : "Create contribution group"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
