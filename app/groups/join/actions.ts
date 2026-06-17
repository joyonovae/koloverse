"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import {
  isMissingInviteCodeColumnError,
  normalizeInviteCode,
} from "../../../lib/invite-codes";
import { logGroupActivity } from "../../../lib/group-activity";
import { createNotification } from "../../../lib/notifications";

type JoinGroupState = {
  error: string;
};

type JoinableGroup = {
  id: string;
  owner_id: string;
  invite_code?: string | null;
};

type GroupMembership = {
  id: string;
  group_id: string;
  user_id: string;
  role: string | null;
};

export async function joinGroupByInviteCode(
  _previousState: JoinGroupState,
  formData: FormData
): Promise<JoinGroupState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const inviteCode = normalizeInviteCode(formData.get("inviteCode"));

  if (!inviteCode) {
    return { error: "Enter a group invite code to continue." };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id,owner_id,invite_code")
    .eq("invite_code", inviteCode)
    .maybeSingle<JoinableGroup>();

  if (groupError) {
    if (isMissingInviteCodeColumnError(groupError)) {
      return {
        error:
          "Invite codes are not enabled in Supabase yet. Run the invite_code migration, then try again.",
      };
    }

    return {
      error: "We could not validate that invite code. Please try again.",
    };
  }

  if (!group) {
    return { error: "No group matches that invite code." };
  }

  if (group.owner_id === user.id) {
    redirect(`/groups/${group.id}`);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("id,group_id,user_id,role")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle<GroupMembership>();

  if (membershipError) {
    return {
      error: "We could not check your group membership. Please try again.",
    };
  }

  if (membership) {
    redirect(`/groups/${group.id}`);
  }

  const { error: insertError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "member",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      redirect(`/groups/${group.id}`);
    }

    return {
      error:
      "We could not add you to this group. Check the group_members insert policy in Supabase.",
    };
  }

  await logGroupActivity(supabase, {
    groupId: group.id,
    actorId: user.id,
    activityType: "member_joined",
    title: "Member joined",
    description: "A member joined this group with an invite code.",
    metadata: {
      join_method: "invite_code",
    },
  });

  await createNotification(supabase, {
    userId: group.owner_id,
    groupId: group.id,
    type: "member_joined",
    title: "New member joined",
    message: `${user.email ?? "A new member"} joined your contribution group.`,
    metadata: {
      member_id: user.id,
      join_method: "invite_code",
    },
    dedupeKey: `member_joined:${group.id}:${user.id}`,
  });

  redirect(`/groups/${group.id}`);
}
