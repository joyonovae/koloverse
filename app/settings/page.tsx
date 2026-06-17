import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-[#f8f4ec] p-8">
      <h1 className="text-3xl font-black">Settings</h1>
      <p className="mt-4 text-black/60">
        Manage profile, payment methods, and preferences.
      </p>
    </main>
  );
}