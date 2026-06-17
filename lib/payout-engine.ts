import type { SupabaseClient } from "@supabase/supabase-js";

export type GroupForPayout = {
  id: string;
  name: string;
  contribution_amount: number | string | null;
  reserve_percentage: number | string | null;
  owner_id: string;
  created_at: string | null;
};

export type PayoutQueueRow = {
  id: string;
  group_id: string;
  user_id: string;
  payout_position: number;
  payout_cycle: number;
  has_received_payout: boolean;
  created_at: string | null;
};

export type ContributionRow = {
  id: string;
  group_id: string;
  user_id: string;
  amount: number | string | null;
  payout_cycle: number | null;
  status: string | null;
  created_at: string | null;
};

export type ProfileRow = {
  id: string;
  email: string | null;
};

export type PayoutBeneficiary = PayoutQueueRow & {
  email: string;
  hasPaid: boolean;
};

export type PayoutCalculation = {
  paidMembers: number;
  groupPool: number;
  reserveAmount: number;
  payoutAmount: number;
};

export type PayoutEngineSnapshot = {
  group: GroupForPayout;
  queue: PayoutQueueRow[];
  currentCycleQueue: PayoutQueueRow[];
  profilesById: Map<string, ProfileRow>;
  currentCycle: number;
  nextBeneficiary: PayoutBeneficiary | null;
  paidMemberIds: Set<string>;
  calculations: PayoutCalculation;
  cycleSummary: CycleSummary;
};

export type CycleSummary = {
  currentCycle: number;
  totalEligibleMembers: number;
  receivedPayouts: number;
  pendingPayouts: number;
  isComplete: boolean;
};

function statusIsPaid(status: string | null) {
  return (status ?? "").toLowerCase() === "paid";
}

export function getDisplayName(email: string | null | undefined) {
  return email?.split("@")[0] || "Member";
}

export function formatMoney(amount: number) {
  return `NGN ${amount.toLocaleString()}`;
}

export function calculatePayoutAmount(params: {
  contributionAmount: number;
  paidMembers: number;
  reservePercentage: number;
}): PayoutCalculation {
  const groupPool = params.contributionAmount * params.paidMembers;
  const reserveAmount = (groupPool * params.reservePercentage) / 100;

  return {
    paidMembers: params.paidMembers,
    groupPool,
    reserveAmount,
    payoutAmount: groupPool - reserveAmount,
  };
}

export function getNextBeneficiaryFromQueue(params: {
  queue: PayoutQueueRow[];
  paidMemberIds: Set<string>;
  profilesById: Map<string, ProfileRow>;
  currentCycle: number;
}): PayoutBeneficiary | null {
  const nextQueueRow =
    params.queue
      .filter((queueRow) => queueRow.payout_cycle === params.currentCycle)
      .filter((queueRow) => !queueRow.has_received_payout)
      .filter((queueRow) => params.paidMemberIds.has(queueRow.user_id))
      .sort((a, b) => a.payout_position - b.payout_position)[0] ?? null;

  if (!nextQueueRow) {
    return null;
  }

  return {
    ...nextQueueRow,
    email: params.profilesById.get(nextQueueRow.user_id)?.email ?? "Member",
    hasPaid: true,
  };
}

export function getCycleSummaryFromQueue(params: {
  queue: PayoutQueueRow[];
  currentCycle: number;
}): CycleSummary {
  const currentCycleQueue = params.queue.filter(
    (queueRow) => queueRow.payout_cycle === params.currentCycle
  );
  const receivedPayouts = currentCycleQueue.filter(
    (queueRow) => queueRow.has_received_payout
  ).length;
  const totalEligibleMembers = currentCycleQueue.length;

  return {
    currentCycle: params.currentCycle,
    totalEligibleMembers,
    receivedPayouts,
    pendingPayouts: Math.max(totalEligibleMembers - receivedPayouts, 0),
    isComplete: totalEligibleMembers > 0 && receivedPayouts === totalEligibleMembers,
  };
}

export async function getPayoutEngineSnapshot(
  supabase: SupabaseClient,
  groupId: string
): Promise<PayoutEngineSnapshot | null> {
  const { data: group } = await supabase
    .from("groups")
    .select("id,name,contribution_amount,reserve_percentage,owner_id,created_at")
    .eq("id", groupId)
    .single<GroupForPayout>();

  if (!group) {
    return null;
  }

  const { data: queue } = await supabase
    .from("payout_queue")
    .select("*")
    .eq("group_id", groupId)
    .order("payout_cycle", { ascending: true })
    .order("payout_position", { ascending: true })
    .returns<PayoutQueueRow[]>();

  const { data: contributions } = await supabase
    .from("contributions")
    .select("id,group_id,user_id,amount,payout_cycle,status,created_at")
    .eq("group_id", groupId)
    .returns<ContributionRow[]>();

  const currentCycle = Math.max(
    1,
    ...((queue ?? []).map((queueRow) => Number(queueRow.payout_cycle) || 1))
  );

  const currentCycleQueue = (queue ?? []).filter(
    (queueRow) => queueRow.payout_cycle === currentCycle
  );

  const paidMemberIds = new Set(
    (contributions ?? [])
      .filter((contribution) => Number(contribution.payout_cycle ?? 1) === currentCycle)
      .filter((contribution) => statusIsPaid(contribution.status))
      .map((contribution) => contribution.user_id)
  );

  const profileIds = Array.from(
    new Set([group.owner_id, ...((queue ?? []).map((queueRow) => queueRow.user_id))])
  );

  const { data: profiles } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,email")
          .in("id", profileIds)
          .returns<ProfileRow[]>()
      : { data: [] as ProfileRow[] };

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  const calculations = calculatePayoutAmount({
    contributionAmount: Number(group.contribution_amount ?? 0),
    paidMembers: paidMemberIds.size,
    reservePercentage: Number(group.reserve_percentage ?? 0),
  });

  const nextBeneficiary = getNextBeneficiaryFromQueue({
    queue: queue ?? [],
    paidMemberIds,
    profilesById,
    currentCycle,
  });
  const cycleSummary = getCycleSummaryFromQueue({
    queue: queue ?? [],
    currentCycle,
  });

  return {
    group,
    queue: queue ?? [],
    currentCycleQueue,
    profilesById,
    currentCycle,
    nextBeneficiary,
    paidMemberIds,
    calculations,
    cycleSummary,
  };
}

export async function getNextBeneficiary(
  supabase: SupabaseClient,
  groupId: string
) {
  const snapshot = await getPayoutEngineSnapshot(supabase, groupId);

  return snapshot?.nextBeneficiary ?? null;
}

export async function getCurrentCycle(
  supabase: SupabaseClient,
  groupId: string
) {
  const snapshot = await getPayoutEngineSnapshot(supabase, groupId);

  return snapshot?.currentCycle ?? 1;
}

export async function getCycleSummary(
  supabase: SupabaseClient,
  groupId: string
) {
  const snapshot = await getPayoutEngineSnapshot(supabase, groupId);

  return (
    snapshot?.cycleSummary ?? {
      currentCycle: 1,
      totalEligibleMembers: 0,
      receivedPayouts: 0,
      pendingPayouts: 0,
      isComplete: false,
    }
  );
}

export async function isCycleComplete(
  supabase: SupabaseClient,
  groupId: string
) {
  const summary = await getCycleSummary(supabase, groupId);

  return summary.isComplete;
}

export async function startNextCycle(
  supabase: SupabaseClient,
  groupId: string
) {
  const snapshot = await getPayoutEngineSnapshot(supabase, groupId);

  if (!snapshot) {
    return {
      error: "This group could not be found.",
      nextCycle: null,
    };
  }

  if (!snapshot.cycleSummary.isComplete) {
    return {
      error: "The current payout cycle is not complete yet.",
      nextCycle: null,
    };
  }

  const nextCycle = snapshot.currentCycle + 1;
  const existingNextCycleRows = snapshot.queue.filter(
    (queueRow) => queueRow.payout_cycle === nextCycle
  );

  if (existingNextCycleRows.length > 0) {
    return {
      error: "The next payout cycle has already been prepared.",
      nextCycle,
    };
  }

  const nextCycleRows = snapshot.currentCycleQueue
    .sort((a, b) => a.payout_position - b.payout_position)
    .map((queueRow) => ({
      group_id: groupId,
      user_id: queueRow.user_id,
      payout_position: queueRow.payout_position,
      payout_cycle: nextCycle,
      has_received_payout: false,
    }));

  if (nextCycleRows.length === 0) {
    return {
      error: "There are no queue members to carry into the next cycle.",
      nextCycle: null,
    };
  }

  const { error } = await supabase.from("payout_queue").insert(nextCycleRows);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "The next payout cycle has already been prepared.",
        nextCycle,
      };
    }

    return {
      error: "Could not prepare the next payout cycle.",
      nextCycle: null,
    };
  }

  return {
    error: "",
    nextCycle,
  };
}
