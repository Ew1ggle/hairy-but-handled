"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type Admission } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { useState } from "react";

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
  "Other [please specify]",
];

export default function AdmissionsPage() {
  const { addEntry, updateEntry, deleteEntry } = useSession();
  const admissions = useEntries("admission").slice().sort((a, b) => (b.admissionDate ?? "").localeCompare(a.admissionDate ?? ""));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [admissionDate, setAdmissionDate] = useState("");
  const [hospital, setHospital] = useState("");
  const [reason, setReason] = useState("");
  const [dischargeDate, setDischargeDate] = useState("");
  const [dischargeDetails, setDischargeDetails] = useState("");
  const [dischargeMeds, setDischargeMeds] = useState("");
  const [treatments, setTreatments] = useState<{ id: string; treatment: string; details: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [treatmentSearch, setTreatmentSearch] = useState("");

  const resetForm = () => {
    setAdmissionDate(""); setHospital(""); setReason("");
    setDischargeDate(""); setDischargeDetails(""); setDischargeMeds("");
    setTreatments([]); setNotes(""); setEditingId(null); setShowForm(false);
  };

  const editAdmission = (a: Admission) => {
    setAdmissionDate(a.admissionDate ?? "");
    setHospital(a.hospital ?? "");
    setReason(a.reason ?? "");
    setDischargeDate(a.dischargeDate ?? "");
    setDischargeDetails(a.dischargeDetails ?? "");
    setDischargeMeds(a.dischargeMedications ?? "");
    setTreatments(a.treatments ?? []);
    setNotes(a.notes ?? "");
    setEditingId(a.id);
    setShowForm(true);
  };

  const save = async () => {
    const payload = {
      kind: "admission" as const,
      admissionDate,
      hospital,
      reason,
      dischargeDate: dischargeDate || undefined,
      dischargeDetails: dischargeDetails || undefined,
      dischargeMedications: dischargeMeds || undefined,
      treatments,
      notes: notes || undefined,
    };
    if (editingId) {
      await updateEntry(editingId, payload);
    } else {
      await addEntry(payload as Omit<Admission, "id" | "createdAt">);
    }
    resetForm();
  };

  const addTreatment = (name: string) => {
    if (treatments.some((t) => t.treatment === name)) return;
    setTreatments([...treatments, { id: crypto.randomUUID(), treatment: name, details: "" }]);
    setTreatmentSearch("");
  };

  const filteredTreatments = treatmentSearch
    ? TREATMENT_OPTIONS.filter((t) => t.toLowerCase().includes(treatmentSearch.toLowerCase()))
    : TREATMENT_OPTIONS;

  return (
    <AppShell>
      <PageTitle sub="Track hospital admissions, treatments, and discharge details.">
        Hospital admissions
      </PageTitle>

      {!showForm && (
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full mb-4 rounded-2xl bg-[var(--primary)] text-white py-4 font-semibold text-base flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Record new admission
        </button>
      )}

      {showForm && (
        <Card className="mb-6 space-y-4">
          <h2 className="font-semibold text-lg">{editingId ? "Edit admission" : "New admission"}</h2>

          <Field label="Admission date">
            <TextInput type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
          </Field>

          <Field label="Hospital">
            <TextInput value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="e.g. Royal Brisbane & Women's" />
          </Field>

          <Field label="Reason for admission">
            <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Febrile neutropenia, suspected infection" />
          </Field>

          {/* Treatments */}
          <div>
            <div className="text-sm font-medium mb-1.5">Treatments / investigations</div>
            <div className="relative mb-2">
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
          </div>

          <Field label="Discharge date">
            <TextInput type="date" value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} />
          </Field>

          <Field label="Discharge details">
            <TextArea value={dischargeDetails} onChange={(e) => setDischargeDetails(e.target.value)} placeholder="Summary of discharge, follow-up instructions..." />
          </Field>

          <Field label="Discharge medications">
            <TextArea value={dischargeMeds} onChange={(e) => setDischargeMeds(e.target.value)} placeholder="List any new or changed medications on discharge..." />
          </Field>

          <Field label="Notes">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any other relevant details..." />
          </Field>

          <div className="flex gap-3">
            <Submit onClick={save}>{editingId ? "Update" : "Save admission"}</Submit>
            <button type="button" onClick={resetForm} className="rounded-2xl border border-[var(--border)] px-6 py-4 text-sm font-medium">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Admission history */}
      {admissions.length === 0 && !showForm && (
        <Card className="text-center text-[var(--ink-soft)]">
          <Building2 size={32} className="mx-auto mb-2 opacity-40" />
          <p>No admissions recorded yet.</p>
        </Card>
      )}

      <div className="space-y-3">
        {admissions.map((a) => {
          const expanded = expandedId === a.id;
          const discharged = !!a.dischargeDate;
          return (
            <Card key={a.id} className={!discharged ? "border-[var(--alert)]" : ""}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : a.id)} className="w-full text-left flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {!discharged && <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--alert)] bg-[var(--alert-soft)] px-2 py-0.5 rounded-full">Current</span>}
                    <span className="text-sm text-[var(--ink-soft)]">{a.admissionDate ? format(parseISO(a.admissionDate), "d MMM yyyy") : "Date unknown"}</span>
                  </div>
                  <div className="font-semibold">{a.hospital || "Hospital not recorded"}</div>
                  <div className="text-sm text-[var(--ink-soft)]">{a.reason}</div>
                </div>
                <div className="shrink-0 pt-1">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
              </button>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 text-sm">
                  {(a.treatments ?? []).length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Treatments</div>
                      <ul className="space-y-0.5">
                        {(a.treatments ?? []).map((t) => (
                          <li key={t.id}><b>{t.treatment}</b>{t.details && ` — ${t.details}`}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {a.dischargeDate && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Discharged</div>
                      <div>{format(parseISO(a.dischargeDate), "d MMM yyyy")}</div>
                    </div>
                  )}
                  {a.dischargeDetails && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Discharge details</div>
                      <div className="whitespace-pre-wrap">{a.dischargeDetails}</div>
                    </div>
                  )}
                  {a.dischargeMedications && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Discharge medications</div>
                      <div className="whitespace-pre-wrap">{a.dischargeMedications}</div>
                    </div>
                  )}
                  {a.notes && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Notes</div>
                      <div className="whitespace-pre-wrap">{a.notes}</div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => editAdmission(a)} className="rounded-xl bg-[var(--primary)] text-white px-4 py-2 text-sm font-medium">
                      Edit
                    </button>
                    <button type="button" onClick={() => { if (confirm("Delete this admission?")) deleteEntry(a.id); }} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
