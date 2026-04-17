"use client";
import { useSession } from "@/lib/session";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Submit, TextInput, Field, Card } from "./ui";
import { isConfigured } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

const PUBLIC_PATHS = ["/ed-triggers"]; // accessible without auth

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user, memberships, makeSelfPatient, activePatientId, role } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  // On sign-in, claim any pending invites for this email
  useEffect(() => {
    const sb = supabase();
    if (!sb || !user || accepted) return;
    (async () => { try { await sb.rpc("accept_invites"); } catch {} setAccepted(true); })();
  }, [user, accepted]);

  // For the patient: redirect to /profile on first load if no profile yet
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId || role !== "patient" || profileChecked) return;
    if (path === "/profile" || PUBLIC_PATHS.includes(path)) { setProfileChecked(true); return; }
    (async () => {
      const { data } = await sb.from("patient_profiles").select("patient_id").eq("patient_id", activePatientId).maybeSingle();
      setProfileChecked(true);
      if (!data) router.replace("/profile");
    })();
  }, [activePatientId, role, profileChecked, path, router]);

  const [membershipCheck, setCheck] = useState<"pending" | "ready">("pending");
  useEffect(() => {
    if (!user) { setCheck("pending"); return; }
    // Wait briefly for memberships to load, then decide
    const t = setTimeout(() => setCheck("ready"), 800);
    return () => clearTimeout(t);
  }, [user, memberships.length]);

  if (!isConfigured()) return <NotConfigured />;
  if (PUBLIC_PATHS.includes(path)) return <>{children}</>;
  if (loading) return <CenteredNote>Loading…</CenteredNote>;
  if (!user) return <Login />;
  if (membershipCheck === "pending" && memberships.length === 0) return <CenteredNote>Loading your record…</CenteredNote>;
  if (memberships.length === 0) return <FirstRun onBecomePatient={makeSelfPatient} email={user.email} />;
  return <>{children}</>;
}

function CenteredNote({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh flex items-center justify-center text-[var(--ink-soft)]">{children}</div>;
}

function NotConfigured() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <h1 className="display text-2xl mb-2">Not connected</h1>
        <p className="text-sm text-[var(--ink-soft)]">Supabase env vars are missing. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</p>
      </Card>
    </div>
  );
}

function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email) return;
    setBusy(true); setError(null);
    const r = await signIn(email);
    setBusy(false);
    if (r.error) setError(r.error);
    else setSent(true);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="flex justify-center mb-3">
          <img src="/logo.png" alt="Hairy but Handled" className="h-28 w-auto dark:hidden" />
          <img src="/logo-dark.png" alt="Hairy but Handled" className="h-28 w-auto hidden dark:block" />
        </div>
        <div className="brand-font text-center mb-6">
          <div className="text-[22px] font-light uppercase tracking-[0.25em]" style={{ letterSpacing: "0.25em" }}>
            <span style={{ color: "var(--primary)" }}>Hairy</span>{" "}
            <span style={{ color: "var(--accent)" }}>But</span>{" "}
            <span style={{ color: "var(--primary)" }}>Handled</span>
          </div>
          <div className="text-[12px] font-light uppercase tracking-[0.3em] text-[var(--ink-soft)] mt-1" style={{ letterSpacing: "0.3em" }}>
            Notice the Shifts. Act on the Flags.
          </div>
        </div>
        <Card>
          {sent ? (
            <div className="text-center space-y-2">
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-[var(--ink-soft)]">Tap the magic link we sent to <b>{email}</b> to sign in.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Your email">
                <TextInput type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              {error && <p className="text-sm text-[var(--alert)]">{error}</p>}
              <Submit onClick={submit} disabled={busy || !email}>{busy ? "Sending…" : "Send magic link"}</Submit>
              <p className="text-xs text-[var(--ink-soft)] text-center">We'll email you a one-tap link. No password.</p>
            </div>
          )}
        </Card>
        <a href="/ed-triggers" className="block mt-4 text-center text-sm text-[var(--alert)] font-medium">Urgent: red-flag list →</a>
      </div>
    </div>
  );
}

function FirstRun({ onBecomePatient, email }: { onBecomePatient: () => Promise<void>; email?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"choose" | "supporter" | "tone">("choose");
  const [toneChoice, setToneChoice] = useState<"positive" | "spicy" | "both">("both");

  const go = async () => {
    setMode("tone");
  };

  const finishSetup = async () => {
    setBusy(true); setError(null);
    try {
      await onBecomePatient();
      // Save tone preference to profile
      const sb = supabase();
      if (sb) {
        const uid = (await sb.auth.getUser()).data.user?.id;
        if (uid) {
          const { data: existing } = await sb.from("patient_profiles").select("data").eq("patient_id", uid).maybeSingle();
          const currentData = (existing?.data ?? {}) as Record<string, unknown>;
          await sb.from("patient_profiles").upsert({
            patient_id: uid,
            data: { ...currentData, tonePreference: toneChoice },
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  if (mode === "supporter") {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <Card className="max-w-md">
          <h1 className="display text-2xl mb-2">You've been invited?</h1>
          <p className="text-sm mb-3">
            For you to see the patient's record, <b>the patient</b> needs to invite your email from their own account:
          </p>
          <ol className="text-sm list-decimal pl-5 space-y-1 mb-4">
            <li>Ask them to open the app and sign in with their email</li>
            <li>They tap <b>Settings</b> (bottom nav)</li>
            <li>Under "Invite someone", they add your email <b>{email ? `(${email})` : ""}</b> as Support or Doctor</li>
            <li>Then you sign in again here — you'll join automatically</li>
          </ol>
          <button onClick={() => setMode("choose")} className="text-sm text-[var(--primary)] font-medium">← Back</button>
        </Card>
      </div>
    );
  }

  if (mode === "tone") {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <Card className="max-w-md">
          <h1 className="display text-2xl mb-2">Set your tone</h1>
          <p className="text-sm text-[var(--ink-soft)] mb-5">
            You'll see a daily affirmation throughout the app. What kind of energy do you want?
          </p>
          <div className="space-y-3 mb-5">
            <button
              onClick={() => setToneChoice("positive")}
              className={`w-full text-left rounded-2xl border-2 p-4 transition ${toneChoice === "positive" ? "border-[var(--primary)] bg-[var(--surface-soft)]" : "border-[var(--border)]"}`}
            >
              <div className="font-semibold">Positive only</div>
              <div className="text-sm text-[var(--ink-soft)] mt-0.5">Gentle, grounding, believable affirmations</div>
              <div className="text-xs italic text-[var(--ink-soft)] mt-2">"I am still me." "My life is still mine."</div>
            </button>
            <button
              onClick={() => setToneChoice("spicy")}
              className={`w-full text-left rounded-2xl border-2 p-4 transition ${toneChoice === "spicy" ? "border-[var(--purple)] bg-[var(--surface-soft)]" : "border-[var(--border)]"}`}
            >
              <div className="font-semibold">Spicy</div>
              <div className="text-sm text-[var(--ink-soft)] mt-0.5">Sarcastic, sweary, darkly funny, real</div>
              <div className="text-xs italic text-[var(--ink-soft)] mt-2">"Powered by Spite and Oncology" "This Is Bullshit Actually"</div>
            </button>
            <button
              onClick={() => setToneChoice("both")}
              className={`w-full text-left rounded-2xl border-2 p-4 transition ${toneChoice === "both" ? "border-[var(--pink)] bg-[var(--surface-soft)]" : "border-[var(--border)]"}`}
            >
              <div className="font-semibold">A bit of both</div>
              <div className="text-sm text-[var(--ink-soft)] mt-0.5">Mix of gentle, fierce, funny, and real</div>
              <div className="text-xs italic text-[var(--ink-soft)] mt-2">All of the above — whatever the day needs</div>
            </button>
          </div>
          {error && <p className="text-sm text-[var(--alert)] mb-3">{error}</p>}
          <Submit onClick={finishSetup} disabled={busy}>{busy ? "Setting up…" : "Let's go"}</Submit>
          <p className="text-xs text-[var(--ink-soft)] mt-3 text-center">You can change this later in Settings.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <Card className="max-w-md">
        <h1 className="display text-2xl mb-2">Welcome</h1>
        <p className="text-sm text-[var(--ink-soft)] mb-5">
          Which are you?
        </p>
        {error && <p className="text-sm text-[var(--alert)] mb-3">{error}</p>}
        <div className="space-y-3">
          <Submit onClick={go} disabled={busy}>{busy ? "Setting up…" : "I'm the patient"}</Submit>
          <button
            onClick={() => setMode("supporter")}
            className="w-full rounded-2xl border border-[var(--border)] font-medium py-4"
          >
            I'm support / family / a doctor
          </button>
        </div>
        <p className="text-xs text-[var(--ink-soft)] mt-5">
          You can change your mind later — a patient can remove themselves in Settings.
        </p>
      </Card>
    </div>
  );
}
