"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AddPatientPage() {
  const { user, refreshMemberships, setActivePatientId } = useSession();
  const router = useRouter();

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [verifyMethod, setVerifyMethod] = useState<"email" | "inperson">("email");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [fallbackCode, setFallbackCode] = useState<string | null>(null);
  const [sentMethod, setSentMethod] = useState<string>("");
  const [confirmToken, setConfirmToken] = useState<string>("");
  const [newPatientId, setNewPatientId] = useState<string | null>(null);
  const [setupDone, setSetupDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!patientName || !user) return;
    if (verifyMethod === "email" && !patientEmail) return;
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
        if (data.patientId) setNewPatientId(data.patientId);
        await refreshMemberships();
      } else {
        setError(data.error || "Verification failed");
      }
    } catch { setError("Verification failed"); }
    setBusy(false);
  };

  const goToNewPatient = async () => {
    await refreshMemberships();
    if (newPatientId) setActivePatientId(newPatientId);
    router.push("/profile");
  };

  return (
    <AppShell>
      <PageTitle sub="Create a new patient record and link yourself as their support person.">
        Add a patient
      </PageTitle>

      <Card>
        {setupDone ? (
          <div className="text-center space-y-4 py-2">
            <div className="text-[var(--primary)] font-semibold text-lg">Patient account created</div>
            <p className="text-sm text-[var(--ink-soft)]">
              <b>{patientName}</b> has been set up. You've been added as their support person.
              Fill in their profile next.
            </p>
            <Submit onClick={goToNewPatient}>Open their profile</Submit>
            <button
              onClick={() => router.push("/settings")}
              className="w-full text-sm text-[var(--ink-soft)]"
            >
              Back to settings
            </button>
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
                ? "A confirmation email with a \"Yes, I confirm\" button will be sent to the patient."
                : "A 6-digit code will appear on screen. Show it to the patient, then enter it here to confirm."}
            </p>
            {error && <p className="text-sm text-[var(--alert)]">{error}</p>}
            <Submit onClick={sendCode} disabled={busy || !patientName || (verifyMethod === "email" && !patientEmail)}>
              {busy ? "Sending…" : verifyMethod === "email" ? "Send verification email" : "Generate code"}
            </Submit>
            <button onClick={() => router.push("/settings")} className="w-full text-sm text-[var(--ink-soft)]">
              Cancel
            </button>
          </div>
        ) : sentMethod === "email" ? (
          <WaitingForEmailConfirm
            patientName={patientName}
            patientEmail={patientEmail}
            confirmToken={confirmToken}
            onConfirmed={async () => {
              setSetupDone(true);
              await refreshMemberships();
            }}
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
            <button
              onClick={() => { setCodeSent(false); setFallbackCode(null); setSentMethod(""); setError(null); }}
              className="w-full text-sm text-[var(--ink-soft)] mt-2"
            >
              Resend
            </button>
          </div>
        )}
      </Card>
    </AppShell>
  );
}

function WaitingForEmailConfirm({
  patientName,
  patientEmail,
  confirmToken,
  onConfirmed,
  onResend,
}: {
  patientName: string;
  patientEmail: string;
  confirmToken: string;
  onConfirmed: () => void;
  onResend: () => void;
}) {
  const [checking, setChecking] = useState(false);

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
      } catch {} finally {
        setChecking(false);
      }
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
          Ask <b>{patientName}</b> to check their email and tap <b>&quot;Yes, I confirm&quot;</b>.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-[var(--ink-soft)]">
        <div className={`w-2 h-2 rounded-full ${checking ? "bg-[var(--primary)] animate-pulse" : "bg-[var(--border)]"}`} />
        Waiting for confirmation...
      </div>

      <p className="text-xs text-[var(--ink-soft)] text-center">
        This page will update automatically when they confirm. You don&apos;t need to do anything else.
      </p>

      <button onClick={onResend} className="w-full text-sm text-[var(--ink-soft)] mt-2">
        Resend email
      </button>
    </div>
  );
}
