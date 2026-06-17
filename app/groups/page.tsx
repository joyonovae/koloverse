import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

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

type VisibleGroup = GroupRow & {
  viewerRole: "Owner" | "Member";
};

export default async function GroupsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ownedGroups, error: ownedGroupsError } = await supabase
    .from("groups")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<GroupRow[]>();

  const { data: memberships, error: membershipsError } = await supabase
    .from("group_members")
    .select("group_id,user_id,role")
    .eq("user_id", user.id)
    .returns<GroupMemberRow[]>();

  if (ownedGroupsError) {
    console.error(ownedGroupsError);
  }

  if (membershipsError) {
    console.error(membershipsError);
  }

  const ownedGroupIds = new Set((ownedGroups ?? []).map((group) => group.id));
  const joinedGroupIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((membership) => membership.group_id)
        .filter((groupId) => !ownedGroupIds.has(groupId))
    )
  );

  const { data: joinedGroups, error: joinedGroupsError } =
    joinedGroupIds.length > 0
      ? await supabase
          .from("groups")
          .select("*")
          .in("id", joinedGroupIds)
          .order("created_at", { ascending: false })
          .returns<GroupRow[]>()
      : { data: [] as GroupRow[], error: null };

  if (joinedGroupsError) {
    console.error(joinedGroupsError);
  }

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

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-sm font-black text-[#0d6b4e]">
            Back to dashboard
          </Link>

          <div className="flex flex-wrap gap-3">
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
          </div>
        </div>

        <section className="mt-8 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
            Groups
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Your contribution groups
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-black/55">
            Manage the groups you own and the trusted circles you have joined.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleGroups.length > 0 ? (
              visibleGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="rounded-[28px] border border-black/5 bg-[#f8f4ec] p-6 transition hover:-translate-y-[2px] hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-black/50">
                        {group.frequency ?? "Contribution Group"}
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        {group.name}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-2 text-xs font-black ${
                        group.viewerRole === "Owner"
                          ? "bg-[#0d6b4e] text-white"
                          : "bg-[#07161d] text-white"
                      }`}
                    >
                      {group.viewerRole}
                    </span>
                  </div>

                  <div className="mt-8 grid gap-4">
                    <div>
                      <p className="text-sm text-black/45">Contribution</p>
                      <p className="mt-1 text-xl font-black">
                        NGN{" "}
                        {Number(group.contribution_amount ?? 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-black/45">Members</p>
                        <p className="mt-1 text-xl font-black">
                          {group.total_members ?? 0}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-2 text-xs font-black capitalize text-black/65">
                        {group.status ?? "active"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f8f4ec] p-6 md:col-span-2 xl:col-span-3">
                <p className="text-lg font-black">
                  No contribution groups yet
                </p>

                <p className="mt-2 text-black/55">
                  Create a contribution group or join one with an invite code.
                </p>

                <Link
                  href="/groups/create"
                  className="mt-5 inline-flex rounded-full bg-[#0d6b4e] px-5 py-3 text-sm font-black text-white"
                >
                  Create your first group
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
        </section>
      </div>
    </main>
  );
}
