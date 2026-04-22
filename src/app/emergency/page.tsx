"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, TextArea, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { useEntries, type Admission } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { AlertTriangle, Plus, Trash2, Phone, Clock, Building2, UserCheck, Droplet, Dog, UserX, ShieldAlert, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { usePatientName } from "@/lib/usePatientName";
import { FileUpload, type Attachment } from "@/components/FileUpload";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";

const TREATMENT_OPTIONS = [
  "Blood Cultures",
  "Complete Blood Count",
  "Kidney and Liver Tests",
  "Lactate",
  "Urine Testing",
  "Chest Xray",
  "Antibiotics (Oral)",
  "Antibiotics (IV)",
  "Red Blood Cell Transfusion",
  "Platelet Transfusion",
  "Neutrophil-stimulating injection",
  "Splenectomy",
  "Admission",
  "Other [please specify]",
];

const ED_PRESENTATIONS = [
  "Active Fever",
  "Suspected Infection",
  "Anaemia",
  "Bleeding",
  "Low Neutrophils",
  "Active Controlled Infection",
  "Active Uncontrolled Infection",
  "Spleen Issues",
  "Other [Please specify]",
];

type TreatmentRow = { id: string; treatment: string; details: string };

export default function EmergencyPage() {
  const { addEntry, activePatientId } = useSession();
  const sb = supabase();

  // Patient info for quick reference
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [regimen, setRegimen] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as Record<string, unknown> | undefined;
        if (!p) return;
        setPatientName((p.name as string) ?? "");
        const dx = p.diagnosis === "Other" ? (p.diagnosisOther as string) ?? "" : (p.diagnosis as string) ?? "";
        setDiagnosis(dx);
        const rx = p.regimen === "Other" ? (p.regimenOther as string) ?? "" : (p.regimen as string) ?? "";
        setRegimen(rx);
        const al = (p.allergies as { name?: string }[]) ?? [];
        setAllergies(al.map((a) => a.name ?? "").filter(Boolean));
      });
  }, [sb, activePatientId]);

  // ED log state
  const { firstName, isSupport } = usePatientName();

  const [arrivalTime, setArrivalTime] = useState(format(new Date(), "HH:mm"));
  const [hospital, setHospital] = useState("");
  const [presentation, setPresentation] = useState("");
  const [presentationOther, setPresentationOther] = useState("");
  const [doctors, setDoctors] = useState<string[]>([""]);
  const [nurses, setNurses] = useState<string[]>([""]);
  const [treatments, setTreatments] = useState<TreatmentRow[]>([]);
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saved, setSaved] = useState(false);

  const { clear: clearDraft } = useDraft<{
    arrivalTime: string; hospital: string; presentation: string; presentationOther: string;
    doctors: string[]; nurses: string[]; treatments: TreatmentRow[]; notes: string;
  }>({
    key: "/emergency/new",
    href: "/emergency",
    title: "ED visit",
    patientId: activePatientId,
    enabled: !saved,
    state: { arrivalTime, hospital, presentation, presentationOther, doctors, nurses, treatments, notes },
    onRestore: (d) => {
      if (d.arrivalTime) setArrivalTime(d.arrivalTime);
      if (d.hospital) setHospital(d.hospital);
      if (d.presentation) setPresentation(d.presentation);
      if (d.presentationOther) setPresentationOther(d.presentationOther);
      if (d.doctors?.length) setDoctors(d.doctors);
      if (d.nurses?.length) setNurses(d.nurses);
      if (d.treatments?.length) setTreatments(d.treatments);
      if (d.notes) setNotes(d.notes);
    },
  });

  const filteredTreatments = treatmentSearch
    ? TREATMENT_OPTIONS.filter((t) => t.toLowerCase().includes(treatmentSearch.toLowerCase()))
    : TREATMENT_OPTIONS;

  const addTreatment = (name: string) => {
    if (treatments.some((t) => t.treatment === name)) return;
    setTreatments([...treatments, { id: crypto.randomUUID(), treatment: name, details: "" }]);
    setTreatmentSearch("");
  };

  const saveAsAdmission = async () => {
    await addEntry({
      kind: "admission",
      admissionDate: format(new Date(), "yyyy-MM-dd"),
      hospital,
      reason: `ED presentation: ${presentation}${presentation === "Other [Please specify]" ? ` - ${presentationOther}` : ""}`,
      treatments,
      attachments,
      notes: [
        `Arrival: ${arrivalTime}`,
        doctors.filter(Boolean).length > 0 ? `Doctors: ${doctors.filter(Boolean).join(", ")}` : "",
        nurses.filter(Boolean).length > 0 ? `Nurses: ${nurses.filter(Boolean).join(", ")}` : "",
        notes,
      ].filter(Boolean).join("\n"),
    } as Omit<Admission, "id" | "createdAt">);

    // Also log a flag event
    await addEntry({
      kind: "flag",
      triggerLabel: `ED visit: ${presentation}${presentation === "Other [Please specify]" ? ` - ${presentationOther}` : ""}`,
      wentToED: true,
    } as unknown as Omit<Admission, "id" | "createdAt">);

    clearDraft();
    setSaved(true);
  };

  return (
    <AppShell>
      <MedicalDisclaimerBanner />

      {/* Big red header */}
      <div className="rounded-2xl bg-[var(--alert)] text-white p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle size={32} />
          <h1 className="text-2xl font-extrabold uppercase tracking-wide">{isSupport ? `${firstName} is at Emergency` : "I am at Emergency"}</h1>
        </div>
        <p className="text-sm opacity-90">{isSupport ? `Log ${firstName}'s ED visit here.` : "Log your ED visit here."} This information will be saved to the admissions record and daily log.</p>
      </div>

      {/* Situational protocol shortcuts */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert size={16} className="text-[var(--primary)]" />
          <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold">Quick protocols</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { slug: "fever", label: "Fever / deterioration", icon: Flag },
            { slug: "hospital-trip", label: "Hospital trip PPE", icon: Building2 },
            { slug: "body-fluid-spill", label: "Body-fluid spill", icon: Droplet },
            { slug: "outsider-visit", label: "Outsider in house", icon: UserX },
            { slug: "pet-accident", label: "Pet accident", icon: Dog },
          ] as const).map(({ slug, label, icon: Icon }) => (
            <a
              key={slug}
              href={`/home#${slug}`}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm active:bg-[var(--surface-soft)]"
            >
              <Icon size={16} className="text-[var(--primary)] shrink-0" />
              <span className="flex-1">{label}</span>
            </a>
          ))}
        </div>
      </Card>

      {/* Quick patient reference card for ED staff */}
      <Card className="mb-4 border-[var(--primary)]">
        <div className="text-xs uppercase tracking-widest text-[var(--primary)] font-semibold mb-2">Patient reference</div>
        <div className="text-sm space-y-1">
          {patientName && <div><b>Name:</b> {patientName}</div>}
          {diagnosis && <div><b>Diagnosis:</b> {diagnosis}</div>}
          {regimen && <div><b>Current regimen:</b> {regimen}</div>}
          {allergies.length > 0 && (
            <div className="text-[var(--alert)] font-semibold">Allergies: {allergies.join(", ")}</div>
          )}
        </div>
      </Card>

      {saved ? (
        <Card className="text-center py-8">
          <div className="text-[var(--primary)] font-semibold text-lg mb-2">ED visit recorded</div>
          <p className="text-sm text-[var(--ink-soft)] mb-4">Saved to your admissions and flagged in your daily log.</p>
          <a href="/admissions" className="inline-block rounded-xl bg-[var(--primary)] text-white px-6 py-3 font-medium">
            View admissions
          </a>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Time & Hospital */}
          <Card className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="Arrival time">
                  <TextInput type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
                </Field>
              </div>
            </div>
            <Field label="Hospital">
              <TextInput value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Which emergency department?" />
            </Field>
          </Card>

          {/* Presentation */}
          <Card className="space-y-3">
            <div className="text-sm font-medium">Presentation</div>
            <div className="flex flex-wrap gap-2">
              {ED_PRESENTATIONS.map((p) => {
                const on = presentation === p;
                return (
                  <button key={p} type="button" onClick={() => setPresentation(on ? "" : p)}
                    className={`rounded-xl px-3 py-2 text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
            {presentation === "Other [Please specify]" && (
              <TextInput value={presentationOther} onChange={(e) => setPresentationOther(e.target.value)} placeholder="Please specify" />
            )}
          </Card>

          {/* Staff */}
          <Card className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Treating doctor(s)</span>
                <button type="button" onClick={() => setDoctors([...doctors, ""])} className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium">
                  <Plus size={14} /> Add
                </button>
              </div>
              {doctors.map((d, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <TextInput value={d} onChange={(e) => { const arr = [...doctors]; arr[i] = e.target.value; setDoctors(arr); }} placeholder="Doctor name" />
                  {doctors.length > 1 && (
                    <button type="button" onClick={() => setDoctors(doctors.filter((_, idx) => idx !== i))} className="text-[var(--ink-soft)] p-2">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Treating nurse(s)</span>
                <button type="button" onClick={() => setNurses([...nurses, ""])} className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium">
                  <Plus size={14} /> Add
                </button>
              </div>
              {nurses.map((n, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <TextInput value={n} onChange={(e) => { const arr = [...nurses]; arr[i] = e.target.value; setNurses(arr); }} placeholder="Nurse name" />
                  {nurses.length > 1 && (
                    <button type="button" onClick={() => setNurses(nurses.filter((_, idx) => idx !== i))} className="text-[var(--ink-soft)] p-2">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Treatments */}
          <Card className="space-y-3">
            <div className="text-sm font-medium">Treatments / investigations</div>
            <div className="relative">
              <TextInput
                value={treatmentSearch}
                onChange={(e) => setTreatmentSearch(e.target.value)}
                placeholder="Search treatments to add..."
              />
              {treatmentSearch && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-auto">
                  {filteredTreatments.map((t) => (
                    <button key={t} type="button" onClick={() => addTreatment(t)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-soft)] border-b border-[var(--border)] last:border-0">
                      {t}
                    </button>
                  ))}
                  {filteredTreatments.length === 0 && (
                    <div className="px-3 py-2 text-sm text-[var(--ink-soft)]">No matches</div>
                  )}
                </div>
              )}
            </div>
            {treatments.length > 0 && (
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--surface-soft)] border-b border-[var(--border)]">
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-[var(--ink-soft)]">Treatment</th>
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-[var(--ink-soft)]">Details</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.map((t) => (
                      <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-2 font-medium">{t.treatment}</td>
                        <td className="px-3 py-1">
                          <input type="text" value={t.details}
                            onChange={(e) => setTreatments(treatments.map((x) => x.id === t.id ? { ...x, details: e.target.value } : x))}
                            placeholder="Additional details" className="w-full bg-transparent py-1 text-sm focus:outline-none" />
                        </td>
                        <td className="px-2">
                          <button type="button" onClick={() => setTreatments(treatments.filter((x) => x.id !== t.id))} className="text-[var(--ink-soft)] p-1">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Quick-add buttons when empty */}
            {treatments.length === 0 && !treatmentSearch && (
              <div className="flex flex-wrap gap-1.5">
                {TREATMENT_OPTIONS.slice(0, 8).map((t) => (
                  <button key={t} type="button" onClick={() => addTreatment(t)}
                    className="rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)]">
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <Field label="Notes">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else to record about this ED visit..." />
            </Field>
          </Card>

          {/* Attachments */}
          <Card>
            <FileUpload attachments={attachments} onChange={setAttachments} label="Attach ED reports (photos or PDFs)" />
          </Card>

          {/* Save */}
          <button
            type="button"
            onClick={saveAsAdmission}
            className="w-full rounded-2xl bg-[var(--alert)] text-white font-bold py-5 text-lg active:scale-[0.99] transition"
          >
            Save ED visit
          </button>
        </div>
      )}
    </AppShell>
  );
}
