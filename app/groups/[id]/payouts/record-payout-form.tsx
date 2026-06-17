"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { recordPayoutForNextBeneficiary } from "./actions";

const initialState = {
  error: "",
  success: "",
};

type RecordPayoutFormProps = {
  groupId: string;
  disabled: boolean;
};

export default function RecordPayoutForm({
  groupId,
  disabled,
}: RecordPayoutFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    recordPayoutForNextBeneficiary,
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
        This records the payout as completed. No money is transferred yet.
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
        disabled={disabled || pending}
        className="w-full rounded-full bg-[#0d6b4e] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#0d6b4e]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Recording payout..." : "Record payout"}
      </button>
    </form>
  );
}
