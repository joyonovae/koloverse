import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { getUserNotifications } from "../../lib/notifications";

type GroupRow = {
  id: string;
  name: string;
  contribution_amount: number | string | null;
  frequency: string | null;
  total_members: number | string | null;
  owner_id: string;
  status: string | null;
  created_at: string | null;
};

type GroupMemberRow = {
  group_id: string;
  user_id: string;
  role: string | null;
};

type MoneyRow = {
  id: string;
  amount: number | string | null;
  status: string | null;
  created_at: string | null;
};

type VisibleGroup = GroupRow & {
  viewerRole: "Owner" | "Member";
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ownedGroups } = await supabase
    .from("groups")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<GroupRow[]>();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id,user_id,role")
    .eq("user_id", user.id)
    .returns<GroupMemberRow[]>();

  const ownedGroupIds = new Set((ownedGroups ?? []).map((group) => group.id));
  const joinedGroupIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((membership) => membership.group_id)
        .filter((groupId) => !ownedGroupIds.has(groupId))
    )
  );

  const { data: joinedGroups } =
    joinedGroupIds.length > 0
      ? await supabase
          .from("groups")
          .select("*")
          .in("id", joinedGroupIds)
          .order("created_at", { ascending: false })
          .returns<GroupRow[]>()
      : { data: [] as GroupRow[] };

  const { data: contributions } = await supabase
    .from("contributions")
    .select("id,amount,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<MoneyRow[]>();

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id,amount,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<MoneyRow[]>();

  const notifications = await getUserNotifications(supabase, user.id, 25);
  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const visibleGroupsById = new Map<string, VisibleGroup>();

  for (const group of ownedGroups ?? []) {
    visibleGroupsById.set(group.id, {
      ...group,
      viewerRole: "Owner",
    });
  }

  for (const group of joinedGroups ?? []) {
    if (!visibleGroupsById.has(group.id)) {
      visibleGroupsById.set(group.id, {
        ...group,
        viewerRole: group.owner_id === user.id ? "Owner" : "Member",
      });
    }
  }

  const visibleGroups = Array.from(visibleGroupsById.values()).sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime()
  );

  const ownedGroupsCount = ownedGroups?.length ?? 0;
  const joinedGroupsCount = joinedGroups?.length ?? 0;
  const totalVisibleGroups = visibleGroups.length;

  const totalContributions =
    contributions?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0;

  const totalPayouts =
    payouts?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0;

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
              Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-black/55">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-[#07161d]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0d6b4e] px-1.5 text-xs font-black text-white">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
            </Link>

            <Link
              href="/groups/join"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
            >
              Join group
            </Link>

            <Link
              href="/groups/create"
              className="rounded-full bg-[#0d6b4e] px-6 py-3 text-sm font-black text-white"
            >
              Create group
            </Link>

            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
              >
                Log out
              </button>
            </form>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[32px] border border-black/5 bg-white p-5 shadow-sm">
            <nav className="space-y-2">
              <Link
                href="/dashboard"
                className="flex w-full items-center justify-between rounded-2xl bg-[#0d6b4e] px-4 py-4 text-left text-white"
              >
                <span className="font-bold">Dashboard</span>
                <span>*</span>
              </Link>

              <Link
                href="/wallet"
                className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left font-bold transition hover:bg-black/[0.03]"
              >
                Wallet
              </Link>

              <Link
                href="/groups"
                className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left font-bold transition hover:bg-black/[0.03]"
              >
                Groups
              </Link>

              <Link
                href="/groups/join"
                className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left font-bold transition hover:bg-black/[0.03]"
              >
                Join group
              </Link>

              <Link
                href="/contributions"
                className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left font-bold transition hover:bg-black/[0.03]"
              >
                Contributions
              </Link>

              <Link
                href="/transactions"
                className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left font-bold transition hover:bg-black/[0.03]"
              >
                Transactions
              </Link>

              <Link
                href="/payouts"
                className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left font-bold transition hover:bg-black/[0.03]"
              >
                Payouts
              </Link>

              <Link
                href="/notifications"
                className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left font-bold transition hover:bg-black/[0.03]"
              >
                <span>Notifications</span>
                {unreadNotifications > 0 ? (
                  <span className="rounded-full bg-[#0d6b4e] px-2 py-1 text-xs font-black text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Link>
            </nav>
          </aside>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[36px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                    Account overview
                  </p>

                  <h2 className="mt-4 text-5xl font-black tracking-tight">
                    NGN {totalContributions.toLocaleString()}
                  </h2>

                  <p className="mt-3 text-white/55">
                    Total contributions recorded on your account.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">
                  Active
                </div>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/55">Owned groups</p>
                  <h3 className="mt-2 text-2xl font-black">
                    {ownedGroupsCount}
                  </h3>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/55">Joined groups</p>
                  <h3 className="mt-2 text-2xl font-black">
                    {joinedGroupsCount}
                  </h3>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/55">Groups visible</p>
                  <h3 className="mt-2 text-2xl font-black">
                    {totalVisibleGroups}
                  </h3>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/55">Total payouts</p>
                  <h3 className="mt-2 text-2xl font-black">
                    NGN {totalPayouts.toLocaleString()}
                  </h3>
                </div>
              </div>
            </div>

            <div className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[#0d6b4e]">
                    Your groups
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Contribution circles
                  </h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/groups/join"
                    className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
                  >
                    Join group
                  </Link>

                  <Link
                    href="/groups/create"
                    className="rounded-full bg-[#0d6b4e] px-5 py-3 text-sm font-black text-white"
                  >
                    Create group
                  </Link>
                </div>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {visibleGroups.length > 0 ? (
                  visibleGroups.map((group) => (
                    <Link
                      href={`/groups/${group.id}`}
                      key={group.id}
                      className="rounded-[28px] border border-black/5 bg-[#f8f4ec] p-6 transition hover:-translate-y-[2px] hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-black/50">
                            {group.frequency ?? "Contribution group"}
                          </p>

                          <h3 className="mt-2 text-2xl font-black">
                            {group.name}
                          </h3>
                        </div>

                        <div
                          className={`rounded-full px-3 py-2 text-xs font-black text-white ${
                            group.viewerRole === "Owner"
                              ? "bg-[#0d6b4e]"
                              : "bg-[#07161d]"
                          }`}
                        >
                          {group.viewerRole}
                        </div>
                      </div>

                      <div className="mt-8 flex items-end justify-between">
                        <div>
                          <p className="text-sm text-black/50">Contribution</p>
                          <h4 className="mt-1 text-xl font-black">
                            NGN{" "}
                            {Number(
                              group.contribution_amount ?? 0
                            ).toLocaleString()}
                          </h4>
                        </div>

                        <div>
                          <p className="text-sm text-black/50">Members</p>
                          <h4 className="mt-1 text-xl font-black">
                            {group.total_members ?? 0}
                          </h4>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f8f4ec] p-6 md:col-span-2">
                    <p className="text-lg font-black">No groups yet</p>
                    <p className="mt-2 text-black/55">
                      Create a contribution group or join one with an invite
                      code.
                    </p>

                    <Link
                      href="/groups/create"
                      className="mt-5 inline-flex rounded-full bg-[#0d6b4e] px-5 py-3 text-sm font-black text-white"
                    >
                      Create group
                    </Link>

                    <Link
                      href="/groups/join"
                      className="ml-3 mt-5 inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
                    >
                      Join with code
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#0d6b4e]">
                  Recent contributions
                </p>

                <h2 className="mt-2 text-3xl font-black">Latest activity</h2>
              </div>

              <div className="mt-8 space-y-4">
                {contributions && contributions.length > 0 ? (
                  contributions.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl bg-[#f8f4ec] px-5 py-5"
                    >
                      <div>
                        <p className="font-black">Contribution payment</p>
                        <p className="mt-1 text-sm text-black/50">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : "No date"}
                        </p>
                      </div>

                      <p className="text-lg font-black text-[#0d6b4e]">
                        NGN {Number(item.amount ?? 0).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-[#f8f4ec] px-5 py-5 text-black/55">
                    No contribution activity yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
