"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Profile = {
  name?: string;
  dob?: string;
  mrn?: string;
  hematologist?: string;
  hospital?: string;
  coordinator?: string;
  afterHours?: string;
  gp?: string;
  supportPerson?: string;
  supportPhone?: string;
  relationship?: string;
  diagnosis?: string;
  diagnosisDate?: string;
  brafResult?: string;
  spleen?: string;
  flowMarkers?: string;
  regimen?: string;
  drugs?: string;
  startDate?: string;
  allergies?: string;
  pastMedical?: string;
  baselineWeight?: string;
  baselineHeight?: string;
  baselineTemp?: string;
  baselineBP?: string;
  baselineHR?: string;
  mainIssues?: string;
  notes?: string;
};

export default function ProfilePage() {
  const { activePatientId, canWrite } = useSession();
  const sb = supabase();
  const router = useRouter();
  const [p, setP] = useState<Profile>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        if (data?.data) setP(data.data as Profile);
        setLoaded(true);
      });
  }, [sb, activePatientId]);

  const save = async () => {
    if (!sb || !activePatientId) return;
    setBusy(true); setSaved(false);
    const { error } = await sb.from("patient_profiles")
      .upsert({ patient_id: activePatientId, data: p, updated_at: new Date().toISOString() });
    setBusy(false);
    if (!error) { setSaved(true); setTimeout(() => router.push("/"), 600); }
  };

  const upd = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setP({ ...p, [k]: e.target.value });

  if (!loaded) return <AppShell><p className="text-[var(--ink-soft)]">Loading…</p></AppShell>;

  return (
    <AppShell>
      <PageTitle sub="Fill in whatever you know. You can come back and add more later.">
        Patient profile
      </PageTitle>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Identity</h2>
        <Field label="Name"><TextInput value={p.name ?? ""} onChange={upd("name")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of birth"><TextInput type="date" value={p.dob ?? ""} onChange={upd("dob")} /></Field>
          <Field label="MRN / hospital #"><TextInput value={p.mrn ?? ""} onChange={upd("mrn")} /></Field>
        </div>
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Care team</h2>
        <Field label="Treating hematologist"><TextInput value={p.hematologist ?? ""} onChange={upd("hematologist")} /></Field>
        <Field label="Hospital / unit"><TextInput value={p.hospital ?? ""} onChange={upd("hospital")} /></Field>
        <Field label="Cancer care coordinator"><TextInput value={p.coordinator ?? ""} onChange={upd("coordinator")} /></Field>
        <Field label="After-hours contact"><TextInput value={p.afterHours ?? ""} onChange={upd("afterHours")} /></Field>
        <Field label="GP (name + phone)"><TextInput value={p.gp ?? ""} onChange={upd("gp")} /></Field>
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Support person</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><TextInput value={p.supportPerson ?? ""} onChange={upd("supportPerson")} /></Field>
          <Field label="Phone"><TextInput type="tel" value={p.supportPhone ?? ""} onChange={upd("supportPhone")} /></Field>
        </div>
        <Field label="Relationship"><TextInput value={p.relationship ?? ""} onChange={upd("relationship")} /></Field>
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Diagnosis</h2>
        <Field label="Confirmed diagnosis"><TextInput value={p.diagnosis ?? ""} onChange={upd("diagnosis")} placeholder="e.g. Hairy cell leukemia" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date confirmed"><TextInput type="date" value={p.diagnosisDate ?? ""} onChange={upd("diagnosisDate")} /></Field>
          <Field label="BRAF V600E result"><TextInput value={p.brafResult ?? ""} onChange={upd("brafResult")} /></Field>
        </div>
        <Field label="Spleen status"><TextInput value={p.spleen ?? ""} onChange={upd("spleen")} placeholder="e.g. enlarged / not enlarged" /></Field>
        <Field label="Flow markers / molecular"><TextArea value={p.flowMarkers ?? ""} onChange={upd("flowMarkers")} /></Field>
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Treatment</h2>
        <Field label="Regimen name"><TextInput value={p.regimen ?? ""} onChange={upd("regimen")} placeholder="e.g. Rituximab + Cladribine" /></Field>
        <Field label="Drug names"><TextInput value={p.drugs ?? ""} onChange={upd("drugs")} /></Field>
        <Field label="Start date"><TextInput type="date" value={p.startDate ?? ""} onChange={upd("startDate")} /></Field>
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Medical history</h2>
        <Field label="Allergies"><TextArea value={p.allergies ?? ""} onChange={upd("allergies")} /></Field>
        <Field label="Key past medical issues"><TextArea value={p.pastMedical ?? ""} onChange={upd("pastMedical")} /></Field>
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Baseline (optional)</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (kg)"><TextInput type="number" step="0.1" value={p.baselineWeight ?? ""} onChange={upd("baselineWeight")} /></Field>
          <Field label="Height (cm)"><TextInput type="number" value={p.baselineHeight ?? ""} onChange={upd("baselineHeight")} /></Field>
          <Field label="Temp (°C)"><TextInput type="number" step="0.1" value={p.baselineTemp ?? ""} onChange={upd("baselineTemp")} /></Field>
          <Field label="BP"><TextInput value={p.baselineBP ?? ""} onChange={upd("baselineBP")} placeholder="120/80" /></Field>
        </div>
        <Field label="Main issues now"><TextArea value={p.mainIssues ?? ""} onChange={upd("mainIssues")} /></Field>
      </Card>

      <Card className="mb-6">
        <Field label="Anything else worth the team knowing"><TextArea value={p.notes ?? ""} onChange={upd("notes")} /></Field>
      </Card>

      {canWrite && (
        <>
          <Submit onClick={save} disabled={busy}>{busy ? "Saving…" : saved ? "Saved ✓" : "Save profile"}</Submit>
          <button onClick={() => router.push("/")} className="w-full mt-2 text-sm text-[var(--ink-soft)] py-2">Skip for now</button>
        </>
      )}
    </AppShell>
  );
}
