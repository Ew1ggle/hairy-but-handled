"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useUserProfile, type UserProfile } from "@/lib/useUserProfile";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";
import { HeartHandshake, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PatientLink = {
  patient_id: string;
  role: string;
  name?: string;
  preferredName?: string;
  diagnosis?: string;
  hospital?: string;
};

export default function MyProfile() {
  const { user, memberships, activePatientId, setActivePatientId } = useSession();
  const sb = supabase();
  const { profile, loaded, save } = useUserProfile();
  const [draft, setDraft] = useState<UserProfile>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved">("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [patients, setPatients] = useState<PatientLink[]>([]);
  useUnsavedWarning(dirty);

  useEffect(() => { if (loaded) setDraft(profile); }, [loaded, profile]);

  // Pull a mini-summary for each patient the user is linked to, so they can
  // see who they're supporting at a glance and jump into the right record.
  useEffect(() => {
    if (!sb || memberships.length === 0) { setPatients([]); return; }
    const ids = memberships.map((m) => m.patient_id);
    sb.from("patient_profiles").select("patient_id, data").in("patient_id", ids)
      .then(({ data }) => {
        const rows = (data as { patient_id: string; data: { name?: string; preferredName?: string; diagnosis?: string; hospital?: string } }[] | null) ?? [];
        const byId = new Map(rows.map((r) => [r.patient_id, r.data]));
        setPatients(memberships.map((m) => {
          const d = byId.get(m.patient_id) ?? {};
          return { patient_id: m.patient_id, role: m.role, name: d.name, preferredName: d.preferredName, diagnosis: d.diagnosis, hospital: d.hospital };
        }));
      });
  }, [sb, memberships]);

  const update = <K extends keyof UserProfile>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft({ ...draft, [k]: e.target.value as UserProfile[K] });
      setDirty(true);
    };

  const persist = useCallback(async () => {
    const ok = await save(draft);
    return ok;
  }, [draft, save]);

  // Debounced autosave — matches /profile's pattern so edits survive without
  // a save button tap on mobile.
  useEffect(() => {
    if (!dirty || !loaded) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      const ok = await persist();
      if (ok) {
        setDirty(false);
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus(""), 2000);
      } else {
        setAutoSaveStatus("");
      }
    }, 2500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [dirty, loaded, persist]);

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setBusy(true);
    const ok = await persist();
    setBusy(false);
    if (ok) setDirty(false);
  };

  const supportOfCount = useMemo(
    () => patients.filter((p) => p.role === "support" || p.role === "doctor").length,
    [patients],
  );

  return (
    <AppShell>
      <PageTitle
        sub={
          supportOfCount > 0
            ? `You're supporting ${supportOfCount} ${supportOfCount === 1 ? "person" : "people"}.`
            : "Your details and contact preferences."
        }
      >
        My profile
      </PageTitle>

      <Card className="mb-4">
        <div className="text-sm">
          Signed in as <b>{user?.email}</b>
        </div>
        {autoSaveStatus === "saving" && <div className="text-xs text-[var(--ink-soft)] mt-1">Saving…</div>}
        {autoSaveStatus === "saved" && <div className="text-xs text-[var(--primary)] mt-1">Saved</div>}
      </Card>

      {/* My details */}
      <Card className="mb-4">
        <h3 className="font-semibold mb-3">About you</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <TextInput value={draft.name ?? ""} onChange={update("name")} placeholder="Sam Jones" />
          </Field>
          <Field label="Preferred name">
            <TextInput value={draft.preferredName ?? ""} onChange={update("preferredName")} placeholder="Sam" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Phone">
            <TextInput type="tel" value={draft.phone ?? ""} onChange={update("phone")} />
          </Field>
          <Field label="Pronouns">
            <TextInput value={draft.pronouns ?? ""} onChange={update("pronouns")} placeholder="she/her" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Default relationship" hint="How most people would describe your link (e.g. Mother, Partner, Friend, Carer)">
            <TextInput value={draft.relationshipDefault ?? ""} onChange={update("relationshipDefault")} />
          </Field>
        </div>
      </Card>

      {/* What supporters/patients should know about me */}
      <Card className="mb-4">
        <h3 className="font-semibold mb-1">How to reach you</h3>
        <p className="text-xs text-[var(--ink-soft)] mb-3">
          Useful for the patient and others in the care circle if something comes up.
        </p>
        <Field label="Best way to contact you" hint="E.g. Text first, then call. Available after 6pm weekdays.">
          <TextArea value={draft.howToReach ?? ""} onChange={update("howToReach")} rows={3} />
        </Field>
        <div className="mt-3">
          <Field label="What do you want the team to tell you?" hint="E.g. All tripwires, only ED visits, nothing while I'm overseas until I'm back.">
            <TextArea value={draft.whatToTellMe ?? ""} onChange={update("whatToTellMe")} rows={3} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Notes for other supporters" hint="Things you'd want another person in the circle to know.">
            <TextArea value={draft.notesForSupporters ?? ""} onChange={update("notesForSupporters")} rows={3} />
          </Field>
        </div>
      </Card>

      {/* Patients they support */}
      <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mt-2 mb-2">
        People you're supporting
      </h2>
      {patients.length === 0 ? (
        <Card className="mb-4">
          <p className="text-sm text-[var(--ink-soft)]">
            You haven't been added to any care circles yet. When a patient sends you an invite, they'll show up here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2 mb-6">
          {patients.map((p) => {
            const isActive = p.patient_id === activePatientId;
            const displayName = p.preferredName?.trim() || p.name?.trim() || "Patient";
            return (
              <Card key={p.patient_id} className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActivePatientId(p.patient_id)}
                  className="flex-1 min-w-0 text-left active:scale-[0.99] transition"
                >
                  <div className="flex items-center gap-2">
                    <HeartHandshake size={14} className="text-[var(--pink)] shrink-0" />
                    <div className="text-sm font-medium truncate">{displayName}</div>
                    {isActive && (
                      <span className="text-[10px] uppercase tracking-wider text-[var(--primary)] font-semibold">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] truncate">
                    {p.role === "support" ? "Support" : p.role === "doctor" ? "Doctor" : p.role}
                    {p.diagnosis ? ` · ${p.diagnosis}` : ""}
                    {p.hospital ? ` · ${p.hospital}` : ""}
                  </div>
                </button>
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => setActivePatientId(p.patient_id)}
                    className="text-xs text-[var(--primary)] font-medium shrink-0"
                  >
                    Switch
                  </button>
                )}
              </Card>
            );
          })}
          <Link
            href="/care"
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm active:scale-[0.99] transition"
          >
            <span className="inline-flex items-center gap-2">
              <Users size={14} className="text-[var(--pink)]" />
              Manage the active patient's care circle
            </span>
            <span className="text-[var(--ink-soft)]">→</span>
          </Link>
        </div>
      )}

      <div className="flex gap-2 mt-6">
        <Submit onClick={handleSave} disabled={busy || !dirty}>
          {busy ? "Saving…" : dirty ? "Save" : "Saved"}
        </Submit>
      </div>
    </AppShell>
  );
}
