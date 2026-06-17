import type { SupabaseClient } from "@supabase/supabase-js";

export type GroupActivityType =
  | "group_created"
  | "member_joined"
  | "contribution_submitted"
  | "contribution_approved"
  | "contribution_rejected"
  | "payout_recorded"
  | "cycle_started"
  | "reserve_recorded"
  | "invite_code_generated";

export type GroupActivityRow = {
  id: string;
  group_id: string;
  actor_id: string | null;
  activity_type: GroupActivityType | string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type LogGroupActivityParams = {
  groupId: string;
  actorId: string;
  activityType: GroupActivityType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logGroupActivity(
  supabase: SupabaseClient,
  params: LogGroupActivityParams
) {
  const { error } = await supabase.from("group_activity").insert({
    group_id: params.groupId,
    actor_id: params.actorId,
    activity_type: params.activityType,
    title: params.title,
    description: params.description ?? null,
    metadata: params.metadata ?? null,
  });

  if (error) {
    console.warn("Koloverse activity log failed:", error.message);
  }
}

export async function getGroupActivity(
  supabase: SupabaseClient,
  groupId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from("group_activity")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<GroupActivityRow[]>();

  if (error) {
    console.warn("Koloverse activity fetch failed:", error.message);
    return [] as GroupActivityRow[];
  }

  return data ?? [];
}
