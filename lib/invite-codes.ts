const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  const suffix = Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join("");

  return `KLV-${suffix}`;
}

export function normalizeInviteCode(value: FormDataEntryValue | string | null) {
  return String(value ?? "").trim().toUpperCase();
}

export function isMissingInviteCodeColumnError(error: { message?: string; code?: string }) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("invite_code") && message.includes("column"))
  );
}
