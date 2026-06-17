"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupClientPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setSuccessMessage("Account created successfully.");
      router.push("/dashboard");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-10 text-[#07161d]">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md flex-col justify-center">
        <Link href="/" className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0d6b4e] text-lg font-black text-white">
            K
          </div>
          <h1 className="text-2xl font-black">Koloverse</h1>
        </Link>

        <div className="relative overflow-hidden rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] md:p-10">
          <div className="absolute right-[-80px] top-[-80px] h-[220px] w-[220px] rounded-full bg-[#0d6b4e]/10 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0d6b4e]">
              Create account
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight">
              Start your savings journey.
            </h2>

            <p className="mt-4 text-base leading-7 text-black/55">
              Create your Koloverse account and begin managing trusted
              contribution groups digitally.
            </p>

            <form onSubmit={handleSignup} className="mt-10 space-y-5">
              <div>
                <label className="text-sm font-black text-black/60">
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="Joy Onovae"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-4 text-[15px] outline-none transition focus:border-[#0d6b4e]"
                />
              </div>

              <div>
                <label className="text-sm font-black text-black/60">
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-4 text-[15px] outline-none transition focus:border-[#0d6b4e]"
                />
              </div>

              <div>
                <label className="text-sm font-black text-black/60">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f8f4ec] px-5 py-4 text-[15px] outline-none transition focus:border-[#0d6b4e]"
                />
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  {successMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-full bg-[#0d6b4e] px-6 py-4 text-sm font-black text-white shadow-xl shadow-[#0d6b4e]/20 transition hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-semibold text-black/55">
              Already have an account?{" "}
              <Link href="/login" className="font-black text-[#0d6b4e]">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}