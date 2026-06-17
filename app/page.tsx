import Link from "next/link";

const useCases = [
  "Family savings circles",
  "Market trader groups",
  "Cooperative societies",
  "Church/community groups",
  "Friends saving together",
  "Diaspora family support",
];

const safetyItems = [
  "Clear contribution records",
  "Visible payout schedules",
  "Invite-only group access",
  "10% reserve visibility",
];

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#f8f4ec] text-[#07161d]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f8f4ec]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0d6b4e] text-lg font-black text-white shadow-lg shadow-[#0d6b4e]/20">
              K
            </div>
            <h1 className="text-2xl font-black tracking-tight">Koloverse</h1>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {[
              { label: "Product", href: "#product" },
              { label: "How it works", href: "#how" },
              { label: "Security", href: "#security" },
              { label: "About", href: "#about" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-bold text-black/55 transition hover:text-black"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
  <Link
    href="/login"
    className="hidden md:inline-flex items-center justify-center rounded-full border border-[#07161d]/15 bg-white px-6 py-3 text-sm font-bold text-[#07161d] no-underline transition hover:bg-[#f1ece3]"
  >
    Log in
  </Link>

  <Link
    href="/signup"
    className="inline-flex items-center justify-center rounded-full bg-[#ace0b3] px-6 py-3 text-sm font-bold text-[#ace0b3] no-underline transition hover:bg-[#c6f2d6]"
  >
    Get started
  </Link>
</div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-[#0d6b4e]/10 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:py-24">
          <div className="max-w-xl">
            <div className="inline-flex rounded-full border border-[#0d6b4e]/15 bg-[#0d6b4e]/10 px-5 py-2 text-sm font-extrabold text-[#0d6b4e]">
              Trusted contribution groups, made digital
            </div>

            <h1 className="mt-7 text-4xl font-black leading-[1.04] tracking-tight md:text-5xl xl:text-[64px]">
              Modern Ajo for trusted savings groups.
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-8 text-black/60">
              Koloverse helps families, friends, cooperatives, and community
              groups manage contributions, payout schedules, and group records
              with clarity.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-[#0d6b4e] px-7 py-4 text-sm font-black text-white shadow-xl shadow-[#0d6b4e]/20"
              >
                Create a group
              </Link>

              <Link
                href="/login"
                className="rounded-full border border-black/10 bg-white px-7 py-4 text-sm font-black"
              >
                Join a group
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {["Families", "Cooperatives", "Friends", "Traders"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-full border border-black/5 bg-white px-4 py-2 text-sm font-bold text-black/55 shadow-sm"
                  >
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="relative rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-bold text-black/40">
                    Active savings group
                  </p>
                  <h2 className="mt-2 text-4xl font-black tracking-tight">
                    Monthly Savers
                  </h2>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0d6b4e] text-xl font-black text-white shadow-lg shadow-[#0d6b4e]/20">
                  K
                </div>
              </div>

              <div className="mt-8 rounded-[28px] bg-[#0d6b4e] p-7 text-white">
                <p className="text-sm font-bold text-white/65">
                  Group balance
                </p>

                <h3 className="mt-3 text-5xl font-black tracking-tight">
                  ₦120,000
                </h3>

                <div className="mt-7 grid grid-cols-2 gap-6 border-t border-white/10 pt-5">
                  <div>
                    <p className="text-sm text-white/60">Next payout</p>
                    <p className="mt-1 text-xl font-black">Aug 25</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-white/60">Monthly amount</p>
                    <p className="mt-1 text-xl font-black">₦10,000</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {[
                  "Transparent contribution tracking",
                  "Payout rotation visibility",
                  "10% reserve protection",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-4"
                  >
                    <div className="h-3 w-3 rounded-full bg-[#0d6b4e]" />
                    <p className="font-bold text-black/75">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
            How it works
          </p>

          <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-tight md:text-5xl">
            Save together in simple steps.
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              "Create a private group",
              "Invite trusted members",
              "Track contributions and payouts",
            ].map((item, index) => (
              <div key={item} className="rounded-[28px] bg-[#f8f4ec] p-7">
                <p className="text-sm font-black text-[#0d6b4e]">
                  STEP {index + 1}
                </p>
                <h3 className="mt-5 text-2xl font-black">{item}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="about" className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
              Use cases
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Built for real communities.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-black/60">
              Koloverse supports the savings behavior people already trust, but
              gives it clearer records, structure, and payout visibility.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {useCases.map((item) => (
              <div
                key={item}
                className="rounded-[28px] border border-black/5 bg-white p-7 shadow-sm"
              >
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d6b4e]/10 text-[#0d6b4e]">
                  ✦
                </div>
                <h3 className="text-xl font-black">{item}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section id="security" className="bg-[#07161d] px-6 py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#d8b86a]">
              Why it is safer
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Designed around trust before scale.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">
              Koloverse is built to reduce confusion, payment disputes, and
              missing records inside trusted contribution groups.
            </p>
          </div>

          <div className="grid gap-4">
            {safetyItems.map((item) => (
              <div
                key={item}
                className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6"
              >
                <p className="text-lg font-black">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREMIUM SHOWCASE */}
      <section id="product" className="relative bg-[#f8f4ec] px-6 py-28">
        <div className="absolute left-[-120px] top-20 h-[420px] w-[420px] rounded-full bg-[#0d6b4e]/10 blur-3xl" />
        <div className="absolute bottom-10 right-[-160px] h-[480px] w-[480px] rounded-full bg-[#d8b86a]/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
              Product preview
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              A calm dashboard for contribution groups.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-black/60">
              From group setup to payout visibility, Koloverse gives every
              member a clearer view of what is happening.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="rounded-[40px] border border-black/5 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)] md:p-8">
              <div className="rounded-[32px] bg-[#07161d] p-6 text-white md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/50">
                      Dashboard home
                    </p>
                    <h3 className="mt-2 text-3xl font-black md:text-4xl">
                      Welcome back, Joy
                    </h3>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d6b4e] font-black">
                    K
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {[
                    ["Wallet balance", "₦50,200"],
                    ["Active groups", "3"],
                    ["Next payout", "Aug 25"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5"
                    >
                      <p className="text-sm text-white/45">{label}</p>
                      <p className="mt-3 text-2xl font-black">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[28px] bg-white p-5 text-[#07161d]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-black/45">
                        Monthly Contributions
                      </p>
                      <h4 className="mt-1 text-2xl font-black">
                        Group progress
                      </h4>
                    </div>

                    <span className="rounded-full bg-[#0d6b4e]/10 px-4 py-2 text-sm font-black text-[#0d6b4e]">
                      8/12 paid
                    </span>
                  </div>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/10">
                    <div className="h-full w-[68%] rounded-full bg-[#0d6b4e]" />
                  </div>

                  <div className="mt-6 grid gap-3">
                    {[
                      ["Amina Yusuf", "Paid"],
                      ["Tunde Bello", "Paid"],
                      ["Grace Okafor", "Pending"],
                    ].map(([name, status]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-2xl bg-[#f8f4ec] px-4 py-3"
                      >
                        <p className="font-bold">{name}</p>
                        <p
                          className={`text-sm font-black ${
                            status === "Paid"
                              ? "text-[#0d6b4e]"
                              : "text-[#d8a514]"
                          }`}
                        >
                          {status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[36px] border border-black/5 bg-white p-7 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                  Group setup
                </p>

                <div className="mt-6 space-y-4">
                  {[
                    ["Contribution amount", "₦10,000"],
                    ["Frequency", "Monthly"],
                    ["Total members", "12"],
                    ["Reserve rule", "10% withhold"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-[#f8f4ec] px-5 py-4"
                    >
                      <p className="text-sm font-bold text-black/45">
                        {label}
                      </p>
                      <p className="mt-1 text-xl font-black">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[36px] bg-[#0d6b4e] p-7 text-white shadow-xl shadow-[#0d6b4e]/20">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
                  Next payout
                </p>

                <div className="mt-6 flex items-center justify-between gap-6">
                  <div>
                    <h3 className="text-3xl font-black">Wale O.</h3>
                    <p className="mt-2 text-white/65">
                      Scheduled for Aug 25
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white px-5 py-4 text-right text-[#07161d]">
                    <p className="text-sm font-bold text-black/45">Amount</p>
                    <p className="text-xl font-black">₦120,000</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[36px] border border-black/5 bg-white p-7 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d6b4e]">
                  Invite members
                </p>

                <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#f8f4ec] p-5">
                  <div>
                    <p className="text-sm font-bold text-black/45">
                      Group code
                    </p>
                    <p className="mt-1 text-2xl font-black">KLV-2048</p>
                  </div>

                  <button
                    type="button"
                    className="rounded-full bg-[#07161d] px-5 py-3 text-sm font-black text-white"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl rounded-[40px] bg-[#0d6b4e] px-8 py-16 text-center text-white md:px-12">
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Start your first contribution group.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/75">
            Create a trusted group, invite your members, and manage savings with
            better clarity from day one.
          </p>

          <Link
            href="/signup"
            className="mt-9 inline-flex rounded-full bg-black px-8 py-4 text-sm font-black text-[#07161d]"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-semibold text-black/50 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Koloverse. All rights reserved.</p>
          <p>Digital contribution groups built on trust.</p>
        </div>
      </footer>
    </main>
  );
}