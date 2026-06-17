import Link from "next/link";

const members = [
  {
    name: "Joy Onovae",
    role: "Admin",
    status: "Active",
    contribution: "Paid",
    payoutPosition: 1,
  },
  {
    name: "Grace Okafor",
    role: "Member",
    status: "Active",
    contribution: "Paid",
    payoutPosition: 2,
  },
  {
    name: "David Obi",
    role: "Member",
    status: "Pending",
    contribution: "Unpaid",
    payoutPosition: 3,
  },
  {
    name: "Favour James",
    role: "Member",
    status: "Active",
    contribution: "Paid",
    payoutPosition: 4,
  },
];

export default function GroupMembersPage() {
  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/groups"
          className="text-sm font-black text-[#0d6b4e]"
        >
          ← Back to group
        </Link>

        <section className="mt-8 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
                Members
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight">
                Group participants
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-black/55">
                Manage trusted members, track contributions, and monitor payout
                order transparently.
              </p>
            </div>

            <button className="rounded-full bg-[#0d6b4e] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#0d6b4e]/20 transition hover:-translate-y-[2px]">
              Invite member
            </button>
          </div>

          {/* Stats */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] bg-[#f8f4ec] p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-black/45">
                Total members
              </p>

              <h2 className="mt-4 text-4xl font-black">12</h2>
            </div>

            <div className="rounded-[28px] bg-[#f8f4ec] p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-black/45">
                Contributions paid
              </p>

              <h2 className="mt-4 text-4xl font-black text-[#0d6b4e]">
                9
              </h2>
            </div>

            <div className="rounded-[28px] bg-[#f8f4ec] p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-black/45">
                Pending payments
              </p>

              <h2 className="mt-4 text-4xl font-black text-[#c58a12]">
                3
              </h2>
            </div>
          </div>

          {/* Members table */}
          <div className="mt-10 overflow-hidden rounded-[30px] border border-black/5">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-[#07161d] text-left text-white">
                  <tr>
                    <th className="px-6 py-5 text-sm font-black">
                      Member
                    </th>

                    <th className="px-6 py-5 text-sm font-black">
                      Role
                    </th>

                    <th className="px-6 py-5 text-sm font-black">
                      Contribution
                    </th>

                    <th className="px-6 py-5 text-sm font-black">
                      Status
                    </th>

                    <th className="px-6 py-5 text-sm font-black">
                      Payout order
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {members.map((member, index) => (
                    <tr
                      key={member.name}
                      className={
                        index % 2 === 0 ? "bg-white" : "bg-[#f8f4ec]"
                      }
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d6b4e]/10 font-black text-[#0d6b4e]">
                            {member.name.charAt(0)}
                          </div>

                          <div>
                            <p className="font-black">
                              {member.name}
                            </p>

                            <p className="text-sm text-black/45">
                              Verified member
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-2 text-xs font-black ${
                            member.role === "Admin"
                              ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                              : "bg-black/5 text-black/65"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-2 text-xs font-black ${
                            member.contribution === "Paid"
                              ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                              : "bg-[#d8b86a]/20 text-[#8a6a00]"
                          }`}
                        >
                          {member.contribution}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-2 text-xs font-black ${
                            member.status === "Active"
                              ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                              : "bg-[#d8b86a]/20 text-[#8a6a00]"
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>

                      <td className="px-6 py-5 font-black">
                        #{member.payoutPosition}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
