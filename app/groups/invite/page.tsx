import Link from "next/link";

const qrCells = Array.from({ length: 25 }, (_, index) =>
  [0, 2, 3, 5, 6, 8, 11, 12, 14, 16, 18, 19, 21, 23, 24].includes(index)
);

export default function InviteMembersPage() {
  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/groups/create"
          className="text-sm font-black text-[#0d6b4e]"
        >
          ← Back to group setup
        </Link>

        <div className="mt-8 overflow-hidden rounded-[36px] border border-black/5 bg-white shadow-sm">
          {/* Header */}
          <div className="relative overflow-hidden border-b border-black/5 bg-[#07161d] px-8 py-10 text-white">
            <div className="absolute right-[-80px] top-[-80px] h-[220px] w-[220px] rounded-full bg-[#0d6b4e]/30 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
                Invite members
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-tight">
                Bring your group together.
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-white/65">
                Share your invite link or QR code so trusted members can join
                your contribution group securely.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 md:p-10">
            {/* Invite Link */}
            <div className="rounded-[28px] border border-black/5 bg-[#f8f4ec] p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                Invite link
              </p>

              <div className="mt-5 flex flex-col gap-4 md:flex-row">
                <input
                  type="text"
                  value="https://koloverse.app/join/family-circle"
                  readOnly
                  className="flex-1 rounded-2xl border border-black/5 bg-white px-5 py-4 outline-none"
                />

                <button className="rounded-2xl bg-[#0d6b4e] px-6 py-4 font-black text-white shadow-lg shadow-[#0d6b4e]/20">
                  Copy link
                </button>
              </div>
            </div>

            {/* QR + Actions */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* QR */}
              <div className="rounded-[28px] border border-black/5 bg-[#07161d] p-8 text-white">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#7be0b7]">
                  QR Invite
                </p>

                <div className="mt-6 flex items-center justify-center rounded-[28px] bg-white p-10">
                  <div className="grid grid-cols-5 gap-2">
                    {qrCells.map((isFilled, i) => (
                      <div
                        key={i}
                        className={`h-4 w-4 rounded-sm ${
                          isFilled
                            ? "bg-[#07161d]"
                            : "bg-transparent border border-[#07161d]/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-5">
                <div className="rounded-[28px] border border-black/5 bg-[#f8f4ec] p-6">
                  <h3 className="text-xl font-black">
                    Invite via contacts
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-black/55">
                    Select friends and family directly from your contact list.
                  </p>

                  <button className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-black shadow-sm">
                    Choose contacts
                  </button>
                </div>

                <div className="rounded-[28px] border border-black/5 bg-[#f8f4ec] p-6">
                  <h3 className="text-xl font-black">
                    Group settings
                  </h3>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-black/50">Members</span>
                      <span className="font-black">12</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-black/50">Frequency</span>
                      <span className="font-black">Monthly</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-black/50">Contribution</span>
                      <span className="font-black">₦10,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Continue */}
            <button className="mt-8 w-full rounded-full bg-[#07161d] px-8 py-5 text-sm font-black text-white shadow-xl shadow-black/10">
              Finish setup
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
