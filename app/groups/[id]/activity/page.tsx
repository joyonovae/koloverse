import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { getDisplayName } from "../../../../lib/payout-engine";
import { getGroupActivity } from "../../../../lib/group-activity";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GroupRow = {
  id: string;
  name: string;
  owner_id: string;
};

type MembershipRow = {
  id: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
};

function activityBadgeClass(activityType: string) {
  if (
    activityType === "contribution_approved" ||
    activityType === "payout_recorded" ||
    activityType === "reserve_recorded"
  ) {
    return "bg-[#0d6b4e]/10 text-[#0d6b4e]";
  }

  if (activityType === "contribution_rejected") {
    return "bg-red-50 text-red-700";
  }

  if (
    activityType === "contribution_submitted" ||
    activityType === "cycle_started"
  ) {
    return "bg-[#d8b86a]/20 text-[#8a6a00]";
  }

  return "bg-black/5 text-black/65";
}

function formatActivityType(activityType: string) {
  return activityType.replaceAll("_", " ");
}

export default async function GroupActivityPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id,name,owner_id")
    .eq("id", id)
    .single<GroupRow>();

  if (!group) {
    redirect("/groups");
  }

  const isOwner = group.owner_id === user.id;

  const { data: membership } = isOwner
    ? { data: null }
    : await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .maybeSingle<MembershipRow>();

  if (!isOwner && !membership) {
    redirect("/groups");
  }

  const activityRows = await getGroupActivity(supabase, id, 100);
  const actorIds = Array.from(
    new Set(
      activityRows
        .map((activity) => activity.actor_id)
        .filter((actorId): actorId is string => Boolean(actorId))
    )
  );

  const { data: profiles } =
    actorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,email")
          .in("id", actorIds)
          .returns<ProfileRow[]>()
      : { data: [] as ProfileRow[] };

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/groups/${group.id}`}
            className="text-sm font-black text-[#0d6b4e]"
          >
            Back to group
          </Link>

          <Link
            href={`/groups/${group.id}/contributions`}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
          >
            Contributions
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.65fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Activity timeline
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight">
              {group.name}
            </h1>
            <p className="mt-4 max-w-2xl text-white/60">
              A shared audit trail for membership, contributions, payouts,
              cycle changes, and reserve records.
            </p>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
              Audit summary
            </p>
            <h2 className="mt-4 text-4xl font-black">{activityRows.length}</h2>
            <p className="mt-2 text-sm font-bold text-black/50">
              Timeline item{activityRows.length === 1 ? "" : "s"} visible to
              this group.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="space-y-4">
            {activityRows.length > 0 ? (
              activityRows.map((activity) => {
                const actorProfile = activity.actor_id
                  ? profilesById.get(activity.actor_id)
                  : null;
                const actorEmail = actorProfile?.email ?? null;

                return (
                  <article
                    key={activity.id}
                    className="grid gap-4 rounded-[28px] border border-black/5 bg-[#f8f4ec] p-5 md:grid-cols-[160px_1fr]"
                  >
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-2 text-xs font-black capitalize ${activityBadgeClass(
                          activity.activity_type
                        )}`}
                      >
                        {formatActivityType(activity.activity_type)}
                      </span>
                      <p className="mt-3 text-sm font-bold text-black/45">
                        {activity.created_at
                          ? new Date(activity.created_at).toLocaleString()
                          : "Date unavailable"}
                      </p>
                    </div>

                    <div>
                      <h2 className="text-xl font-black">{activity.title}</h2>
                      {activity.description ? (
                        <p className="mt-2 leading-6 text-black/60">
                          {activity.description}
                        </p>
                      ) : null}
                      <p className="mt-4 text-sm font-bold text-black/45">
                        Actor:{" "}
                        {actorEmail ? getDisplayName(actorEmail) : "System"}
                        {actorEmail ? ` (${actorEmail})` : ""}
                      </p>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[28px] bg-[#f8f4ec] p-8 text-black/55">
                No activity has been recorded for this group yet. New
                contribution, payout, membership, and cycle events will appear
                here.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
