"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import {
  getPayoutEngineSnapshot,
  startNextCycle,
} from "../../../../lib/payout-engine";
import { logGroupActivity } from "../../../../lib/group-activity";
import { createNotification } from "../../../../lib/notifications";

type RecordPayoutState = {
  error: string;
  success: string;
};

type GroupOwnerRow = {
  id: string;
  owner_id: string;
};

type ExistingPayoutRow = {
  id: string;
};

type ExistingReserveRow = {
  id: string;
};

type GroupMemberRow = {
  user_id: string;
};

export async function recordPayoutForNextBeneficiary(
  _previousState: RecordPayoutState,
  formData: FormData
): Promise<RecordPayoutState> {
  const groupId = String(formData.get("groupId") ?? "");

  if (!groupId) {
    return {
      error: "Missing group information. Refresh the page and try again.",
      success: "",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id,owner_id")
    .eq("id", groupId)
    .single<GroupOwnerRow>();

  if (!group) {
    return {
      error: "This group could not be found.",
      success: "",
    };
  }

  if (group.owner_id !== user.id) {
    return {
      error: "Only the group owner can record payouts.",
      success: "",
    };
  }

  const payoutSnapshot = await getPayoutEngineSnapshot(supabase, groupId);
  const nextBeneficiary = payoutSnapshot?.nextBeneficiary ?? null;

  if (!payoutSnapshot || !nextBeneficiary) {
    return {
      error: "No eligible beneficiary is ready for payout yet.",
      success: "",
    };
  }

  if (nextBeneficiary.has_received_payout) {
    return {
      error: "This beneficiary has already received a payout for this cycle.",
      success: "",
    };
  }

  const { data: existingPayout, error: existingPayoutError } = await supabase
    .from("payouts")
    .select("id")
    .eq("payout_queue_id", nextBeneficiary.id)
    .maybeSingle<ExistingPayoutRow>();

  if (existingPayoutError) {
    return {
      error:
        "Could not check whether this payout was already recorded. Confirm the payout execution migration has run.",
      success: "",
    };
  }

  if (existingPayout) {
    return {
      error: "This payout has already been recorded.",
      success: "",
    };
  }

  const { error: insertError } = await supabase.from("payouts").insert({
    group_id: groupId,
    user_id: nextBeneficiary.user_id,
    amount: payoutSnapshot.calculations.payoutAmount,
    status: "paid",
    payout_cycle: nextBeneficiary.payout_cycle,
    payout_queue_id: nextBeneficiary.id,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        error: "This payout has already been recorded.",
        success: "",
      };
    }

    return {
      error:
        "Could not record this payout. Check the payouts insert policy and schema migration.",
      success: "",
    };
  }

  const { data: existingReserve } = await supabase
    .from("reserve_ledger")
    .select("id")
    .eq("group_id", groupId)
    .eq("payout_cycle", nextBeneficiary.payout_cycle)
    .eq("source", "payout_execution")
    .maybeSingle<ExistingReserveRow>();

  const { error: reserveError } = await supabase.from("reserve_ledger").upsert(
    {
      group_id: groupId,
      payout_cycle: nextBeneficiary.payout_cycle,
      amount: payoutSnapshot.calculations.reserveAmount,
      reason: "Reserve withheld from contribution pool",
      source: "payout_execution",
    },
    {
      onConflict: "group_id,payout_cycle,source",
      ignoreDuplicates: true,
    }
  );

  if (reserveError) {
    return {
      error:
        "The payout was recorded, but the reserve ledger could not be updated. Confirm the reserve ledger migration has run.",
      success: "",
    };
  }

  if (!existingReserve) {
    await logGroupActivity(supabase, {
      groupId,
      actorId: user.id,
      activityType: "reserve_recorded",
      title: "Reserve recorded",
      description: "Reserve was withheld from the contribution pool.",
      metadata: {
        payout_cycle: nextBeneficiary.payout_cycle,
        reserve_amount: payoutSnapshot.calculations.reserveAmount,
        source: "payout_execution",
      },
    });
  }

  const { error: updateError } = await supabase
    .from("payout_queue")
    .update({ has_received_payout: true })
    .eq("id", nextBeneficiary.id)
    .eq("group_id", groupId)
    .eq("payout_cycle", nextBeneficiary.payout_cycle)
    .eq("has_received_payout", false);

  if (updateError) {
    return {
      error:
        "The payout was recorded, but the queue could not be marked as received.",
      success: "",
    };
  }

  await logGroupActivity(supabase, {
    groupId,
    actorId: user.id,
    activityType: "payout_recorded",
    title: "Payout recorded",
    description: "The group owner recorded a completed payout. No money was transferred by Koloverse.",
    metadata: {
      beneficiary_id: nextBeneficiary.user_id,
      payout_queue_id: nextBeneficiary.id,
      payout_cycle: nextBeneficiary.payout_cycle,
      amount: payoutSnapshot.calculations.payoutAmount,
      paid_members: payoutSnapshot.calculations.paidMembers,
    },
  });

  await createNotification(supabase, {
    userId: nextBeneficiary.user_id,
    groupId,
    type: "payout_recorded",
    title: "Payout recorded",
    message:
      "Your payout was recorded as completed. No money was transferred by Koloverse.",
    metadata: {
      payout_queue_id: nextBeneficiary.id,
      payout_cycle: nextBeneficiary.payout_cycle,
      amount: payoutSnapshot.calculations.payoutAmount,
    },
    dedupeKey: `payout_recorded:${nextBeneficiary.id}`,
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/payouts`);
  revalidatePath(`/groups/${groupId}/reserve`);
  revalidatePath(`/groups/${groupId}/activity`);
  revalidatePath("/notifications");

  return {
    error: "",
    success: "Payout recorded. No money was transferred.",
  };
}

export async function startNextPayoutCycle(
  _previousState: RecordPayoutState,
  formData: FormData
): Promise<RecordPayoutState> {
  const groupId = String(formData.get("groupId") ?? "");

  if (!groupId) {
    return {
      error: "Missing group information. Refresh the page and try again.",
      success: "",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id,owner_id")
    .eq("id", groupId)
    .single<GroupOwnerRow>();

  if (!group) {
    return {
      error: "This group could not be found.",
      success: "",
    };
  }

  if (group.owner_id !== user.id) {
    return {
      error: "Only the group owner can start a new payout cycle.",
      success: "",
    };
  }

  const result = await startNextCycle(supabase, groupId);

  if (result.error) {
    return {
      error: result.error,
      success: "",
    };
  }

  await logGroupActivity(supabase, {
    groupId,
    actorId: user.id,
    activityType: "cycle_started",
    title: "Next cycle started",
    description: `Cycle ${result.nextCycle} was prepared. Existing payout history remains saved.`,
    metadata: {
      payout_cycle: result.nextCycle,
    },
  });

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .returns<GroupMemberRow[]>();

  const notificationUserIds = Array.from(
    new Set([group.owner_id, ...((members ?? []).map((member) => member.user_id))])
  );

  for (const userId of notificationUserIds) {
    await createNotification(supabase, {
      userId,
      groupId,
      type: "cycle_started",
      title: "New contribution cycle started",
      message: `Cycle ${result.nextCycle} is ready for this group.`,
      metadata: {
        payout_cycle: result.nextCycle,
      },
      dedupeKey: `cycle_started:${groupId}:${result.nextCycle}:${userId}`,
    });
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/payouts`);
  revalidatePath(`/groups/${groupId}/activity`);
  revalidatePath("/notifications");

  return {
    error: "",
    success: `Cycle ${result.nextCycle} is ready. Existing payout history remains saved.`,
  };
}
