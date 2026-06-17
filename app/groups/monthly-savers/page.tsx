const members = [
  { name: "Amina Yusuf", status: "Paid", amount: "₦10,000" },
  { name: "Tunde Bello", status: "Paid", amount: "₦10,000" },
  { name: "Grace Okafor", status: "Pending", amount: "₦0" },
  { name: "Wale O.", status: "Paid", amount: "₦10,000" },
];

export default function GroupDashboardPage() {
  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm font-black text-[#0d6b4e]">
          ← Back to dashboard
        </a>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[36px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Group dashboard
            </p>

            <div className="mt-5 flex items-start justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black tracking-tight">
                  Monthly Savers
                </h1>
                <p className="mt-3 text-white/60">
                  12 members · Monthly contribution
                </p>
              </div>

              <span className="rounded-full bg-[#0d6b4e] px-4 py-2 text-sm font-black">
                Active
              </span>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
                <p className="text-sm text-white/50">Total contribution</p>
                <h2 className="mt-3 text-3xl font-black">₦120,000</h2>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
                <p className="text-sm text-white/50">Next payout</p>
                <h2 className="mt-3 text-3xl font-black">Aug 25</h2>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
                <p className="text-sm text-white/50">Paid this round</p>
                <h2 className="mt-3 text-3xl font-black">8/12</h2>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <p className="font-black">Round progress</p>
                <p className="text-sm font-bold text-white/60">68%</p>
              </div>

              <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[68%] rounded-full bg-[#0d6b4e]" />
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
              Payout schedule
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight">
              Upcoming recipients
            </h2>

            <div className="mt-8 space-y-4">
              {[
                ["Aug 25", "Wale O.", "₦120,000"],
                ["Sep 25", "Grace Okafor", "₦120,000"],
                ["Oct 25", "Amina Yusuf", "₦120,000"],
              ].map(([date, name, amount]) => (
                <div
                  key={date}
                  className="flex items-center justify-between rounded-2xl bg-[#f8f4ec] p-5"
                >
                  <div>
                    <p className="text-sm font-bold text-black/45">{date}</p>
                    <p className="mt-1 font-black">{name}</p>
                  </div>

                  <p className="font-black text-[#0d6b4e]">{amount}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
                Members
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Contribution status
              </h2>
            </div>

            <button className="rounded-full bg-[#0d6b4e] px-6 py-3 text-sm font-black text-white">
              Make contribution
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {members.map((member) => (
              <div
                key={member.name}
                className="flex items-center justify-between rounded-[24px] bg-[#f8f4ec] p-5"
              >
                <div>
                  <p className="font-black">{member.name}</p>
                  <p className="mt-1 text-sm text-black/45">{member.amount}</p>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    member.status === "Paid"
                      ? "bg-[#0d6b4e]/10 text-[#0d6b4e]"
                      : "bg-[#d8b86a]/20 text-[#8a6a00]"
                  }`}
                >
                  {member.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}