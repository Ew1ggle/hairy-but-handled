"use client";
import { useSession } from "@/lib/session";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Submit, TextInput, Field, Card } from "./ui";
import { isConfigured } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

const PUBLIC_PATHS = ["/ed-triggers", "/privacy", "/terms", "/demo"]; // accessible without auth
const CONSENT_VERSION = "1.0";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user, memberships, makeSelfPatient, activePatientId, role, demoMode, refreshMemberships } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  // On sign-in, claim any pending invites for this email, then refresh
  // memberships before anything decides whether to show FirstRun — otherwise
  // an invitee would see "who are you?" and could accidentally create a
  // self-patient account instead of being routed to the circle they were
  // invited into.
  useEffect(() => {
    const sb = supabase();
    if (!sb || !user || accepted) return;
    (async () => {
      try { await sb.rpc("accept_invites"); } catch {}
      try { await refreshMemberships(); } catch {}
      setAccepted(true);
    })();
  }, [user, accepted, refreshMemberships]);

  const [needsRenewal, setNeedsRenewal] = useState(false);

  // Check if user has given consent — only re-prompt every 30 days
  useEffect(() => {
    const sb = supabase();
    if (!sb || !user || consentChecked) return;
    (async () => {
      const { data } = await sb.from("consent_records")
        .select("id, consented_at")
        .eq("user_id", user.id)
        .eq("consent_type", "data_collection")
        .eq("consent_version", CONSENT_VERSION)
        .maybeSingle();
      if (data) {
        setHasConsent(true);
        // Check if 30 days have passed since last consent
        const consentDate = new Date(data.consented_at);
        const daysSince = Math.floor((Date.now() - consentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 30) {
          setNeedsRenewal(true);
        }
      }
      setConsentChecked(true);
    })();
  }, [user, consentChecked]);

  // For patient or support: redirect to /profile on first load if no profile yet
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId || !role || role === "doctor" || profileChecked) return;
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
    const t = setTimeout(() => setCheck("ready"), 800);
    return () => clearTimeout(t);
  }, [user, memberships.length]);

  if (demoMode) return <>{children}</>;
  if (!isConfigured()) return <NotConfigured />;
  if (PUBLIC_PATHS.includes(path)) return <>{children}</>;
  if (loading) return <CenteredNote>Loading…</CenteredNote>;
  if (!user) return <Login />;
  if (consentChecked && !hasConsent && memberships.length > 0) return <ConsentGate userId={user.id} onConsented={() => { setHasConsent(true); setNeedsRenewal(false); }} />;
  if (consentChecked && hasConsent && needsRenewal) return <ConsentRenewal userId={user.id} onConfirmed={() => setNeedsRenewal(false)} />;
  if (!accepted) return <CenteredNote>Loading your record…</CenteredNote>;
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
        <div className="flex justify-center gap-4 mt-3 text-xs text-[var(--ink-soft)]">
          <a href="/privacy" className="underline">Privacy Policy</a>
          <a href="/terms" className="underline">Terms of Service</a>
          <a href="/demo" className="underline">View demo</a>
        </div>
      </div>
    </div>
  );
}

function FirstRun({ onBecomePatient, email }: { onBecomePatient: () => Promise<void>; email?: string | null }) {
  const { user, refreshMemberships } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"choose" | "supporter" | "setup-patient" | "tone">("choose");
  const [toneChoice, setToneChoice] = useState<"positive" | "spicy" | "both">("both");

  // Setup patient state
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [verifyMethod, setVerifyMethod] = useState<"email" | "inperson">("email");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [fallbackCode, setFallbackCode] = useState<string | null>(null);
  const [sentMethod, setSentMethod] = useState<string>("");
  const [confirmToken, setConfirmToken] = useState<string>("");
  const [setupDone, setSetupDone] = useState(false);

  const go = async () => {
    setMode("tone");
  };

  const sendCode = async () => {
    if (!patientName || !user) return;
    if (verifyMethod === "email" && !patientEmail) return;
    if (
      verifyMethod === "email" &&
      user.email &&
      patientEmail.trim().toLowerCase() === user.email.toLowerCase()
    ) {
      setError("That's your own email. Please enter the patient's email, not yours.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          phone: patientPhone || undefined,
          patientEmail: verifyMethod === "email" ? patientEmail : undefined,
          patientName,
          supportUserId: user.id,
          method: verifyMethod === "email" ? "email" : "inperson",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCodeSent(true);
        setSentMethod(data.method || "");
        if (data.token) setConfirmToken(data.token);
        if (data.fallback) setFallbackCode(data.code);
      } else {
        setError(data.error || "Failed to send code");
      }
    } catch { setError("Failed to send code"); }
    setBusy(false);
  };

  const verifyCode = async () => {
    if (!verificationCode) return;
    setBusy(true); setError(null);
    const key = verifyMethod === "email" ? patientEmail : patientPhone;
    try {
      const res = await fetch("/api/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: verifyMethod !== "email" ? key : undefined, patientEmail: verifyMethod === "email" ? key : undefined, code: verificationCode }),
      });
      const data = await res.json();
      if (data.ok) {
        setSetupDone(true);
        await refreshMemberships();
      } else {
        setError(data.error || "Verification failed");
      }
    } catch { setError("Verification failed"); }
    setBusy(false);
  };

  const finishSetup = async () => {
    setBusy(true); setError(null);
    try {
      await onBecomePatient();
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

  if (mode === "setup-patient") {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="flex justify-center mb-4">
            <img src="/logo-box.png" alt="" className="h-14 w-auto" />
          </div>
          <Card>
            <h1 className="display text-2xl mb-2">Set up a patient</h1>
            <p className="text-sm text-[var(--ink-soft)] mb-4">
              You're setting up the app on behalf of someone who needs care.
              We'll send a code to their phone so they can confirm.
            </p>

            {setupDone ? (
              <div className="text-center space-y-3">
                <div className="text-[var(--primary)] font-semibold text-lg">Patient account created</div>
                <p className="text-sm text-[var(--ink-soft)]">
                  <b>{patientName}</b> has been set up. You've been added as their support person.
                  You can now fill in their profile.
                </p>
                <Submit onClick={() => window.location.reload()}>Continue to the app</Submit>
              </div>
            ) : !codeSent ? (
              <div className="space-y-4">
                <Field label="Patient's name">
                  <TextInput value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Their full name" />
                </Field>

                <div>
                  <div className="text-sm font-medium mb-2">How should we verify with the patient?</div>
                  <div className="flex gap-2">
                    <button onClick={() => setVerifyMethod("email")}
                      className={`flex-1 rounded-xl px-3 py-2.5 text-sm border font-medium ${verifyMethod === "email" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                      Send email
                    </button>
                    <button onClick={() => setVerifyMethod("inperson")}
                      className={`flex-1 rounded-xl px-3 py-2.5 text-sm border font-medium ${verifyMethod === "inperson" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                      I'm with them
                    </button>
                  </div>
                </div>

                {verifyMethod === "email" && (
                  <Field label="Patient's email address">
                    <TextInput type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="patient@example.com" />
                  </Field>
                )}

                <p className="text-xs text-[var(--ink-soft)]">
                  {verifyMethod === "email"
                    ? "A verification code will be emailed to the patient. They need to share it with you to confirm they consent."
                    : "A verification code will appear on screen. Show it to the patient and they confirm it to consent."}
                </p>
                {error && <p className="text-sm text-[var(--alert)]">{error}</p>}
                <Submit onClick={sendCode} disabled={busy || !patientName || (verifyMethod === "email" && !patientEmail)}>
                  {busy ? "Sending…" : verifyMethod === "email" ? "Send verification email" : "Generate code"}
                </Submit>
                <button onClick={() => setMode("choose")} className="w-full text-sm text-[var(--primary)] font-medium mt-2">← Back</button>
              </div>
            ) : sentMethod === "email" ? (
              <WaitingForConfirmation
                patientName={patientName}
                patientEmail={patientEmail}
                confirmToken={confirmToken}
                onConfirmed={async () => { setSetupDone(true); await refreshMemberships(); }}
                onResend={() => { setCodeSent(false); setConfirmToken(""); setSentMethod(""); setError(null); }}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm">
                  Show this code to <b>{patientName}</b> and ask them to confirm.
                </p>
                {fallbackCode && (
                  <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
                    <div className="text-xs text-[var(--ink-soft)] mb-1">Show this code to the patient for confirmation:</div>
                    <div className="text-3xl font-bold tracking-[0.2em] text-[var(--primary)]">{fallbackCode}</div>
                  </div>
                )}
                <Field label="Enter the 6-digit code">
                  <TextInput
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.3em]"
                  />
                </Field>
                {error && <p className="text-sm text-[var(--alert)]">{error}</p>}
                <Submit onClick={verifyCode} disabled={busy || verificationCode.length !== 6}>
                  {busy ? "Verifying…" : "Verify and create account"}
                </Submit>
                <button onClick={() => { setCodeSent(false); setFallbackCode(null); setSentMethod(""); setError(null); }} className="w-full text-sm text-[var(--ink-soft)] mt-2">
                  Resend
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (mode === "supporter") {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <Card className="max-w-md">
          <h1 className="display text-2xl mb-2">Two ways in</h1>

          <div className="rounded-xl border border-[var(--border)] p-3 mb-4">
            <div className="font-semibold text-sm mb-1">The patient already has an account</div>
            <p className="text-sm mb-2">
              Ask them to invite you from their own account:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              <li>They sign in with their email</li>
              <li>They tap <b>Settings</b> (bottom nav)</li>
              <li>Under "Invite someone", they add your email <b>{email ? `(${email})` : ""}</b> as Support or Doctor</li>
              <li>Then you sign in again here — you'll join automatically</li>
            </ol>
          </div>

          <div className="rounded-xl border border-[var(--primary)] bg-[var(--surface-soft)] p-3 mb-4">
            <div className="font-semibold text-sm mb-1">You're setting the app up for them</div>
            <p className="text-sm mb-3">
              Create the patient's record yourself. We'll ask them to confirm by email or
              with a code in person, then link you as their support person.
            </p>
            <Submit onClick={() => setMode("setup-patient")}>Set up a patient</Submit>
          </div>

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
          <button
            onClick={() => setMode("setup-patient")}
            className="w-full rounded-2xl border border-[var(--border)] font-medium py-4"
          >
            I'm setting up for someone else
          </button>
        </div>
        <p className="text-xs text-[var(--ink-soft)] mt-5">
          You can change your mind later — a patient can remove themselves in Settings.
        </p>
      </Card>
    </div>
  );
}

function ConsentGate({ userId, onConsented }: { userId: string; onConsented: () => void }) {
  const [agreed, setAgreed] = useState({ notMedical: false, privacy: false, terms: false, collection: false, sharing: false, crossBorder: false });
  const [busy, setBusy] = useState(false);
  const allAgreed = agreed.notMedical && agreed.privacy && agreed.terms && agreed.collection && agreed.sharing && agreed.crossBorder;

  const submit = async () => {
    const sb = supabase();
    if (!sb) return;
    setBusy(true);
    const types = ["privacy_policy", "terms_of_service", "data_collection", "care_circle_sharing", "cross_border"] as const;
    for (const t of types) {
      await sb.from("consent_records").upsert({
        user_id: userId,
        consent_type: t,
        consent_version: CONSENT_VERSION,
        consented_at: new Date().toISOString(),
      }, { onConflict: "user_id,consent_type,consent_version" });
    }
    setBusy(false);
    onConsented();
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="flex justify-center mb-4">
          <img src="/logo-box.png" alt="" className="h-16 w-auto" />
        </div>
        <Card>
          <h1 className="display text-2xl mb-2">Before we begin</h1>
          <p className="text-sm text-[var(--ink-soft)] mb-4">
            Hairy but Handled collects sensitive health information to help you track your cancer care.
            Please review and agree to the following before continuing.
          </p>

          <div className="rounded-xl bg-[var(--surface-soft)] p-4 mb-4 text-sm space-y-3">
            <div className="font-semibold">What we collect</div>
            <ul className="text-[var(--ink-soft)] space-y-1 text-xs">
              <li>Your name, date of birth, and contact details</li>
              <li>Medicare number and private health fund details</li>
              <li>Diagnosis, treatment, medications, blood results, and symptoms</li>
              <li>Hospital admissions, ED visits, and medical reports (photos/PDFs)</li>
              <li>Gender identity and advance care directive preferences</li>
            </ul>
            <div className="font-semibold mt-3">How it is stored</div>
            <p className="text-[var(--ink-soft)] text-xs">
              Your data is stored securely on cloud infrastructure in Sydney, Australia (AWS ap-southeast-2)
              operated by Supabase Inc. (USA) and served via Vercel Inc. (USA). While data is stored in Australia,
              these US-headquartered companies may have operational access.
            </p>
            <div className="font-semibold mt-3">Who can see it</div>
            <p className="text-[var(--ink-soft)] text-xs">
              Only you and the people you invite to your care circle (support people and doctors) can see your data.
              No one else has access. You control who is in your care circle at all times.
            </p>
          </div>

          <div className="space-y-3 mb-5">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 shrink-0" checked={agreed.notMedical} onChange={(e) => setAgreed({ ...agreed, notMedical: e.target.checked })} />
              <span>I understand that this app is <b>not a source of medical advice</b>, diagnosis, or treatment. Red flags and recommendations are indicators only. I will always contact my care team or call 000 if I am concerned, and will not delay seeking help based on what the app does or does not flag.</span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 shrink-0" checked={agreed.privacy} onChange={(e) => setAgreed({ ...agreed, privacy: e.target.checked })} />
              <span>I have read and agree to the <a href="/privacy" target="_blank" className="text-[var(--primary)] underline">Privacy Policy</a></span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 shrink-0" checked={agreed.terms} onChange={(e) => setAgreed({ ...agreed, terms: e.target.checked })} />
              <span>I have read and agree to the <a href="/terms" target="_blank" className="text-[var(--primary)] underline">Terms of Service</a></span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 shrink-0" checked={agreed.collection} onChange={(e) => setAgreed({ ...agreed, collection: e.target.checked })} />
              <span>I consent to the collection and storage of my health and personal information as described above</span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 shrink-0" checked={agreed.sharing} onChange={(e) => setAgreed({ ...agreed, sharing: e.target.checked })} />
              <span>I understand that people I invite to my care circle will be able to view and (for support roles) edit my health data</span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 w-4 h-4 shrink-0" checked={agreed.crossBorder} onChange={(e) => setAgreed({ ...agreed, crossBorder: e.target.checked })} />
              <span>I consent to my data being processed by US-headquartered cloud providers (Supabase, Vercel) with data stored in Australia</span>
            </label>
          </div>

          <Submit onClick={submit} disabled={!allAgreed || busy}>{busy ? "Saving…" : "I agree — continue"}</Submit>

          <p className="text-xs text-[var(--ink-soft)] mt-3 text-center">
            You can withdraw consent and delete your data at any time in Settings.
          </p>
        </Card>
      </div>
    </div>
  );
}

function WaitingForConfirmation({ patientName, patientEmail, confirmToken, onConfirmed, onResend }: {
  patientName: string; patientEmail: string; confirmToken: string;
  onConfirmed: () => void; onResend: () => void;
}) {
  const [checking, setChecking] = useState(false);

  // Poll every 3 seconds to check if patient clicked confirm
  useEffect(() => {
    if (!confirmToken) return;
    const interval = setInterval(async () => {
      try {
        setChecking(true);
        const res = await fetch("/api/verify-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check", code: confirmToken }),
        });
        const data = await res.json();
        if (data.confirmed) {
          clearInterval(interval);
          onConfirmed();
        }
      } catch {} finally { setChecking(false); }
    }, 3000);
    return () => clearInterval(interval);
  }, [confirmToken, onConfirmed]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[var(--surface-soft)] p-4 text-center">
        <div className="text-2xl mb-3">📧</div>
        <div className="font-semibold text-sm mb-1">Confirmation email sent</div>
        <p className="text-sm text-[var(--ink-soft)]">
          We've emailed <b>{patientEmail}</b> with a confirmation button.
        </p>
        <p className="text-sm text-[var(--ink-soft)] mt-2">
          Ask <b>{patientName}</b> to check their email and tap <b>"Yes, I confirm"</b>.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-[var(--ink-soft)]">
        <div className={`w-2 h-2 rounded-full ${checking ? "bg-[var(--primary)] animate-pulse" : "bg-[var(--border)]"}`} />
        Waiting for confirmation...
      </div>

      <p className="text-xs text-[var(--ink-soft)] text-center">
        This page will update automatically when they confirm. You don't need to do anything else.
      </p>

      <button onClick={onResend} className="w-full text-sm text-[var(--ink-soft)] mt-2">
        Resend email
      </button>
    </div>
  );
}

function ConsentRenewal({ userId, onConfirmed }: { userId: string; onConfirmed: () => void }) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    const sb = supabase();
    if (!sb) return;
    setBusy(true);
    // Update the consent timestamp to now
    const types = ["privacy_policy", "terms_of_service", "data_collection", "care_circle_sharing", "cross_border"] as const;
    for (const t of types) {
      await sb.from("consent_records").upsert({
        user_id: userId,
        consent_type: t,
        consent_version: CONSENT_VERSION,
        consented_at: new Date().toISOString(),
      }, { onConflict: "user_id,consent_type,consent_version" });
    }
    setBusy(false);
    onConfirmed();
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="flex justify-center mb-4">
          <img src="/logo-box.png" alt="" className="h-16 w-auto" />
        </div>
        <Card>
          <h1 className="display text-2xl mb-2">Privacy check-in</h1>
          <p className="text-sm text-[var(--ink-soft)] mb-4">
            It's been 30 days since you last confirmed your privacy settings.
            Just a quick check to make sure you're still comfortable with how your data is handled.
          </p>

          <div className="rounded-xl bg-[var(--surface-soft)] p-3 mb-4 text-sm space-y-2">
            <p>Your data is still:</p>
            <ul className="text-xs text-[var(--ink-soft)] space-y-1 pl-4 list-disc">
              <li>Stored securely in Sydney, Australia</li>
              <li>Visible only to you and your care circle</li>
              <li>Processed by Supabase (USA) and Vercel (USA) under their data processing agreements</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Submit onClick={confirm} disabled={busy}>
              {busy ? "Confirming…" : "All good — continue"}
            </Submit>
            <div className="flex gap-3 justify-center text-xs text-[var(--ink-soft)]">
              <a href="/privacy" className="underline">Review privacy policy</a>
              <a href="/settings" className="underline">Manage settings</a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
