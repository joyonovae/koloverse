"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../../lib/notifications";

export async function markNotificationAsRead(formData: FormData) {
  const notificationId = String(formData.get("notificationId") ?? "");

  if (!notificationId) {
    return;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await markNotificationRead(
    supabase,
    user.id,
    notificationId
  );

  if (error) {
    return;
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllAsRead() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await markAllNotificationsRead(supabase, user.id);

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
