import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { normalizeInviteCode } from "../../../lib/invite-codes";
import JoinGroupForm from "./join-group-form";

type JoinGroupPageProps = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function JoinGroupPage({
  searchParams,
}: JoinGroupPageProps) {
  const { code } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/groups" className="text-sm font-black text-[#0d6b4e]">
            Back to groups
          </Link>

          <Link
            href="/dashboard"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black"
          >
            Dashboard
          </Link>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[40px] bg-[#07161d] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] md:p-10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7be0b7]">
              Join group
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              Enter your Koloverse invite code.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              Enter an invite code from a trusted group owner. Only join groups
              you personally trust.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/55">Access</p>
                <h2 className="mt-2 text-2xl font-black">Members only</h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/55">Signed in as</p>
                <h2 className="mt-2 truncate text-2xl font-black">
                  {user.email}
                </h2>
              </div>
            </div>
          </div>

          <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm md:p-10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d6b4e]">
              Invite code
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight">
              Join a trusted circle
            </h2>

            <p className="mt-3 text-sm leading-6 text-black/55">
              Codes are normalized automatically, so spacing and lowercase
              letters are fine.
            </p>

            <div className="mt-5 rounded-[24px] border border-[#0d6b4e]/10 bg-[#0d6b4e]/5 px-5 py-4 text-sm font-bold leading-6 text-[#0d6b4e]">
              Confirm the group owner with people you know before joining a
              contribution circle.
            </div>

            <JoinGroupForm defaultInviteCode={normalizeInviteCode(code ?? "")} />
          </div>
        </section>
      </div>
    </main>
  );
}
