"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type Admission, type TreatmentRow, type TreatmentCourse, type Signal, type ProposedDischargeChange, type DoctorUpdate } from "@/lib/store";
import { SIGNAL_BY_ID } from "@/lib/signals";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { format, parseISO } from "date-fns";
import { Activity, AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp, Building2, Droplet, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileUpload, AttachmentList, type Attachment } from "@/components/FileUpload";
import { TreatingTeamPicker } from "@/components/TreatingTeamPicker";
import { TreatmentPlanForm } from "@/components/TreatmentPlanForm";

const TREATMENT_OPTIONS = [
  "Blood Cultures",
  "Complete Blood Count",
  "Kidney and Liver Tests",
  "Lactate",
  "Urine Testing",
  "CT",
  "Xray",
  "Ultrasound",
  "ECG",
  "IV Fluids",
  "Oral Panadol",
  "IV Paracetamol",
  "IV Anti-emetic",
  "IV Steroids",
  "Antibiotics (Oral)",
  "Antibiotics (IV)",
  "Antiviral / Antifungal",
  "Red Blood Cell Transfusion",
  "Platelet Transfusion",
  "FFP / Cryoprecipitate",
  "IV Immunoglobulin (IVIG)",
  "Neutrophil-stimulating injection (G-CSF)",
  "Oxygen Therapy",
  "Splenectomy",
  "Other",
];

const IMAGING_AREAS = [
  "Head", "Neck", "Chest", "Abdomen", "Pelvis", "Spine", "Limb", "Spleen", "Other",
];

const COMMON_ORGANISMS = [
  "E. coli",
  "Staphylococcus aureus (MSSA)",
  "Staphylococcus aureus (MRSA)",
  "Coagulase-negative Staphylococcus",
  "Streptococcus pneumoniae",
  "Streptococcus pyogenes",
  "Enterococcus faecalis",
  "Enterococcus faecium (VRE)",
  "Klebsiella pneumoniae",
  "Pseudomonas aeruginosa",
  "Enterobacter cloacae",
  "Candida albicans",
  "Candida glabrata",
  "Listeria monocytogenes",
  "No growth (negative)",
  "Contaminant (skin flora)",
];

const isImagingTreatment = (name: string) => /^(ct|x[\s-]?ray|ultrasound)\b/i.test(name.trim());
const isCtTreatment = (name: string) => /^ct\b/i.test(name.trim());
const isCultureTreatment = (name: string) => /blood\s*culture/i.test(name);
const isCourseTreatment = (name: string) =>
  /antibiotic|antiviral|antifungal|panadol|paracetamol|anti[\s-]?emetic|steroid/i.test(name);

export default function AdmissionsPage() {
  const { addEntry, updateEntry, deleteEntry, activePatientId } = useSession();
  // The admissions log is for ward admissions, not ED visits. Filter
  // out rows where edVisit=true AND outcome isn't "admitted" — that
  // covers in-progress ED visits AND ED visits that ended in
  // discharge home. Direct admissions (edVisit=false) and ED visits
  // that progressed to a ward (outcome="admitted") both stay.
  // Legacy data without the outcome field falls back to dischargeDate
  // (an ED-only row with a same-day discharge date should also be
  // excluded). The full ED list still lives on /emergency.
  const allAdmissions = useEntries("admission").slice().sort((a, b) => (b.admissionDate ?? "").localeCompare(a.admissionDate ?? ""));
  const admissions = useMemo(
    () => allAdmissions.filter((a) => {
      const wasEd = a.edVisit || a.reason?.toLowerCase().startsWith("ed ");
      if (!wasEd) return true;
      if (a.outcome === "admitted") return true;
      // Legacy ED rows without outcome but with a separate dischargeDate
      // beyond the admissionDate — treat as ED-then-ward and keep.
      if (!a.outcome && a.dischargeDate && a.admissionDate && a.dischargeDate > a.admissionDate) {
        return true;
      }
      return false;
    }),
    [allAdmissions],
  );
  const infusions = useEntries("infusion");
  const signals = useEntries("signal");

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
  const [proposedDischargeDate, setProposedDischargeDate] = useState("");
  const [proposedDischargeHistory, setProposedDischargeHistory] = useState<ProposedDischargeChange[]>([]);
  const [proposedDischargeNote, setProposedDischargeNote] = useState("");
  const [ward, setWard] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [admittingTeam, setAdmittingTeam] = useState("");
  const [doctorUpdates, setDoctorUpdates] = useState<DoctorUpdate[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRow[]>([]);
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [treatmentSearch, setTreatmentSearch] = useState("");

  // Draft persistence — only for NEW admissions (editing uses DB directly)
  const { clear: clearDraft } = useDraft<{
    admissionDate: string; hospital: string; reason: string;
    dischargeDate: string; dischargeDetails: string; dischargeMeds: string;
    proposedDischargeDate: string;
    ward: string; bedNumber: string; admittingTeam: string;
    doctorUpdates: DoctorUpdate[];
    treatments: TreatmentRow[];
    notes: string;
  }>({
    key: "/admissions/new",
    href: "/admissions",
    title: "Hospital admission",
    patientId: activePatientId,
    enabled: !editingId && showForm,
    state: { admissionDate, hospital, reason, dischargeDate, dischargeDetails, dischargeMeds, proposedDischargeDate, ward, bedNumber, admittingTeam, doctorUpdates, treatments, notes },
    onRestore: (d) => {
      if (d.admissionDate) setAdmissionDate(d.admissionDate);
      if (d.hospital) setHospital(d.hospital);
      if (d.reason) setReason(d.reason);
      if (d.dischargeDate) setDischargeDate(d.dischargeDate);
      if (d.dischargeDetails) setDischargeDetails(d.dischargeDetails);
      if (d.dischargeMeds) setDischargeMeds(d.dischargeMeds);
      if (d.proposedDischargeDate) setProposedDischargeDate(d.proposedDischargeDate);
      if (d.ward) setWard(d.ward);
      if (d.bedNumber) setBedNumber(d.bedNumber);
      if (d.admittingTeam) setAdmittingTeam(d.admittingTeam);
      if (d.doctorUpdates?.length) setDoctorUpdates(d.doctorUpdates);
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
    setProposedDischargeDate(""); setProposedDischargeHistory([]); setProposedDischargeNote("");
    setWard(""); setBedNumber(""); setAdmittingTeam("");
    setDoctorUpdates([]);
    setTreatments([]); setNotes(""); setAttachments([]);
    setShowForm(false);
  };

  const resetForm = () => {
    setAdmissionDate(""); setHospital(""); setReason("");
    setDischargeDate(""); setDischargeDetails(""); setDischargeMeds("");
    setProposedDischargeDate(""); setProposedDischargeHistory([]); setProposedDischargeNote("");
    setWard(""); setBedNumber(""); setAdmittingTeam("");
    setDoctorUpdates([]);
    setTreatments([]); setNotes(""); setAttachments([]); setEditingId(null); setShowForm(false);
  };

  const editAdmission = (a: Admission) => {
    setAdmissionDate(a.admissionDate ?? "");
    setHospital(a.hospital ?? "");
    setReason(a.reason ?? "");
    setDischargeDate(a.dischargeDate ?? "");
    setDischargeDetails(a.dischargeDetails ?? "");
    setDischargeMeds(a.dischargeMedications ?? "");
    setProposedDischargeDate(a.proposedDischargeDate ?? "");
    setProposedDischargeHistory(a.proposedDischargeHistory ?? []);
    setProposedDischargeNote("");
    setWard(a.ward ?? "");
    setBedNumber(a.bedNumber ?? "");
    setAdmittingTeam(a.admittingTeam ?? "");
    setDoctorUpdates(a.doctorUpdates ?? []);
    setTreatments(a.treatments ?? []);
    setNotes(a.notes ?? "");
    setAttachments((a as unknown as { attachments?: Attachment[] }).attachments ?? []);
    setEditingId(a.id);
    setShowForm(true);
  };

  const save = async () => {
    // Detect a change to the proposed discharge date so we can append
    // to the history log. The history is the canonical timeline of
    // every value the field has held — so a stay that gets pushed
    // back over and over has visible slippage. Compares against the
    // value already stored on the row when editing, or against blank
    // when it's a new admission.
    const previousProposed = editingId
      ? (allAdmissions.find((a) => a.id === editingId)?.proposedDischargeDate ?? "")
      : "";
    const proposedChanged = proposedDischargeDate !== previousProposed;
    const newHistory: ProposedDischargeChange[] = proposedChanged && proposedDischargeDate
      ? [
          ...proposedDischargeHistory,
          {
            date: proposedDischargeDate,
            recordedAt: new Date().toISOString(),
            note: proposedDischargeNote.trim() || undefined,
          },
        ]
      : proposedDischargeHistory;

    const payload = {
      kind: "admission" as const,
      admissionDate,
      hospital,
      reason,
      dischargeDate: dischargeDate || undefined,
      dischargeDetails: dischargeDetails || undefined,
      dischargeMedications: dischargeMeds || undefined,
      proposedDischargeDate: proposedDischargeDate || undefined,
      proposedDischargeHistory: newHistory.length > 0 ? newHistory : undefined,
      ward: ward || undefined,
      bedNumber: bedNumber || undefined,
      admittingTeam: admittingTeam || undefined,
      doctorUpdates: doctorUpdates.length > 0 ? doctorUpdates : undefined,
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

          {/* When editing an admission row that began as an ED visit,
               surface a back-link to the ED log. The same row is the
               canonical edit target on both pages, but /emergency has
               the arrival/presentations/staff fields you want for
               reviewing what happened in ED. */}
          {editingId && (() => {
            const cur = admissions.find((a) => a.id === editingId);
            if (!cur || (!cur.edVisit && !cur.reason?.toLowerCase().startsWith("ed "))) return null;
            return (
              <Link
                href={`/emergency?edit=${editingId}`}
                className="flex items-center gap-2 rounded-xl border-2 border-[var(--alert)] bg-[var(--alert-soft)] px-3 py-2 active:scale-[0.99] transition"
              >
                <AlertTriangle size={16} className="text-[var(--alert)] shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold text-[var(--alert)]">View / edit the ED log →</div>
                  <div className="text-[var(--ink-soft)]">Arrival time, presentations, ED staff, ED-phase signals all live there.</div>
                </div>
              </Link>
            );
          })()}

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

          <Field label="Treating team / consultant" hint="Tap a team or type your own">
            <TreatingTeamPicker value={admittingTeam} onChange={setAdmittingTeam} />
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
                  <TreatmentRowEditor
                    key={t.id}
                    row={t}
                    onChange={(patch) => setTreatments(treatments.map((x) => x.id === t.id ? { ...x, ...patch } : x))}
                    onRemove={() => setTreatments(treatments.filter((x) => x.id !== t.id))}
                  />
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

          {/* Signal Sweep launcher — same flow as on /emergency. The
               admission row is the FK; signals captured here land on
               the daily trace and on the per-admission list below.
               Disabled until the row exists (i.e. has been saved at
               least once) so we have something to link signals to. */}
          <AdmissionSignalCard admissionId={editingId} signalsAll={signals} />

          {/* Doctor updates timeline. Each round, plan change, or
               conversation gets one entry with date + time. Newest
               first so the most recent thinking is visible without
               scrolling. */}
          <DoctorUpdatesCard
            updates={doctorUpdates}
            onChange={setDoctorUpdates}
            admittingTeam={admittingTeam}
            edDoctors={editingId ? (allAdmissions.find((a) => a.id === editingId)?.doctors ?? []) : []}
          />

          {/* Proposed discharge date + history. The team often gives
               a target ("home Tuesday") that slips. Logging each
               change makes the slippage visible — a one-day move is
               normal, three changes in a week is a flag. */}
          <ProposedDischargeField
            value={proposedDischargeDate}
            onChange={setProposedDischargeDate}
            note={proposedDischargeNote}
            onNoteChange={setProposedDischargeNote}
            history={proposedDischargeHistory}
            originalValue={editingId ? (allAdmissions.find((a) => a.id === editingId)?.proposedDischargeDate ?? "") : ""}
          />

          <Field label="Actual discharge date">
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
          const wasEd = a.edVisit || a.reason?.toLowerCase().startsWith("ed ");
          // Pathway label spells out the journey ("ED → Home" / "ED → Ward
          //  7E (Bed 12)" / "Direct admission") so the user can see at a
          // glance how each row started and where it ended.
          const pathway = (() => {
            if (wasEd && a.outcome === "admitted") {
              const tail = [a.ward, a.bedNumber && `Bed ${a.bedNumber}`].filter(Boolean).join(" · ");
              return tail ? `ED → Ward (${tail})` : "ED → Ward";
            }
            if (wasEd && (a.outcome === "discharged" || a.dischargeDate)) {
              return "ED → Home";
            }
            if (wasEd) return "ED · ongoing";
            if (discharged) return "Direct admission → Home";
            return "Direct admission";
          })();
          const pathwayClass = (() => {
            if (a.outcome === "admitted") return "bg-[var(--alert)] text-white";
            if (a.outcome === "discharged" || (wasEd && discharged)) return "bg-[var(--primary)] text-white";
            if (!discharged) return "bg-[var(--alert-soft)] text-[var(--alert)] border border-[var(--alert)]";
            return "bg-[var(--surface-soft)] text-[var(--ink-soft)]";
          })();
          return (
            <Card key={a.id} className={!discharged ? "border-[var(--alert)]" : ""}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : a.id)} className="w-full text-left flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {!discharged && <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--alert)] bg-[var(--alert-soft)] px-2 py-0.5 rounded-full">Current</span>}
                    <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${pathwayClass}`}>
                      {pathway}
                    </span>
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
                      <ul className="space-y-2">
                        {(a.treatments ?? []).map((t) => (
                          <li key={t.id} className="space-y-0.5">
                            <div>
                              <b>{t.treatment}</b>
                              {t.areas && t.areas.length > 0 && (
                                <span className="text-[var(--ink-soft)]"> — {t.areas.join(", ")}</span>
                              )}
                              {t.contrast && (
                                <span className="ml-1 text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] px-1.5 py-0.5 font-semibold">contrast</span>
                              )}
                              {t.count && (
                                <span className="text-[var(--ink-soft)]"> · {t.count}</span>
                              )}
                              {t.organism && (
                                <span className="text-[var(--ink-soft)]"> · {t.organism}</span>
                              )}
                              {t.details && (
                                <span className="text-[var(--ink-soft)]"> — {t.details}</span>
                              )}
                            </div>
                            {(t.courses ?? []).length > 0 && (() => {
                              const courses = t.courses ?? [];
                              const groups: { name: string; count: number }[] = [];
                              for (const c of courses) {
                                const last = groups[groups.length - 1];
                                if (last && last.name === c.name) last.count += 1;
                                else groups.push({ name: c.name, count: 1 });
                              }
                              const summary = groups.map((g) => `${g.count} × ${g.name}`).join(" → ");
                              return (
                                <div className="pl-3 space-y-0.5">
                                  {groups.length > 0 && (
                                    <div className="text-xs font-semibold text-[var(--ink)]">{summary}</div>
                                  )}
                                  <ul className="text-xs text-[var(--ink-soft)] space-y-0.5">
                                    {courses.map((c, idx) => (
                                      <li key={c.id}>
                                        #{idx + 1} {c.name}
                                        {c.date && ` · ${c.date}`}
                                        {c.time && ` · ${c.time}`}
                                        {c.details && ` · ${c.details}`}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })()}
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
                  {a.proposedDischargeDate && !a.dischargeDate && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Proposed discharge</div>
                      <div>
                        {format(parseISO(a.proposedDischargeDate), "EEE d MMM yyyy")}
                        {(a.proposedDischargeHistory?.length ?? 0) > 1 && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-1.5 py-0.5 font-semibold">
                            moved {a.proposedDischargeHistory!.length - 1}×
                          </span>
                        )}
                      </div>
                      {(a.proposedDischargeHistory?.length ?? 0) > 0 && (
                        <ul className="mt-1 text-xs text-[var(--ink-soft)] space-y-0.5">
                          {a.proposedDischargeHistory!.slice().reverse().map((h, i) => (
                            <li key={`${h.recordedAt}-${i}`}>
                              → {h.date}
                              <span> · told {format(parseISO(h.recordedAt), "d MMM HH:mm")}</span>
                              {h.note && <span> · {h.note}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {a.dischargeDate && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Discharged</div>
                      <div>
                        {format(parseISO(a.dischargeDate), "d MMM yyyy")}
                        {a.proposedDischargeDate && a.proposedDischargeDate !== a.dischargeDate && (
                          <span className="ml-2 text-xs text-[var(--ink-soft)]">
                            (planned {format(parseISO(a.proposedDischargeDate), "d MMM")})
                          </span>
                        )}
                      </div>
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
                  {(a.doctorUpdates?.length ?? 0) > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Doctor updates</div>
                      <ul className="space-y-1.5">
                        {a.doctorUpdates!.slice().sort((x, y) => `${y.date}T${y.time}`.localeCompare(`${x.date}T${x.time}`)).map((u) => (
                          <li key={u.id} className="text-xs">
                            <div className="font-semibold text-[var(--ink)]">
                              {u.date && format(parseISO(`${u.date}T00:00:00`), "EEE d MMM")}
                              {u.time && ` · ${u.time}`}
                              {u.doctor && <span className="text-[var(--ink-soft)] font-normal"> · {u.doctor}</span>}
                            </div>
                            {u.update && <div className="whitespace-pre-wrap text-[var(--ink-soft)]">{u.update}</div>}
                          </li>
                        ))}
                      </ul>
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

/** Mirror of /emergency's signal sweep launcher — kicks the user to
 *  /signal-sweep with this admission as the FK so anything captured
 *  during the inpatient stay lands on the daily trace and shows up
 *  in the per-admission list below. */
function AdmissionSignalCard({ admissionId, signalsAll }: { admissionId: string | null; signalsAll: Signal[] }) {
  const linked = useMemo(() => {
    if (!admissionId) return [] as Signal[];
    return signalsAll
      .filter((s) => s.edVisitId === admissionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [signalsAll, admissionId]);

  return (
    <Card className="space-y-3 border-2 border-[var(--primary)]">
      <div className="flex items-center gap-2">
        <Activity size={18} className="text-[var(--primary)]" />
        <div className="text-sm font-bold text-[var(--primary)] uppercase tracking-wide">
          Signal Sweep
        </div>
      </div>
      <p className="text-xs text-[var(--ink-soft)]">
        Capture observations during the admission — vitals, mood, pain. Each one is timestamped, lands on the daily trace, and is tagged to this admission.
      </p>
      {admissionId ? (
        <Link
          href={`/signal-sweep?edVisitId=${admissionId}&returnTo=/admissions?edit=${admissionId}`}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-3 text-sm font-semibold active:scale-[0.99] transition"
        >
          <Stethoscope size={16} /> Open Signal Sweep
        </Link>
      ) : (
        <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--ink-soft)]">
          Save this admission once before launching Signal Sweep — that gives signals an ID to attach to.
        </div>
      )}
      {linked.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] font-semibold">
            Captured this admission ({linked.length})
          </div>
          <ul className="space-y-1">
            {linked.slice(0, 8).map((s) => {
              const def = SIGNAL_BY_ID[s.signalType];
              const label = def?.label ?? s.customLabel ?? s.signalType;
              const time = format(parseISO(s.createdAt), "d MMM HH:mm");
              const value = s.value != null
                ? `${s.value}${s.unit ? ` ${s.unit}` : ""}`
                : s.choice ? s.choice
                : s.score != null ? `${s.score}/10`
                : s.choices?.length ? s.choices.join(", ")
                : "";
              return (
                <li key={s.id} className="text-xs flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-soft)] px-2.5 py-1.5">
                  <span className="font-medium">{label}</span>
                  <span className="text-[var(--ink-soft)] truncate">{value}</span>
                  <span className="shrink-0 text-[var(--ink-soft)]">{time}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Treatment row editor — same shape as /emergency's so a row authored
 *  in either page renders identically on the other. See /emergency for
 *  the full per-treatment-type rationale. */
function TreatmentRowEditor({
  row,
  onChange,
  onRemove,
}: {
  row: TreatmentRow;
  onChange: (patch: Partial<TreatmentRow>) => void;
  onRemove: () => void;
}) {
  const isImaging = isImagingTreatment(row.treatment);
  const isCt = isCtTreatment(row.treatment);
  const isCulture = isCultureTreatment(row.treatment);
  const isCourseMed = isCourseTreatment(row.treatment);
  const isOther = row.treatment.trim().toLowerCase() === "other";

  const [organismSearch, setOrganismSearch] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const filteredOrganisms = organismSearch
    ? COMMON_ORGANISMS.filter((o) => o.toLowerCase().includes(organismSearch.toLowerCase()))
    : COMMON_ORGANISMS;

  const toggleArea = (area: string) => {
    const cur = row.areas ?? [];
    onChange({ areas: cur.includes(area) ? cur.filter((a) => a !== area) : [...cur, area] });
  };

  const addCourse = () => {
    const courses = row.courses ?? [];
    const nextNumber = courses.length + 1;
    // First course leaves the name blank so the user actually types
    // the drug; subsequent courses inherit from the last one so drug
    // switches carry through (see /emergency).
    const lastName = courses.length > 0 ? courses[courses.length - 1].name : "";
    onChange({
      courses: [
        ...courses,
        {
          id: crypto.randomUUID(),
          name: lastName,
          // Time left blank by default — see CourseTimingFields.
          details: `Course ${nextNumber}`,
        } as TreatmentCourse,
      ],
    });
  };

  const courseSummary = (() => {
    const courses = row.courses ?? [];
    if (courses.length === 0) return "";
    const groups: { name: string; count: number }[] = [];
    for (const c of courses) {
      const last = groups[groups.length - 1];
      if (last && last.name === c.name) last.count += 1;
      else groups.push({ name: c.name, count: 1 });
    }
    return groups.map((g) => `${g.count} × ${g.name}`).join(" → ");
  })();
  const updateCourse = (id: string, patch: Partial<TreatmentCourse>) => {
    onChange({ courses: (row.courses ?? []).map((c) => c.id === id ? { ...c, ...patch } : c) });
  };
  const removeCourse = (id: string) => {
    onChange({ courses: (row.courses ?? []).filter((c) => c.id !== id) });
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          {row.treatment}
          {isOther && <span className="ml-1 text-[var(--ink-soft)] font-normal">(custom)</span>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[var(--ink-soft)] p-1 shrink-0"
          aria-label={`Remove ${row.treatment}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {isOther && (
        <input
          type="text"
          value={row.treatment === "Other" ? "" : row.treatment}
          onChange={(e) => onChange({ treatment: e.target.value || "Other" })}
          placeholder="Name this treatment"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
        />
      )}

      {isImaging && (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-[var(--ink-soft)] mb-1">Areas scanned</div>
            <div className="flex flex-wrap gap-1.5">
              {IMAGING_AREAS.map((a) => {
                const on = (row.areas ?? []).includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleArea(a)}
                    className={
                      on
                        ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                    }
                  >
                    {on ? "✓" : "+"} {a}
                  </button>
                );
              })}
            </div>
          </div>
          {isCt && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!row.contrast}
                onChange={(e) => onChange({ contrast: e.target.checked })}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span>Contrast administered</span>
            </label>
          )}
        </div>
      )}

      {isCulture && (
        <div className="space-y-2">
          <input
            type="text"
            value={row.count ?? ""}
            onChange={(e) => onChange({ count: e.target.value })}
            placeholder="Count description (e.g. 6 sets, 2 peripheral + 1 line)"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <div>
            <div className="text-xs text-[var(--ink-soft)] mb-1">
              Organism / result {row.organism && <span className="text-[var(--primary)] font-semibold">— {row.organism}</span>}
            </div>
            <div className="relative">
              <input
                type="text"
                value={organismSearch || row.organism || ""}
                onChange={(e) => {
                  setOrganismSearch(e.target.value);
                  onChange({ organism: e.target.value });
                }}
                placeholder="Search organisms or type your own…"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              {organismSearch && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-auto">
                  {filteredOrganisms.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        onChange({ organism: o });
                        setOrganismSearch("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-soft)] border-b border-[var(--border)] last:border-0"
                    >
                      {o}
                    </button>
                  ))}
                  {filteredOrganisms.length === 0 && (
                    <div className="px-3 py-2 text-sm text-[var(--ink-soft)]">No matches — your typed value will be saved as-is.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCourseMed && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-[var(--ink-soft)]">Courses ({(row.courses ?? []).length})</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPlan((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
              >
                {showPlan ? "Close plan" : "Add plan"}
              </button>
              <button type="button" onClick={addCourse} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                <Plus size={12} /> Add course
              </button>
            </div>
          </div>
          {showPlan && (
            <TreatmentPlanForm
              defaultDrugName={
                (row.courses ?? []).length > 0
                  ? row.courses![row.courses!.length - 1].name
                  : ""
              }
              defaultDose={row.details}
              onGenerate={(generated, replaceExisting) => {
                onChange({
                  courses: replaceExisting
                    ? generated
                    : [...(row.courses ?? []), ...generated],
                });
                setShowPlan(false);
              }}
              onCancel={() => setShowPlan(false)}
            />
          )}
          {(row.courses ?? []).length === 0 && !showPlan && (
            <div className="text-[11px] text-[var(--ink-soft)] bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1.5">
              Each course is one administration. Type the drug name on
              the first one — subsequent courses inherit it. Or tap{" "}
              <b>Add plan</b> to generate a whole schedule (e.g. Tazocin
              q6h × 5 days = 20 courses) in one go.
            </div>
          )}
          {courseSummary && (
            <div className="text-[11px] text-[var(--ink)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 font-medium">
              {courseSummary}
              <span className="text-[var(--ink-soft)] font-normal">
                {" "}— change a course&apos;s drug name to record a switch; new courses inherit the previous name.
              </span>
            </div>
          )}
          {(row.courses ?? []).map((c, idx) => (
            <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold shrink-0">
                  Course #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCourse(c.id)}
                  className="text-[var(--ink-soft)] p-1 shrink-0"
                  aria-label={`Remove course ${idx + 1}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
                  Drug name
                </label>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => updateCourse(c.id, { name: e.target.value })}
                  placeholder="e.g. Amoxicillin, Augmentin, Tazocin"
                  className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <CourseTimingFields course={c} onChange={(patch) => updateCourse(c.id, patch)} />
              <input
                type="text"
                value={c.details ?? ""}
                onChange={(e) => updateCourse(c.id, { details: e.target.value })}
                placeholder="Dose / route / notes"
                className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        value={row.details}
        onChange={(e) => onChange({ details: e.target.value })}
        placeholder={
          isImaging ? "Findings, indication, ordering doctor..."
            : isCulture ? "Site / time / additional context..."
              : "Details (dose, route, time...)"
        }
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
      />
      <textarea
        value={row.result ?? ""}
        onChange={(e) => onChange({ result: e.target.value })}
        placeholder="Result (leave blank if pending)"
        rows={2}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] resize-y"
      />
    </div>
  );
}

/** See /emergency CourseTimingFields. */
function CourseTimingFields({
  course,
  onChange,
}: {
  course: TreatmentCourse;
  onChange: (patch: Partial<TreatmentCourse>) => void;
}) {
  const [timeKnown, setTimeKnown] = useState<boolean>(!!course.time);
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <DateInput
          value={course.date ?? ""}
          onChange={(e) => onChange({ date: e.target.value })}
        />
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none px-1">
          <input
            type="checkbox"
            checked={timeKnown}
            onChange={(e) => {
              setTimeKnown(e.target.checked);
              if (!e.target.checked) onChange({ time: undefined });
              else if (!course.time) onChange({ time: format(new Date(), "HH:mm") });
            }}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          <span>Time known</span>
        </label>
      </div>
      {timeKnown && (
        <input
          type="time"
          value={course.time ?? ""}
          onChange={(e) => onChange({ time: e.target.value })}
          className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
        />
      )}
    </div>
  );
}

/** Proposed discharge date + audit log. The current value lives on
 *  the parent form; on save the parent appends to history when the
 *  value differs from what was previously stored. The history list
 *  here is read-only (most recent first) plus a small "current
 *  estimate" diff showing how far the new value sits from the
 *  original. */
function ProposedDischargeField({
  value,
  onChange,
  note,
  onNoteChange,
  history,
  originalValue,
}: {
  value: string;
  onChange: (v: string) => void;
  note: string;
  onNoteChange: (v: string) => void;
  history: ProposedDischargeChange[];
  originalValue: string;
}) {
  const isChanged = !!value && !!originalValue && value !== originalValue;
  const slipDays = (() => {
    if (!isChanged) return 0;
    const a = parseISO(`${originalValue}T00:00:00`);
    const b = parseISO(`${value}T00:00:00`);
    return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
  })();
  // Reverse history so most recent change is on top.
  const recent = history.slice().reverse();
  return (
    <div>
      <Field label="Proposed discharge date" hint="The team's current target — log changes here as the plan moves">
        <DateInput value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
      {isChanged && (
        <div className={`mt-1 text-xs rounded-lg px-2 py-1.5 ${slipDays > 0 ? "bg-[var(--alert-soft)] text-[var(--alert)]" : "bg-[var(--surface-soft)] text-[var(--ink-soft)]"}`}>
          {slipDays > 0
            ? `Pushed back ${slipDays} day${slipDays === 1 ? "" : "s"} (was ${originalValue})`
            : slipDays < 0
              ? `Brought forward ${Math.abs(slipDays)} day${Math.abs(slipDays) === 1 ? "" : "s"} (was ${originalValue})`
              : `Confirmed ${value}`}
        </div>
      )}
      {isChanged && (
        <div className="mt-2">
          <label className="block text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
            Reason for the change (optional)
          </label>
          <TextInput
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="e.g. Awaiting bloods · Source not yet identified · Fever cycling"
          />
        </div>
      )}
      {recent.length > 0 && (
        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
            Plan history ({recent.length} change{recent.length === 1 ? "" : "s"})
          </div>
          <ul className="text-xs space-y-0.5">
            {recent.map((h, i) => (
              <li key={`${h.recordedAt}-${i}`}>
                <span className="font-semibold">→ {h.date}</span>
                <span className="text-[var(--ink-soft)]">
                  {" · "}told {format(parseISO(h.recordedAt), "d MMM HH:mm")}
                </span>
                {h.note && <span className="text-[var(--ink-soft)]">{" · "}{h.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Timeline of doctor / team updates during the admission. Each row
 *  is a small inline-editable card with date + time (defaulting to
 *  now), doctor / team name, and the actual update text. Most-recent
 *  first so today's thinking is visible without scrolling.
 *
 *  The doctor field is a chip-picker built from the admitting team,
 *  ED-phase doctors logged on the row, and any doctor names already
 *  used in earlier updates — plus an "Other" chip that drops the
 *  user into the free-text input. Saves the user from re-typing the
 *  same name on every round. */
function DoctorUpdatesCard({
  updates,
  onChange,
  admittingTeam,
  edDoctors,
}: {
  updates: DoctorUpdate[];
  onChange: (next: DoctorUpdate[]) => void;
  admittingTeam: string;
  edDoctors: string[];
}) {
  const sorted = updates.slice().sort((a, b) => {
    const aKey = `${a.date}T${a.time}`;
    const bKey = `${b.date}T${b.time}`;
    return bKey.localeCompare(aKey);
  });
  // Suggested doctors: admitting team first, then ED-phase doctors,
  // then any name that's been used in an earlier update on this
  // admission. Deduped case-insensitively.
  const knownDoctors = (() => {
    const seen = new Map<string, string>();
    const add = (name: string | undefined) => {
      if (!name || !name.trim()) return;
      const key = name.trim().toLowerCase();
      if (!seen.has(key)) seen.set(key, name.trim());
    };
    add(admittingTeam);
    for (const d of edDoctors) add(d);
    for (const u of updates) add(u.doctor);
    return Array.from(seen.values());
  })();
  const addUpdate = () => {
    const now = new Date();
    onChange([
      ...updates,
      {
        id: crypto.randomUUID(),
        date: format(now, "yyyy-MM-dd"),
        time: format(now, "HH:mm"),
        doctor: "",
        update: "",
      },
    ]);
  };
  const updateRow = (id: string, patch: Partial<DoctorUpdate>) => {
    onChange(updates.map((u) => u.id === id ? { ...u, ...patch } : u));
  };
  const removeRow = (id: string) => {
    onChange(updates.filter((u) => u.id !== id));
  };
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Doctor / team updates</div>
        <button
          type="button"
          onClick={addUpdate}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
        >
          <Plus size={12} /> Log update
        </button>
      </div>
      {updates.length === 0 ? (
        <div className="text-[11px] text-[var(--ink-soft)] bg-[var(--surface-soft)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1.5">
          Log each ward round, plan change, or conversation with the
          team here. Date + time default to right now — adjust if
          you&apos;re catching up after the fact.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((u) => (
            <div key={u.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Update
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(u.id)}
                  className="text-[var(--ink-soft)] p-1 shrink-0"
                  aria-label="Remove update"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <DateInput
                  value={u.date}
                  onChange={(e) => updateRow(u.id, { date: e.target.value })}
                />
                <input
                  type="time"
                  value={u.time}
                  onChange={(e) => updateRow(u.id, { time: e.target.value })}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <DoctorPicker
                value={u.doctor ?? ""}
                onChange={(v) => updateRow(u.id, { doctor: v })}
                known={knownDoctors}
              />
              <TextArea
                value={u.update}
                onChange={(e) => updateRow(u.id, { update: e.target.value })}
                placeholder="What was said — plan, results, next step…"
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Chip-picker for the doctor field on a doctor-update row. Shows
 *  one chip per known doctor (admitting team + ED-phase doctors +
 *  any name reused across earlier updates) plus an "Other" chip
 *  that drops the user into the free-text input. Tap a chip to
 *  set the value; the input remains editable on top of any chip
 *  selection so consultant detail can be appended. */
function DoctorPicker({
  value,
  onChange,
  known,
}: {
  value: string;
  onChange: (v: string) => void;
  known: string[];
}) {
  const matchedChip = known.find((d) => value.trim() && d.toLowerCase() === value.trim().toLowerCase());
  return (
    <div className="space-y-1.5">
      {known.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {known.map((d) => {
            const on = matchedChip === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onChange(on ? "" : d)}
                className={
                  on
                    ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                }
              >
                {on ? "✓" : "+"} {d}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              // "Other" clears any chip selection so the text input
              // becomes the obvious next tap target. Doesn't blow
              // away typed values that aren't on the chip list.
              if (matchedChip) onChange("");
            }}
            className={
              !matchedChip && value.trim()
                ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
            }
          >
            {!matchedChip && value.trim() ? "✓" : "+"} Other
          </button>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          known.length > 0
            ? "Pick a chip above or type a different doctor"
            : "Doctor / team (e.g. Dr Patel — Haematology)"
        }
        className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
      />
    </div>
  );
}
