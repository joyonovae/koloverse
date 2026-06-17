"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { approveContribution, rejectContribution } from "./actions";

const initialState = {
  error: "",
  success: "",
};

type ReviewButtonsProps = {
  groupId: string;
  contributionId: string;
};

export default function ReviewButtons({
  groupId,
  contributionId,
}: ReviewButtonsProps) {
  const router = useRouter();
  const [approveState, approveAction, approving] = useActionState(
    approveContribution,
    initialState
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectContribution,
    initialState
  );

  useEffect(() => {
    if (approveState.success || rejectState.success) {
      router.refresh();
    }
  }, [approveState.success, rejectState.success, router]);

  const message =
    approveState.error ||
    approveState.success ||
    rejectState.error ||
    rejectState.success;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={approveAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="contributionId" value={contributionId} />
          <button
            type="submit"
            disabled={approving || rejecting}
            className="rounded-full bg-[#0d6b4e] px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approving ? "Approving..." : "Approve"}
          </button>
        </form>

        <form action={rejectAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="contributionId" value={contributionId} />
          <button
            type="submit"
            disabled={approving || rejecting}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rejecting ? "Rejecting..." : "Reject"}
          </button>
        </form>
      </div>

      {message ? (
        <p
          className={`text-xs font-bold ${
            approveState.error || rejectState.error
              ? "text-red-700"
              : "text-[#0d6b4e]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
