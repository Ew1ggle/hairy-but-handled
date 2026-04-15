"use client";
import { useSession } from "@/lib/session";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Submit, TextInput, Field, Card } from "./ui";
import { isConfigured } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

const PUBLIC_PATHS = ["/ed-triggers"]; // accessible without auth

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user, memberships, makeSelfPatient, activePatientId } = useSession();
  const path = usePathname();
  const [accepted, setAccepted] = useState(false);

  // On sign-in, claim any pending invites for this email
  useEffect(() => {
    const sb = supabase();
    if (!sb || !user || accepted) return;
    (async () => { try { await sb.rpc("accept_invites"); } catch {} setAccepted(true); })();
  }, [user, accepted]);

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
  if (memberships.length === 0) return <FirstRun onBecomePatient={makeSelfPatient} />;
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
        <h1 className="display text-3xl text-center">Hairy but Handled</h1>
        <p className="text-center text-[var(--ink-soft)] mt-1 mb-6">Notice the Shifts. Act on the Flags.</p>
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

function FirstRun({ onBecomePatient }: { onBecomePatient: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true); setError(null);
    try {
      await onBecomePatient();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <Card className="max-w-md">
        <h1 className="display text-2xl mb-2">Welcome</h1>
        <p className="text-sm text-[var(--ink-soft)] mb-4">
          Are you the patient? Setting this up as the patient gives you full control — you can then invite support people and doctors.
        </p>
        <p className="text-sm text-[var(--ink-soft)] mb-5">
          If a friend invited you, ask them to add your email in their Settings → Care circle. Then come back and sign in again.
        </p>
        {error && <p className="text-sm text-[var(--alert)] mb-3">{error}</p>}
        <Submit onClick={go} disabled={busy}>{busy ? "Setting up…" : "I'm the patient — set up my record"}</Submit>
      </Card>
    </div>
  );
}
