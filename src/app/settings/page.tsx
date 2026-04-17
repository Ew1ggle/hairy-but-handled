"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Trash2, LogOut } from "lucide-react";
import type { TonePreference } from "@/lib/affirmations";

type Row = { patient_id: string; user_id: string; role: string; display_name?: string | null };
type Invite = { id: string; patient_id: string; email: string; role: string };

export default function Settings() {
  const { user, role, activePatientId, signOut } = useSession();
  const sb = supabase();
  const [members, setMembers] = useState<Row[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setRole] = useState<"support" | "doctor">("support");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
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

  const load = async () => {
    if (!sb || !activePatientId) return;
    const [m, i] = await Promise.all([
      sb.from("members").select("*").eq("patient_id", activePatientId),
      sb.from("invites").select("*").eq("patient_id", activePatientId),
    ]);
    setMembers((m.data as Row[]) ?? []);
    setInvites((i.data as Invite[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activePatientId]);

  const invite = async () => {
    if (!sb || !activePatientId || !email) return;
    setBusy(true); setMsg(null);
    const { error } = await sb.from("invites").insert({ patient_id: activePatientId, email: email.trim().toLowerCase(), role: inviteRole });
    if (error) { setBusy(false); setMsg(error.message); return; }

    // Get patient name for the email
    let patientName = "";
    try {
      const { data: profile } = await sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle();
      patientName = (profile?.data as { name?: string })?.name ?? "";
    } catch {}

    // Send the invite email
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), patientName, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Invite sent! They'll receive an email with instructions to join.");
      } else {
        setMsg(`Invite saved but email couldn't be sent: ${data.error}. Ask them to sign in with that email — they'll be added automatically.`);
      }
    } catch {
      setMsg("Invite saved but email couldn't be sent. Ask them to sign in with that email — they'll be added automatically.");
    }
    setEmail(""); setBusy(false); load();
  };

  const removeMember = async (uid: string) => {
    if (!sb || !activePatientId) return;
    await sb.from("members").delete().eq("patient_id", activePatientId).eq("user_id", uid);
    load();
  };
  const removeInvite = async (id: string) => {
    if (!sb) return;
    await sb.from("invites").delete().eq("id", id);
    load();
  };

  const isPatient = role === "patient";

  return (
    <AppShell>
      <PageTitle sub={user?.email ?? undefined}>Settings</PageTitle>

      <Card className="mb-4">
        <div className="text-sm">You are signed in as <b>{user?.email}</b>{role && <> · role: <b>{role}</b></>}</div>
        <button onClick={signOut} className="mt-3 flex items-center gap-2 text-sm text-[var(--alert)]">
          <LogOut size={16} /> Sign out
        </button>
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

      <h2 className="text-lg font-semibold mb-2">Care circle</h2>
      <div className="space-y-2 mb-4">
        {members.map((m) => (
          <Card key={m.user_id} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{m.display_name || m.user_id.slice(0, 8) + "…"}</div>
              <div className="text-xs text-[var(--ink-soft)]">{m.role}</div>
            </div>
            {isPatient && m.role !== "patient" && (
              <button onClick={() => removeMember(m.user_id)} className="text-[var(--ink-soft)] p-1" aria-label="Remove">
                <Trash2 size={18} />
              </button>
            )}
          </Card>
        ))}
      </div>

      {invites.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-2">Pending invites</h2>
          <div className="space-y-2 mb-4">
            {invites.map((i) => (
              <Card key={i.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm">{i.email}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{i.role} — not signed in yet</div>
                </div>
                {isPatient && (
                  <button onClick={() => removeInvite(i.id)} className="text-[var(--ink-soft)] p-1" aria-label="Cancel invite">
                    <Trash2 size={18} />
                  </button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {isPatient && (
        <Card>
          <h3 className="font-semibold mb-3">Invite someone</h3>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" />
          </Field>
          <div className="flex gap-2 my-3">
            {(["support","doctor"] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`flex-1 rounded-xl px-3 py-2 text-sm border ${inviteRole === r ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {r === "support" ? "Support (can log)" : "Doctor (read-only)"}
              </button>
            ))}
          </div>
          {msg && <p className="text-sm text-[var(--ink-soft)] mb-2">{msg}</p>}
          <Submit onClick={invite} disabled={busy || !email}>{busy ? "Saving…" : "Save invite"}</Submit>
          <p className="text-xs text-[var(--ink-soft)] mt-3">
            An invitation email will be sent. They just need to click the link and sign in with that exact email address.
          </p>
        </Card>
      )}

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
