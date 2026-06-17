"use client";

import { useEffect, useState } from "react";

type CopyInviteButtonProps = {
  value: string;
  label: string;
  copiedLabel?: string;
  variant?: "primary" | "secondary";
};

export default function CopyInviteButton({
  value,
  label,
  copiedLabel = "Copied!",
  variant = "primary",
}: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  const className =
    variant === "primary"
      ? "inline-flex justify-center rounded-full bg-[#07161d] px-5 py-4 text-sm font-black text-white"
      : "inline-flex justify-center rounded-full border border-black/10 bg-white px-5 py-4 text-sm font-black text-[#07161d]";

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? copiedLabel : label}
    </button>
  );
}
