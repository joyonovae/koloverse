import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "invite_received"
  | "member_joined"
  | "contribution_submitted"
  | "contribution_approved"
  | "contribution_rejected"
  | "payout_recorded"
  | "payout_due"
  | "cycle_started";

export type NotificationRow = {
  id: string;
  user_id: string;
  group_id: string | null;
  type: NotificationType | string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string | null;
};

type CreateNotificationParams = {
  userId: string;
  groupId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  dedupeKey?: string;
};

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  const metadata = {
    ...(params.metadata ?? {}),
    ...(params.dedupeKey ? { dedupe_key: params.dedupeKey } : {}),
  };

  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    group_id: params.groupId ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  });

  if (error && error.code !== "23505") {
    console.warn("Koloverse notification failed:", error.message);
  }
}

export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 100
) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<NotificationRow[]>();

  if (error) {
    console.warn("Koloverse notifications fetch failed:", error.message);
    return [] as NotificationRow[];
  }

  return data ?? [];
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return { error };
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return { error };
}
