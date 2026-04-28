"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type Admission } from "@/lib/store";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp, Building2, Droplet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileUpload, AttachmentList, type Attachment } from "@/components/FileUpload";

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
  const { addEntry, updateEntry, deleteEntry, activePatientId } = useSession();
  const admissions = useEntries("admission").slice().sort((a, b) => (b.admissionDate ?? "").localeCompare(a.admissionDate ?? ""));
  const infusions = useEntries("infusion");

  // Map from yyyy-MM-dd → infusion entry, to surface same-day cross-links
  const infusionByDate = useMemo(() => {
    const m = new Map<string, typeof infusions[number]>();
    for (const i of infusions) {
      const d = format(parseISO(i.createdAt), "yyyy-MM-dd");
      m.set(d, i);
    }
    return m;
  }, [infusions]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Form state
  const [admissionDate, setAdmissionDate] = useState("");
  const [hospital, setHospital] = useState("");
  const [reason, setReason] = useState("");
  const [dischargeDate, setDischargeDate] = useState("");
  const [dischargeDetails, setDischargeDetails] = useState("");
  const [dischargeMeds, setDischargeMeds] = useState("");
  const [ward, setWard] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [admittingTeam, setAdmittingTeam] = useState("");
  const [treatments, setTreatments] = useState<{ id: string; treatment: string; details: string; result?: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [treatmentSearch, setTreatmentSearch] = useState("");

  // Draft persistence — only for NEW admissions (editing uses DB directly)
  const { clear: clearDraft } = useDraft<{
    admissionDate: string; hospital: string; reason: string;
    dischargeDate: string; dischargeDetails: string; dischargeMeds: string;
    ward: string; bedNumber: string; admittingTeam: string;
    treatments: { id: string; treatment: string; details: string; result?: string }[];
    notes: string;
  }>({
    key: "/admissions/new",
    href: "/admissions",
    title: "Hospital admission",
    patientId: activePatientId,
    enabled: !editingId && showForm,
    state: { admissionDate, hospital, reason, dischargeDate, dischargeDetails, dischargeMeds, ward, bedNumber, admittingTeam, treatments, notes },
    onRestore: (d) => {
      if (d.admissionDate) setAdmissionDate(d.admissionDate);
      if (d.hospital) setHospital(d.hospital);
      if (d.reason) setReason(d.reason);
      if (d.dischargeDate) setDischargeDate(d.dischargeDate);
      if (d.dischargeDetails) setDischargeDetails(d.dischargeDetails);
      if (d.dischargeMeds) setDischargeMeds(d.dischargeMeds);
      if (d.ward) setWard(d.ward);
      if (d.bedNumber) setBedNumber(d.bedNumber);
      if (d.admittingTeam) setAdmittingTeam(d.admittingTeam);
      if (d.treatments?.length) setTreatments(d.treatments);
      if (d.notes) setNotes(d.notes);
      // Only auto-open the form when arriving via ?continue=1 (the
      // home-page Unfinished link). Direct nav restores the fields
      // silently — the user has to tap 'New admission' to see them.
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      if (params?.get("continue") === "1") setShowForm(true);
      setHasRestoredDraft(true);
    },
  });

  const discardDraft = () => {
    clearDraft();
    setHasRestoredDraft(false);
    // Reset all the form fields and close.
    setAdmissionDate(""); setHospital(""); setReason("");
    setDischargeDate(""); setDischargeDetails(""); setDischargeMeds("");
    setWard(""); setBedNumber(""); setAdmittingTeam("");
    setTreatments([]); setNotes(""); setAttachments([]);
    setShowForm(false);
  };

  const resetForm = () => {
    setAdmissionDate(""); setHospital(""); setReason("");
    setDischargeDate(""); setDischargeDetails(""); setDischargeMeds("");
    setWard(""); setBedNumber(""); setAdmittingTeam("");
    setTreatments([]); setNotes(""); setAttachments([]); setEditingId(null); setShowForm(false);
  };

  const editAdmission = (a: Admission) => {
    setAdmissionDate(a.admissionDate ?? "");
    setHospital(a.hospital ?? "");
    setReason(a.reason ?? "");
    setDischargeDate(a.dischargeDate ?? "");
    setDischargeDetails(a.dischargeDetails ?? "");
    setDischargeMeds(a.dischargeMedications ?? "");
    setWard(a.ward ?? "");
    setBedNumber(a.bedNumber ?? "");
    setAdmittingTeam(a.admittingTeam ?? "");
    setTreatments(a.treatments ?? []);
    setNotes(a.notes ?? "");
    setAttachments((a as unknown as { attachments?: Attachment[] }).attachments ?? []);
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
      ward: ward || undefined,
      bedNumber: bedNumber || undefined,
      admittingTeam: admittingTeam || undefined,
      treatments,
      notes: notes || undefined,
      attachments,
    };
    if (editingId) {
      await updateEntry(editingId, payload);
    } else {
      await addEntry(payload as Omit<Admission, "id" | "createdAt">);
      clearDraft();
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

  // Handoff from the ED log: when /emergency saves with outcome=admitted
  // it redirects to /admissions?edit=<id>. We re-open that admission row
  // in edit mode so the user can keep adding inpatient treatments and
  // discharge details on the same record. Runs once on mount and again
  // when admissions load (useEntries is async).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("edit");
    if (!id || editingId === id) return;
    const target = admissions.find((a) => a.id === id);
    if (target) {
      editAdmission(target);
      // Strip the param so a refresh doesn't re-open after the user closes.
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissions]);

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

          {hasRestoredDraft && !editingId && (
            <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-3 py-2 flex items-center gap-2">
              <div className="text-xs flex-1">
                <span className="font-semibold">Restored from where you left off.</span>
                <span className="text-[var(--ink-soft)]"> Save when ready, or discard if you don&apos;t want it.</span>
              </div>
              <button type="button" onClick={discardDraft} className="shrink-0 text-xs font-medium text-[var(--alert)]">
                Discard
              </button>
            </div>
          )}

          <Field label="Admission date">
            <DateInput value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
          </Field>

          <Field label="Hospital">
            <TextInput value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="e.g. Royal Brisbane & Women's" />
          </Field>

          <Field label="Reason for admission">
            <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Febrile neutropenia, suspected infection" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Ward">
              <TextInput value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. 7 East / Oncology" />
            </Field>
            <Field label="Bed number">
              <TextInput value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} placeholder="e.g. 12B" />
            </Field>
          </div>

          <Field label="Admitting team / consultant">
            <TextInput value={admittingTeam} onChange={(e) => setAdmittingTeam(e.target.value)} placeholder="e.g. Haematology — Dr Patel" />
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
              <div className="space-y-2">
                {treatments.map((t) => (
                  <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{t.treatment}</div>
                      <button
                        type="button"
                        onClick={() => setTreatments(treatments.filter((x) => x.id !== t.id))}
                        className="text-[var(--ink-soft)] p-1 shrink-0"
                        aria-label={`Remove ${t.treatment}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={t.details}
                      onChange={(e) => setTreatments(treatments.map((x) => x.id === t.id ? { ...x, details: e.target.value } : x))}
                      placeholder="Details (dose, route, time...)"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
                    />
                    <textarea
                      value={t.result ?? ""}
                      onChange={(e) => setTreatments(treatments.map((x) => x.id === t.id ? { ...x, result: e.target.value } : x))}
                      placeholder="Result (e.g. Hb 78, WCC 1.2 — leave blank if pending)"
                      rows={2}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] resize-y"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TREATMENT_OPTIONS.map((opt) => {
                const added = treatments.some((x) => x.treatment === opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (added) {
                        setTreatments(treatments.filter((x) => x.treatment !== opt));
                      } else {
                        addTreatment(opt);
                      }
                    }}
                    className={
                      added
                        ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1.5 text-xs font-medium text-white"
                        : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)]"
                    }
                  >
                    {added ? "✓" : "+"} {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Discharge date">
            <DateInput value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} />
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

          <FileUpload attachments={attachments} onChange={setAttachments} label="Attach reports (photos or PDFs)" />

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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {!discharged && <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--alert)] bg-[var(--alert-soft)] px-2 py-0.5 rounded-full">Current</span>}
                    {(a.edVisit || a.reason?.toLowerCase().startsWith("ed ")) && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--ink)] bg-[var(--surface-soft)] px-2 py-0.5 rounded-full">
                        ED visit
                      </span>
                    )}
                    <span className="text-sm text-[var(--ink-soft)]">{a.admissionDate ? format(parseISO(a.admissionDate), "d MMM yyyy") : "Date unknown"}</span>
                  </div>
                  <div className="font-semibold">{a.hospital || "Hospital not recorded"}</div>
                  <div className="text-sm text-[var(--ink-soft)]">{a.reason}</div>
                </div>
                <div className="shrink-0 pt-1">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
              </button>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 text-sm">
                  {/* ED visits get an explicit deep-link to /emergency
                       so the user knows that's the canonical edit path
                       (with the picker fields and ED practitioner sync). */}
                  {(a.edVisit || a.reason?.toLowerCase().startsWith("ed ")) && (
                    <Link
                      href="/emergency"
                      className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 active:scale-[0.99] transition"
                    >
                      <AlertTriangle size={16} className="text-[var(--alert)] shrink-0" />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold">Open in ED visit form</div>
                        <div className="text-[var(--ink-soft)]">Edit arrival time, presentations, doctors, nurses with the same picker</div>
                      </div>
                    </Link>
                  )}

                  {/* Cross-link to same-day infusion if one was logged */}
                  {(() => {
                    const sameDayInfusion = a.admissionDate ? infusionByDate.get(a.admissionDate) : undefined;
                    if (!sameDayInfusion) return null;
                    return (
                      <Link
                        href={`/treatment/${sameDayInfusion.cycleDay}`}
                        className="flex items-center gap-2 rounded-xl border-2 border-[var(--accent)] bg-[var(--surface)] px-3 py-2 active:scale-[0.99] transition"
                      >
                        <Droplet size={16} className="text-[var(--accent)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">
                            Infusion also logged that day — Day {sameDayInfusion.cycleDay}
                          </div>
                          <div className="text-xs text-[var(--ink-soft)] truncate">
                            {sameDayInfusion.drugs ?? "Open the infusion log"}
                          </div>
                        </div>
                      </Link>
                    );
                  })()}
                  {(a.ward || a.bedNumber || a.admittingTeam) && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Ward</div>
                      <div>
                        {[a.ward, a.bedNumber && `Bed ${a.bedNumber}`].filter(Boolean).join(" · ")}
                        {a.admittingTeam && (
                          <div className="text-[var(--ink-soft)]">{a.admittingTeam}</div>
                        )}
                      </div>
                    </div>
                  )}
                  {(a.treatments ?? []).length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Treatments</div>
                      <ul className="space-y-1">
                        {(a.treatments ?? []).map((t) => (
                          <li key={t.id}>
                            <b>{t.treatment}</b>
                            {t.details && ` — ${t.details}`}
                            {t.result && (
                              <div className="text-[var(--ink-soft)] whitespace-pre-wrap pl-3">
                                Result: {t.result}
                              </div>
                            )}
                          </li>
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
                  <AttachmentList attachments={(a as unknown as { attachments?: Attachment[] }).attachments ?? []} />
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
