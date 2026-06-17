import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { getUserNotifications } from "../../lib/notifications";
import { markAllAsRead, markNotificationAsRead } from "./actions";

type GroupRow = {
  id: string;
  name: string;
};

function typeBadgeClass(type: string) {
  if (
    type === "contribution_approved" ||
    type === "payout_recorded" ||
    type === "cycle_started"
  ) {
    return "bg-[#0d6b4e]/10 text-[#0d6b4e]";
  }

  if (type === "contribution_rejected") {
    return "bg-red-50 text-red-700";
  }

  if (type === "contribution_submitted" || type === "payout_due") {
    return "bg-[#d8b86a]/20 text-[#8a6a00]";
  }

  return "bg-[#07161d]/10 text-[#07161d]";
}

function formatType(type: string) {
  return type.replaceAll("_", " ");
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notifications = await getUserNotifications(supabase, user.id, 100);
  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;
  const groupIds = Array.from(
    new Set(
      notifications
        .map((notification) => notification.group_id)
        .filter((groupId): groupId is string => Boolean(groupId))
    )
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
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-sm font-black text-[#0d6b4e]">
            Back to dashboard
          </Link>

          {unreadCount > 0 ? (
            <form action={markAllAsRead}>
              <button
                type="submit"
                className="rounded-full bg-[#07161d] px-5 py-3 text-sm font-black text-white"
              >
                Mark all as read
              </button>
            </form>
          ) : null}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.55fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Notifications
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight">
              In-app alerts
            </h1>
            <p className="mt-4 max-w-2xl text-white/60">
              Important updates from your groups, contribution reviews, payouts,
              and cycle changes.
            </p>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Inbox summary
            </p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-[26px] bg-[#f8f4ec] p-5">
                <p className="text-sm font-bold text-black/45">Unread</p>
                <h2 className="mt-2 text-3xl font-black">{unreadCount}</h2>
              </div>
              <div className="rounded-[26px] bg-[#0d6b4e]/10 p-5">
                <p className="text-sm font-bold text-[#0d6b4e]">Total</p>
                <h2 className="mt-2 text-3xl font-black">
                  {notifications.length}
                </h2>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const group = notification.group_id
                  ? groupsById.get(notification.group_id)
                  : null;

                return (
                  <article
                    key={notification.id}
                    className={`rounded-[28px] border p-6 ${
                      notification.is_read
                        ? "border-black/5 bg-[#f8f4ec]"
                        : "border-[#0d6b4e]/20 bg-white shadow-sm"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-2 text-xs font-black capitalize ${typeBadgeClass(
                              notification.type
                            )}`}
                          >
                            {formatType(notification.type)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-2 text-xs font-black ${
                              notification.is_read
                                ? "bg-black/5 text-black/45"
                                : "bg-[#0d6b4e] text-white"
                            }`}
                          >
                            {notification.is_read ? "Read" : "Unread"}
                          </span>
                        </div>

                        <h2 className="mt-4 text-xl font-black">
                          {notification.title}
                        </h2>
                        <p className="mt-2 leading-7 text-black/60">
                          {notification.message}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-black/45">
                          <span>{group?.name ?? "Koloverse"}</span>
                          <span>
                            {notification.created_at
                              ? new Date(
                                  notification.created_at
                                ).toLocaleString()
                              : "Date unavailable"}
                          </span>
                        </div>
                      </div>

                      {!notification.is_read ? (
                        <form action={markNotificationAsRead}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={notification.id}
                          />
                          <button
                            type="submit"
                            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
                          >
                            Mark as read
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[28px] bg-[#f8f4ec] p-8 text-black/55">
                No notifications yet. Koloverse will alert you here when group
                members join, contributions are reviewed, payouts are recorded,
                or new cycles begin.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
