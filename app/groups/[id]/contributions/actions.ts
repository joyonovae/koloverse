"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { logGroupActivity } from "../../../../lib/group-activity";
import { createNotification } from "../../../../lib/notifications";

type ReviewState = {
  error: string;
  success: string;
};

type ContributionRow = {
  id: string;
  group_id: string;
  user_id: string;
  amount: number | string | null;
  payout_cycle: number | null;
};

type GroupRow = {
  id: string;
  owner_id: string;
};

async function reviewContribution(
  formData: FormData,
  contributionStatus: "paid" | "rejected",
  transactionStatus: "success" | "rejected"
): Promise<ReviewState> {
  const groupId = String(formData.get("groupId") ?? "");
  const contributionId = String(formData.get("contributionId") ?? "");

  if (!groupId || !contributionId) {
    return {
      error: "Missing contribution review details. Refresh and try again.",
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
    .single<GroupRow>();

  if (!group || group.owner_id !== user.id) {
    return {
      error: "Only the group owner can review contributions.",
      success: "",
    };
  }

  const { data: contribution } = await supabase
    .from("contributions")
    .select("id,group_id,user_id,amount,payout_cycle")
    .eq("id", contributionId)
    .eq("group_id", groupId)
    .single<ContributionRow>();

  if (!contribution) {
    return {
      error: "Contribution could not be found.",
      success: "",
    };
  }

  const { error: contributionError } = await supabase
    .from("contributions")
    .update({ status: contributionStatus })
    .eq("id", contribution.id)
    .eq("group_id", groupId);

  if (contributionError) {
    return {
      error: "Could not update contribution status.",
      success: "",
    };
  }

  const { error: transactionError } = await supabase
    .from("payment_transactions")
    .update({ status: transactionStatus })
    .eq("contribution_id", contribution.id)
    .eq("group_id", groupId)
    .eq("transaction_type", "contribution");

  if (transactionError) {
    return {
      error:
        "Contribution was updated, but the linked payment transaction could not be updated.",
      success: "",
    };
  }

  const isApproval = contributionStatus === "paid";

  await logGroupActivity(supabase, {
    groupId,
    actorId: user.id,
    activityType: isApproval
      ? "contribution_approved"
      : "contribution_rejected",
    title: isApproval ? "Contribution approved" : "Contribution rejected",
    description: isApproval
      ? "The group owner approved a manual contribution."
      : "The group owner rejected a manual contribution.",
    metadata: {
      contribution_id: contribution.id,
      contributor_id: contribution.user_id,
      amount: Number(contribution.amount ?? 0),
      payout_cycle: contribution.payout_cycle ?? 1,
      contribution_status: contributionStatus,
      transaction_status: transactionStatus,
    },
  });

  await createNotification(supabase, {
    userId: contribution.user_id,
    groupId,
    type: isApproval ? "contribution_approved" : "contribution_rejected",
    title: isApproval ? "Contribution approved" : "Contribution rejected",
    message: isApproval
      ? "Your manual contribution has been approved and now counts toward payout readiness."
      : "Your manual contribution was rejected by the group owner.",
    metadata: {
      contribution_id: contribution.id,
      amount: Number(contribution.amount ?? 0),
      payout_cycle: contribution.payout_cycle ?? 1,
      status: contributionStatus,
    },
    dedupeKey: `${isApproval ? "approved" : "rejected"}:${contribution.id}`,
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/contributions`);
  revalidatePath(`/groups/${groupId}/payouts`);
  revalidatePath(`/groups/${groupId}/activity`);
  revalidatePath("/notifications");
  revalidatePath("/transactions");
  revalidatePath("/wallet");

  return {
    error: "",
    success:
      contributionStatus === "paid"
        ? "Contribution approved."
        : "Contribution rejected.",
  };
}

export async function approveContribution(
  _previousState: ReviewState,
  formData: FormData
) {
  return reviewContribution(formData, "paid", "success");
}

export async function rejectContribution(
  _previousState: ReviewState,
  formData: FormData
) {
  return reviewContribution(formData, "rejected", "rejected");
}
