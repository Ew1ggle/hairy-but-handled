"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { LogOut, UserPlus, Users } from "lucide-react";
import type { TonePreference } from "@/lib/affirmations";
import { NotificationsSettings } from "@/components/NotificationsSettings";

export default function Settings() {
  const { user, role, activePatientId, signOut } = useSession();
  const sb = supabase();
  const [tone, setTone] = useState<TonePreference>("both");

  // Load tone preference
  useEffect(() => {
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as { tonePreference?: TonePreference } | undefined;
        if (p?.tonePreference) setTone(p.tonePreference);
      });
  }, [sb, activePatientId]);

  const saveTone = async (t: TonePreference) => {
    setTone(t);
    if (!sb || !activePatientId) return;
    const { data: existing } = await sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle();
    const currentData = (existing?.data ?? {}) as Record<string, unknown>;
    await sb.from("patient_profiles").upsert({ patient_id: activePatientId, data: { ...currentData, tonePreference: t } });
  };

  const isPatient = role === "patient";

  return (
    <AppShell>
      <PageTitle sub={user?.email ?? undefined}>Settings</PageTitle>

      {/* Notifications — push + email fallback + Telegram info */}
      <Card className="mb-4">
        <NotificationsSettings />
      </Card>

      <Card className="mb-4">
        <div className="text-sm">You are signed in as <b>{user?.email}</b>{role && <> · role: <b>{role}</b></>}</div>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/my-profile" className="inline-flex items-center gap-2 text-sm text-[var(--primary)] font-medium">
            My profile →
          </a>
          <button onClick={signOut} className="inline-flex items-center gap-2 text-sm text-[var(--alert)]">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="font-semibold mb-3">Affirmation tone</h3>
        <p className="text-xs text-[var(--ink-soft)] mb-3">Choose the vibe for your daily affirmation</p>
        <div className="flex gap-2">
          {([
            { value: "positive" as const, label: "Positive" },
            { value: "spicy" as const, label: "Spicy" },
            { value: "both" as const, label: "Both" },
          ]).map((opt) => (
            <button key={opt.value} onClick={() => saveTone(opt.value)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm border font-medium ${tone === opt.value ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="font-semibold mb-2">Set up another patient</h3>
        <p className="text-xs text-[var(--ink-soft)] mb-3">
          Create a new patient record and link yourself as their support person.
          Useful if you're helping more than one person, or adding a patient for the first time.
        </p>
        <a
          href="/add-patient"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 text-sm font-medium active:scale-[0.99] transition"
        >
          <UserPlus size={16} /> Add a patient
        </a>
      </Card>

      <Card className="mb-4">
        <h3 className="font-semibold mb-1">Care circle</h3>
        <p className="text-xs text-[var(--ink-soft)] mb-3">
          Invites, pending requests, and who can see your info — now live in the Care tab.
        </p>
        <a
          href="/care"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 text-sm font-medium active:scale-[0.99] transition"
        >
          <Users size={16} /> Open Care tab
        </a>
      </Card>

      {/* Privacy and legal */}
      <div className="mt-6 space-y-2">
        <a href="/privacy" className="block text-sm text-[var(--primary)] font-medium">Privacy Policy →</a>
        <a href="/terms" className="block text-sm text-[var(--primary)] font-medium">Terms of Service →</a>
      </div>

      {/* Delete account */}
      {isPatient && (
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-2 text-[var(--alert)]">Delete account</h2>
          <p className="text-sm text-[var(--ink-soft)] mb-3">
            This will permanently delete your account and all associated data including entries, profile,
            uploaded files, and care circle. This action cannot be undone.
          </p>
          <DeleteAccountButton />
        </div>
      )}
    </AppShell>
  );
}

function DeleteAccountButton() {
  const { signOut, activePatientId, user } = useSession();
  const [step, setStep] = useState<"idle" | "confirm" | "deleting">("idle");

  const deleteAccount = async () => {
    const sb = supabase();
    if (!sb || !activePatientId || !user) return;
    setStep("deleting");
    try {
      // Get the current session token
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session token");

      // Call server-side deletion route (deletes all data + auth user)
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Deletion failed");
      }

      // Sign out locally
      await signOut();
    } catch (e) {
      console.error("Delete failed:", e);
      setStep("idle");
    }
  };

  if (step === "idle") {
    return (
      <button onClick={() => setStep("confirm")} className="rounded-xl border-2 border-[var(--alert)] text-[var(--alert)] px-4 py-2.5 text-sm font-medium">
        Delete my account and all data
      </button>
    );
  }

  if (step === "confirm") {
    return (
      <Card className="border-[var(--alert)]">
        <p className="text-sm font-semibold text-[var(--alert)] mb-3">Are you sure? This cannot be undone.</p>
        <p className="text-sm text-[var(--ink-soft)] mb-4">All your entries, profile data, uploaded files, and care circle will be permanently deleted.</p>
        <div className="flex gap-2">
          <button onClick={() => setStep("idle")} className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium">
            Cancel
          </button>
          <button onClick={deleteAccount} className="flex-1 rounded-xl bg-[var(--alert)] text-white py-2.5 text-sm font-semibold">
            Yes, delete everything
          </button>
        </div>
      </Card>
    );
  }

  return <p className="text-sm text-[var(--ink-soft)]">Deleting your account...</p>;
}
