"use client";

import { useActionState } from "react";
import { joinGroupByInviteCode } from "./actions";

const initialState = {
  error: "",
};

type JoinGroupFormProps = {
  defaultInviteCode?: string;
};

export default function JoinGroupForm({
  defaultInviteCode = "",
}: JoinGroupFormProps) {
  const [state, formAction, pending] = useActionState(
    joinGroupByInviteCode,
    initialState
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="inviteCode"
          className="text-sm font-black text-black/60"
        >
          Invite code
        </label>

        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          required
          autoComplete="off"
          defaultValue={defaultInviteCode}
          placeholder="KLV-ABC123"
          className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-5 text-lg font-black uppercase tracking-[0.08em] outline-none transition focus:border-[#0d6b4e]"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#0d6b4e] px-6 py-5 text-lg font-black text-white shadow-lg shadow-[#0d6b4e]/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Joining group..." : "Join group"}
      </button>
    </form>
  );
}
