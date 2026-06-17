"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startNextPayoutCycle } from "./actions";

const initialState = {
  error: "",
  success: "",
};

type StartCycleFormProps = {
  groupId: string;
};

export default function StartCycleForm({ groupId }: StartCycleFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    startNextPayoutCycle,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

      <p className="rounded-[22px] bg-[#f8f4ec] px-5 py-4 text-sm font-bold leading-6 text-black/60">
        This prepares the next round. Existing payout history remains saved.
      </p>

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-[#0d6b4e]/20 bg-[#0d6b4e]/10 px-5 py-4 text-sm font-bold text-[#0d6b4e]">
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#07161d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-black/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Starting next cycle..." : "Start next cycle"}
      </button>
    </form>
  );
}
