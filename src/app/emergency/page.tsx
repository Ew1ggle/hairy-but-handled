"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, TextArea, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { useEntries, type Admission, type Appointment, type FlagEvent, type Signal } from "@/lib/store";
import { SIGNAL_BY_ID } from "@/lib/signals";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { Activity, AlertTriangle, Plus, Trash2, Building2, Droplet, Dog, UserX, ShieldAlert, Flag, MapPin, Check, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePatientName } from "@/lib/usePatientName";
import { FileUpload, type Attachment } from "@/components/FileUpload";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";

/** Common ED tests, imaging, and interventions for a hairy-cell-leukaemia
 *  patient. Order roughly bloods → cultures/swabs → imaging → IV
 *  therapy → blood products → growth factors → supportive. The free-text
 *  "Add" path below means anything not on this list can still be typed. */
const TREATMENT_OPTIONS = [
  "Blood Cultures",
  "Complete Blood Count",
  "Kidney and Liver Tests",
  "Coagulation (INR/APTT)",
  "Group and Hold / Crossmatch",
  "Lactate",
  "Blood Gas (VBG/ABG)",
  "CRP",
  "Procalcitonin",
  "Urine Testing",
  "Urine MCS",
  "Sputum Culture",
  "Wound Swab",
  "Throat Swab",
  "Nasopharyngeal Swab (COVID/Flu/RSV)",
  "ECG",
  "Chest Xray",
  "Other Xray",
  "CT (no contrast)",
  "CT with Contrast",
  "CT Head",
  "CT Chest",
  "CT Abdomen / Pelvis",
  "Ultrasound (Abdominal)",
  "Ultrasound (Spleen)",
  "Echocardiogram",
  "IV Fluids",
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
  "Reverse Isolation Room",
  "Splenectomy Review",
];

type TreatmentRow = { id: string; treatment: string; details: string; result?: string };
type NearbyHospital = { name: string; distanceM: number };

/** ED practitioner stored on patient_profiles.data.edPractitioners */
type EdPractitioner = {
  name: string;
  hospital: string;
  role: "doctor" | "nurse";
  dateEncountered: string;
};

export default function EmergencyPage() {
  const { addEntry, updateEntry, activePatientId } = useSession();
  const sb = supabase();

  const admissions = useEntries("admission");
  const appointments = useEntries("appointment");
  const signals = useEntries("signal");

  // Patient info for quick reference
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [regimen, setRegimen] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [profileHospital, setProfileHospital] = useState<string>("");
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as Record<string, unknown> | undefined;
        if (!p) return;
        setProfileData(p);
        setPatientName((p.name as string) ?? "");
        const dx = p.diagnosis === "Other" ? (p.diagnosisOther as string) ?? "" : (p.diagnosis as string) ?? "";
        setDiagnosis(dx);
        const rx = p.regimen === "Other" ? (p.regimenOther as string) ?? "" : (p.regimen as string) ?? "";
        setRegimen(rx);
        const al = (p.allergies as { name?: string }[]) ?? [];
        setAllergies(al.map((a) => a.name ?? "").filter(Boolean));
        setProfileHospital((p.hospital as string) ?? "");
      });
  }, [sb, activePatientId]);

  // ED log state
  const { firstName, isSupport } = usePatientName();

  const [arrivalTime, setArrivalTime] = useState(format(new Date(), "HH:mm"));
  const [hospital, setHospital] = useState("");
  const [presentations, setPresentations] = useState<string[]>([]);
  const [presentationOther, setPresentationOther] = useState("");
  const [doctors, setDoctors] = useState<string[]>([""]);
  const [nurses, setNurses] = useState<string[]>([""]);
  const [treatments, setTreatments] = useState<TreatmentRow[]>([]);
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [outcome, setOutcome] = useState<"" | "discharged" | "admitted">("");
  const [dischargeDate, setDischargeDate] = useState("");
  const [dischargeInstructions, setDischargeInstructions] = useState("");
  const [dischargeMeds, setDischargeMeds] = useState("");
  const [ward, setWard] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [admittingTeam, setAdmittingTeam] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /** ED-visit admissions, newest first. The picker at the top lets the
   *  user re-open one to amend (e.g. add the discharge details after the
   *  fact, fix a typed name, mark the outcome). */
  const pastEdVisits = useMemo(
    () => admissions
      .filter((a) => a.edVisit || a.reason?.toLowerCase().startsWith("ed "))
      .sort((a, b) => (b.admissionDate ?? "").localeCompare(a.admissionDate ?? "")),
    [admissions],
  );

  const startEditingEdVisit = (a: Admission) => {
    setEditingId(a.id);
    setSaved(false);
    setArrivalTime(a.arrivalTime ?? "");
    setHospital(a.hospital ?? "");
    setPresentations(a.presentations ?? []);
    setPresentationOther("");
    setDoctors(a.doctors?.length ? a.doctors : [""]);
    setNurses(a.nurses?.length ? a.nurses : [""]);
    setTreatments(a.treatments ?? []);
    setNotes(a.notes ?? "");
    setOutcome(a.outcome ?? "");
    setDischargeDate(a.dischargeDate ?? "");
    setDischargeInstructions(a.dischargeDetails ?? "");
    setDischargeMeds(a.dischargeMedications ?? "");
    setWard(a.ward ?? "");
    setBedNumber(a.bedNumber ?? "");
    setAdmittingTeam(a.admittingTeam ?? "");
    setAttachments((a as unknown as { attachments?: Attachment[] }).attachments ?? []);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setArrivalTime("");
    setHospital("");
    setPresentations([]);
    setPresentationOther("");
    setDoctors([""]);
    setNurses([""]);
    setTreatments([]);
    setNotes("");
    setOutcome("");
    setDischargeDate("");
    setDischargeInstructions("");
    setDischargeMeds("");
    setWard("");
    setBedNumber("");
    setAdmittingTeam("");
    setAttachments([]);
  };

  // Build the hospital dropdown list from profile + past admissions + past appointments
  const knownHospitals = useMemo(() => {
    const seen = new Map<string, string>();
    const add = (name: string | undefined) => {
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    };
    add(profileHospital);
    for (const a of admissions) add(a.hospital);
    for (const a of appointments as Appointment[]) add(a.location);
    return Array.from(seen.values()).sort();
  }, [profileHospital, admissions, appointments]);

  // Pre-fill from query params when arriving from a Tripwires flag
  // ('Went to ED' tick → /emergency?presentation=&arrival=&fromFlag=).
  // Runs once on mount; doesn't override fields the user has already
  // edited because we only seed when the corresponding state is empty.
  // fromFlag is captured into state so saveAsAdmission can skip the
  // 'create flag' step (the originating flag already exists and has
  // wentToED=true set by FlagSheet's save).
  const [fromFlagId, setFromFlagId] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const presentation = params.get("presentation");
    const arrival = params.get("arrival");
    const fromFlag = params.get("fromFlag");
    if (presentation) {
      setPresentations((prev) => prev.length === 0 ? [presentation] : prev);
    }
    if (arrival) {
      setArrivalTime((prev) => prev || arrival);
    }
    if (fromFlag) setFromFlagId(fromFlag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-resume the open ED visit instead of starting a fresh blank
  // form. Two paths:
  //   1. ?edit=<id> in the URL (home banner / admissions hand-off) →
  //      load that exact row.
  //   2. No ?edit param, no query-param-seeded new visit, and an open
  //      ED visit (edVisit=true, no outcome, no dischargeDate) already
  //      exists → load it. This stops a second tap on "I am at
  //      Emergency" from spawning a duplicate row.
  // Skips when the user is already editing or the form was opened from
  // a Tripwires flag (they're trying to log a new event off that flag).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (editingId) return;
    if (admissions.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId) {
      const target = admissions.find((a) => a.id === editId);
      if (target) {
        startEditingEdVisit(target);
        const url = new URL(window.location.href);
        url.searchParams.delete("edit");
        window.history.replaceState({}, "", url.toString());
      }
      return;
    }
    if (params.get("fromFlag") || params.get("presentation")) return;
    const open = admissions
      .filter((a) =>
        (a.edVisit || a.reason?.toLowerCase().startsWith("ed "))
        && !a.outcome
        && !a.dischargeDate,
      )
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
    if (open) startEditingEdVisit(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissions]);

  const { clear: clearDraft } = useDraft<{
    arrivalTime: string; hospital: string; presentations: string[]; presentationOther: string;
    doctors: string[]; nurses: string[]; treatments: TreatmentRow[]; notes: string;
    outcome: "" | "discharged" | "admitted";
    dischargeDate: string; dischargeInstructions: string; dischargeMeds: string;
    ward: string; bedNumber: string; admittingTeam: string;
  }>({
    key: "/emergency/new",
    href: "/emergency",
    title: "ED visit",
    patientId: activePatientId,
    // Don't auto-restore the blank-form draft when we're editing an
    // existing admission — the editingId path loads from DB.
    enabled: !saved && !editingId,
    state: { arrivalTime, hospital, presentations, presentationOther, doctors, nurses, treatments, notes, outcome, dischargeDate, dischargeInstructions, dischargeMeds, ward, bedNumber, admittingTeam },
    onRestore: (d) => {
      if (d.arrivalTime) setArrivalTime(d.arrivalTime);
      if (d.hospital) setHospital(d.hospital);
      if (d.presentations?.length) setPresentations(d.presentations);
      if (d.presentationOther) setPresentationOther(d.presentationOther);
      if (d.doctors?.length) setDoctors(d.doctors);
      if (d.nurses?.length) setNurses(d.nurses);
      if (d.treatments?.length) setTreatments(d.treatments);
      if (d.notes) setNotes(d.notes);
      if (d.outcome) setOutcome(d.outcome);
      if (d.dischargeDate) setDischargeDate(d.dischargeDate);
      if (d.dischargeInstructions) setDischargeInstructions(d.dischargeInstructions);
      if (d.dischargeMeds) setDischargeMeds(d.dischargeMeds);
      if (d.ward) setWard(d.ward);
      if (d.bedNumber) setBedNumber(d.bedNumber);
      if (d.admittingTeam) setAdmittingTeam(d.admittingTeam);
      setHasRestoredDraft(true);
    },
  });

  const discardDraft = () => {
    clearDraft();
    setHasRestoredDraft(false);
    setArrivalTime("");
    setHospital("");
    setPresentations([]);
    setPresentationOther("");
    setDoctors([""]);
    setNurses([""]);
    setTreatments([]);
    setNotes("");
    setOutcome("");
    setDischargeDate("");
    setDischargeInstructions("");
    setDischargeMeds("");
    setWard("");
    setBedNumber("");
    setAdmittingTeam("");
    setAttachments([]);
  };

  const filteredTreatments = treatmentSearch
    ? TREATMENT_OPTIONS.filter((t) => t.toLowerCase().includes(treatmentSearch.toLowerCase()))
    : TREATMENT_OPTIONS;

  const addTreatment = (name: string) => {
    if (treatments.some((t) => t.treatment === name)) return;
    setTreatments([...treatments, { id: crypto.randomUUID(), treatment: name, details: "" }]);
    setTreatmentSearch("");
  };

  const presentationText = (() => {
    const list = presentations.map((p) =>
      p === "Other [Please specify]" && presentationOther ? presentationOther : p,
    );
    return list.join(", ");
  })();

  /** Signals already captured during this ED visit (matched by edVisitId
   *  on the row) so the user can see what's been logged so far without
   *  leaving /emergency. Newest first. */
  const edVisitSignals = useMemo(() => {
    if (!editingId) return [] as Signal[];
    return signals
      .filter((s) => s.edVisitId === editingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [signals, editingId]);

  /** Open Signal Sweep tagged to this visit. For an existing visit we
   *  already have an id; for a brand-new visit we save a stub admission
   *  first so the signals have something to attach to. */
  const launchSignalSweep = async () => {
    let id = editingId;
    if (!id) {
      const today = format(new Date(), "yyyy-MM-dd");
      const stub = await addEntry({
        kind: "admission",
        admissionDate: today,
        hospital,
        reason: presentationText ? `ED presentation: ${presentationText}` : "ED visit",
        edVisit: true,
        arrivalTime: arrivalTime || undefined,
        presentations: presentations.length ? presentations : undefined,
        doctors: doctors.filter(Boolean),
        nurses: nurses.filter(Boolean),
      } as Omit<Admission, "id" | "createdAt">);
      id = stub?.id ?? null;
      if (id) setEditingId(id);
    }
    if (id && typeof window !== "undefined") {
      window.location.href = `/signal-sweep?edVisitId=${id}&returnTo=/emergency`;
    }
  };

  const saveAsAdmission = async () => {
    const today = format(new Date(), "yyyy-MM-dd");

    const payload = {
      hospital,
      reason: presentationText ? `ED presentation: ${presentationText}` : "ED visit",
      treatments,
      attachments,
      edVisit: true,
      arrivalTime: arrivalTime || undefined,
      presentations: presentations.length ? presentations : undefined,
      doctors: doctors.filter(Boolean),
      nurses: nurses.filter(Boolean),
      notes: notes || undefined,
      outcome: outcome || undefined,
      // Discharge fields only applicable when sent home from ED.
      dischargeDate: outcome === "discharged" ? (dischargeDate || today) : undefined,
      dischargeDetails: outcome === "discharged" && dischargeInstructions ? dischargeInstructions : undefined,
      dischargeMedications: outcome === "discharged" && dischargeMeds ? dischargeMeds : undefined,
      // Ward fields only set once admitted from ED.
      ward: outcome === "admitted" && ward ? ward : undefined,
      bedNumber: outcome === "admitted" && bedNumber ? bedNumber : undefined,
      admittingTeam: outcome === "admitted" && admittingTeam ? admittingTeam : undefined,
    } as Partial<Admission>;

    let savedId = editingId;
    if (editingId) {
      // Edit-mode: update the existing admission row, keep its
      // admissionDate so re-saving doesn't shift the timeline.
      await updateEntry(editingId, payload);
      // Don't re-create the linked flag — original is already in place.
    } else {
      // New ED visit: create the admission. Flag creation is conditional —
      // when the user arrived via /ed-triggers' 'Went to ED' tick, the
      // originating flag already exists and was just updated with
      // wentToED=true by FlagSheet, so creating another flag here would
      // duplicate the row on /ed-triggers.
      const created = await addEntry({
        kind: "admission",
        admissionDate: today,
        ...payload,
      } as Omit<Admission, "id" | "createdAt">);
      savedId = created?.id ?? null;
      if (!fromFlagId) {
        await addEntry({
          kind: "flag",
          triggerLabel: presentationText ? `ED visit: ${presentationText}` : "ED visit",
          wentToED: true,
        } as Omit<FlagEvent, "id" | "createdAt">);
      }
    }

    // Append ED practitioners to the patient profile (deduped by name+hospital+role)
    if (sb && activePatientId) {
      const existing = ((profileData.edPractitioners as EdPractitioner[] | undefined) ?? []).slice();
      const key = (p: EdPractitioner) => `${p.role}|${p.name.trim().toLowerCase()}|${p.hospital.trim().toLowerCase()}`;
      const seen = new Set(existing.map(key));
      const additions: EdPractitioner[] = [];
      for (const d of doctors.map((x) => x.trim()).filter(Boolean)) {
        const ep: EdPractitioner = { name: d, hospital, role: "doctor", dateEncountered: today };
        if (!seen.has(key(ep))) { additions.push(ep); seen.add(key(ep)); }
      }
      for (const n of nurses.map((x) => x.trim()).filter(Boolean)) {
        const ep: EdPractitioner = { name: n, hospital, role: "nurse", dateEncountered: today };
        if (!seen.has(key(ep))) { additions.push(ep); seen.add(key(ep)); }
      }
      if (additions.length > 0) {
        const merged = [...existing, ...additions];
        const newData = { ...profileData, edPractitioners: merged };
        await sb.from("patient_profiles").update({ data: newData }).eq("patient_id", activePatientId);
        setProfileData(newData);
      }
    }

    clearDraft();
    setSaved(true);

    // Outcome=admitted moves the user onto the admissions log so they
    // can keep tracking the inpatient stay (treatments through stay,
    // discharge details once known). The admissions page picks up
    // ?edit=<id> and re-opens the same row in edit mode — no separate
    // duplicate admission row gets created.
    if (outcome === "admitted" && savedId) {
      if (typeof window !== "undefined") {
        window.location.href = `/admissions?edit=${savedId}`;
      }
    }
  };

  return (
    <AppShell>
      <MedicalDisclaimerBanner />

      {hasRestoredDraft && !saved && (
        <div className="mb-4 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-3 py-2 flex items-center gap-2">
          <div className="text-xs flex-1">
            <span className="font-semibold">Restored from where you left off.</span>
            <span className="text-[var(--ink-soft)]"> Save when ready, or discard if you don&apos;t want it.</span>
          </div>
          <button type="button" onClick={discardDraft} className="shrink-0 text-xs font-medium text-[var(--alert)]">
            Discard
          </button>
        </div>
      )}

      {/* Big red header */}
      <div className="rounded-2xl bg-[var(--alert)] text-white p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle size={32} />
          <h1 className="text-2xl font-extrabold uppercase tracking-wide">{isSupport ? `${firstName} is at Emergency` : "I am at Emergency"}</h1>
        </div>
        <p className="text-sm opacity-90">{isSupport ? `Log ${firstName}'s ED visit here.` : "Log your ED visit here."} This information will be saved to the admissions record and daily log.</p>
      </div>

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
          <div className="text-[var(--primary)] font-semibold text-lg mb-2">
            {editingId ? "ED visit updated" : "ED visit recorded"}
          </div>
          <p className="text-sm text-[var(--ink-soft)] mb-4">
            {editingId
              ? "Changes saved to the admission record."
              : "Saved to your admissions and flagged in your daily log. Treating staff added to your profile."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a href="/admissions" className="inline-block rounded-xl bg-[var(--primary)] text-white px-6 py-3 font-medium">
              View admissions
            </a>
            <button
              type="button"
              onClick={() => { setSaved(false); cancelEditing(); }}
              className="inline-block rounded-xl border border-[var(--border)] px-6 py-3 font-medium"
            >
              Log another ED visit
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Past ED visits — tap to re-open in edit mode so the user
               can amend (add discharge details, fix names, mark
               outcomes) instead of being stuck with what was logged
               at the time. */}
          {pastEdVisits.length > 0 && !editingId && (
            <Card>
              <div className="text-sm font-semibold mb-2">Past ED visits</div>
              <p className="text-xs text-[var(--ink-soft)] mb-2">Tap to update — useful for adding discharge details after the fact.</p>
              <ul className="space-y-1.5">
                {pastEdVisits.slice(0, 5).map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => startEditingEdVisit(v)}
                      className="w-full text-left rounded-xl border border-[var(--border)] px-3 py-2 active:bg-[var(--surface-soft)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm">
                          {v.admissionDate || format(parseISO(v.createdAt), "yyyy-MM-dd")}
                          {v.hospital && <span className="text-[var(--ink-soft)] font-normal"> · {v.hospital}</span>}
                        </div>
                        {v.dischargeDate && (
                          <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] px-2 py-0.5 font-semibold shrink-0">
                            Discharged {v.dischargeDate}
                          </span>
                        )}
                      </div>
                      {v.reason && (
                        <div className="text-xs text-[var(--ink-soft)] mt-0.5 truncate">
                          {v.reason.replace(/^ED presentation:\s*/i, "")}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {editingId && (
            <Card className="border-[var(--primary)]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-semibold text-[var(--primary)]">
                  Editing existing ED visit
                </div>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="text-xs text-[var(--ink-soft)] font-medium"
                >
                  Cancel
                </button>
              </div>
              <div className="text-xs text-[var(--ink-soft)] mb-2">
                Add treatments and results as they happen. When the visit ends, mark the outcome below — that&apos;s how this row gets closed off.
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="#outcome-card"
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] text-white px-3 py-1.5 text-xs font-semibold"
                >
                  Mark outcome ↓
                </a>
                {outcome && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--ink-soft)] px-3 py-1.5 text-xs">
                    Current: {outcome === "discharged" ? "Discharged home" : "Admitted to ward"}
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Time & Hospital */}
          <Card className="space-y-4">
            <Field label="Arrival time">
              <TextInput type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
            </Field>
            <HospitalPicker value={hospital} onChange={setHospital} known={knownHospitals} />
          </Card>

          {/* Reason — short headline for past visit picker + home banner */}
          <Card>
            <Field label="Reason for ED visit" hint="One-line summary — e.g. 'Suspected febrile neutropenia'">
              <TextInput
                value={presentations[0] ?? ""}
                onChange={(e) => setPresentations(e.target.value ? [e.target.value] : [])}
                placeholder="Suspected fever, bleeding, breathless..."
              />
            </Field>
          </Card>

          {/* Signal Sweep — replaces the old presentation picker. Captures
               vital signs, mood, pain etc. as discrete Signal entries that
               also appear on the daily trace, with a "during ED" tag so we
               can filter back to this visit later. */}
          <Card className="space-y-3 border-2 border-[var(--primary)]">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-[var(--primary)]" />
              <div className="text-sm font-bold text-[var(--primary)] uppercase tracking-wide">
                Signal Sweep
              </div>
            </div>
            <p className="text-xs text-[var(--ink-soft)]">
              Capture temperature, heart rate, pain, mood and other readings as the visit unfolds. Each one is timestamped, lands on the daily trace, and is tagged "during ED" so you can find it later.
            </p>
            <button
              type="button"
              onClick={launchSignalSweep}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-3 text-sm font-semibold active:scale-[0.99] transition"
            >
              <Stethoscope size={16} /> Open Signal Sweep
            </button>
            {edVisitSignals.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] font-semibold">
                  Captured this visit ({edVisitSignals.length})
                </div>
                <ul className="space-y-1">
                  {edVisitSignals.map((s) => {
                    const def = SIGNAL_BY_ID[s.signalType];
                    const label = def?.label ?? s.customLabel ?? s.signalType;
                    const time = format(parseISO(s.createdAt), "HH:mm");
                    const value = s.value != null
                      ? `${s.value}${s.unit ? ` ${s.unit}` : ""}`
                      : s.choice
                        ? s.choice
                        : s.score != null
                          ? `${s.score}/10`
                          : s.choices?.length
                            ? s.choices.join(", ")
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
            {!editingId && (
              <p className="text-[11px] text-[var(--ink-soft)]">
                Tapping will save what you&apos;ve entered so far so the signals can be tied back to this visit.
              </p>
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
              <p className="text-[11px] text-[var(--ink-soft)]">
                Names saved here will be added to your profile's Emergency Department list with today's date.
              </p>
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
                onKeyDown={(e) => {
                  // Enter on a typed value adds it as a custom treatment so
                  // anything not in the picklist still gets recorded.
                  if (e.key === "Enter" && treatmentSearch.trim()) {
                    e.preventDefault();
                    addTreatment(treatmentSearch.trim());
                  }
                }}
                placeholder="Type a treatment, or search the list below..."
              />
              {treatmentSearch && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-56 overflow-auto">
                  {filteredTreatments.map((t) => (
                    <button key={t} type="button" onClick={() => addTreatment(t)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-soft)] border-b border-[var(--border)] last:border-0">
                      {t}
                    </button>
                  ))}
                  {/* Free-text fallback: lets the user add anything not on the
                       picklist (e.g. a less-common imaging modality, a specific
                       brand of antibiotic). Always shown when the typed value
                       isn't already an exact match. */}
                  {!TREATMENT_OPTIONS.some((t) => t.toLowerCase() === treatmentSearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => addTreatment(treatmentSearch.trim())}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--surface-soft)] border-t border-[var(--border)]"
                    >
                      + Add &ldquo;{treatmentSearch.trim()}&rdquo;
                    </button>
                  )}
                  {filteredTreatments.length === 0 && !treatmentSearch.trim() && (
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
            {!treatmentSearch && (
              <div className="space-y-1.5">
                <div className="text-xs text-[var(--ink-soft)]">Quick pick — tap to add or remove</div>
                <div className="flex flex-wrap gap-1.5">
                  {TREATMENT_OPTIONS.map((t) => {
                    const added = treatments.some((x) => x.treatment === t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          if (added) {
                            setTreatments(treatments.filter((x) => x.treatment !== t));
                          } else {
                            addTreatment(t);
                          }
                        }}
                        className={
                          added
                            ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1.5 text-xs font-medium text-white"
                            : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)]"
                        }
                      >
                        {added ? "✓" : "+"} {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Outcome */}
          <div id="outcome-card" className="scroll-mt-20" aria-hidden />
          <Card className="space-y-3 border-2 border-[var(--alert)]">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-[var(--alert)]" />
              <div className="text-sm font-bold text-[var(--alert)] uppercase tracking-wide">
                Outcome — required to close visit
              </div>
            </div>
            <div className="text-xs text-[var(--ink-soft)]">
              Pick one once the patient leaves ED. Until this is set, this visit stays open and the home banner keeps surfacing it.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOutcome(outcome === "discharged" ? "" : "discharged")}
                className={
                  outcome === "discharged"
                    ? "rounded-xl border-2 border-[var(--primary)] bg-[var(--primary)] text-white px-3 py-3 text-sm font-medium"
                    : "rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-medium"
                }
              >
                Discharged home
              </button>
              <button
                type="button"
                onClick={() => setOutcome(outcome === "admitted" ? "" : "admitted")}
                className={
                  outcome === "admitted"
                    ? "rounded-xl border-2 border-[var(--alert)] bg-[var(--alert)] text-white px-3 py-3 text-sm font-medium"
                    : "rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-medium"
                }
              >
                Admitted to ward
              </button>
            </div>

            {outcome === "discharged" && (
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <Field label="Discharge date">
                  <DateInput
                    value={dischargeDate}
                    onChange={(e) => setDischargeDate(e.target.value)}
                  />
                </Field>
                <Field label="Discharge instructions" hint="Type or paste instructions from the discharge letter">
                  <TextArea
                    value={dischargeInstructions}
                    onChange={(e) => setDischargeInstructions(e.target.value)}
                    placeholder="Follow-up appointments, monitoring instructions, when to return..."
                  />
                </Field>
                <Field label="Discharge medications" hint="List any new prescriptions given on discharge">
                  <TextArea
                    value={dischargeMeds}
                    onChange={(e) => setDischargeMeds(e.target.value)}
                    placeholder="e.g. Augmentin Duo Forte 875/125mg twice daily for 7 days"
                  />
                </Field>
                <a
                  href="/meds?from=ed-discharge"
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-dashed border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)] px-3 py-2 text-sm font-medium"
                >
                  <Plus size={14} /> Add medication to Med Deck
                </a>
                <p className="text-xs text-[var(--ink-soft)]">Use the attachment card below to upload the discharge letter.</p>
              </div>
            )}

            {outcome === "admitted" && (
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Ward">
                    <TextInput
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      placeholder="e.g. 7 East / Oncology"
                    />
                  </Field>
                  <Field label="Bed number">
                    <TextInput
                      value={bedNumber}
                      onChange={(e) => setBedNumber(e.target.value)}
                      placeholder="e.g. 12B"
                    />
                  </Field>
                </div>
                <Field label="Admitting team / consultant">
                  <TextInput
                    value={admittingTeam}
                    onChange={(e) => setAdmittingTeam(e.target.value)}
                    placeholder="e.g. Haematology — Dr Patel"
                  />
                </Field>
                <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-3 py-3 text-xs text-[var(--ink-soft)]">
                  Saving will move {firstName ? `${firstName}` : "the patient"} onto the admissions log. The hospital, presentations, treatments, and results from this ED visit carry over to the same record so nothing has to be re-entered.
                </div>
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
            <FileUpload
              attachments={attachments}
              onChange={setAttachments}
              label={outcome === "discharged" ? "Attach discharge letter and any ED reports (photos or PDFs)" : "Attach ED reports (photos or PDFs)"}
            />
          </Card>

          {/* Save */}
          <button
            type="button"
            onClick={saveAsAdmission}
            className="w-full rounded-2xl bg-[var(--alert)] text-white font-bold py-5 text-lg active:scale-[0.99] transition"
          >
            {editingId ? "Update ED visit" : "Save ED visit"}
          </button>

          {/* Quick protocols — moved to the bottom per request, reference only */}
          <Card>
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
        </div>
      )}
    </AppShell>
  );
}

/** Hospital picker — dropdown from known hospitals (profile + past admissions
 *  + past appointments), manual text entry, and "Find near me" that uses the
 *  browser geolocation API + OpenStreetMap's free Overpass service to list
 *  nearby amenity=hospital results. */
function HospitalPicker({
  value, onChange, known,
}: {
  value: string;
  onChange: (v: string) => void;
  known: string[];
}) {
  const [nearby, setNearby] = useState<NearbyHospital[]>([]);
  const [locating, setLocating] = useState<"" | "locating" | "searching" | "done" | "denied" | "error" | "none">("");

  const findNearMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocating("error");
      return;
    }
    setLocating("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating("searching");
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          // 15 km radius. Overpass returns OSM nodes with name + distance.
          const q = `[out:json][timeout:15];
(
  node["amenity"="hospital"](around:15000,${lat},${lng});
  way["amenity"="hospital"](around:15000,${lat},${lng});
);
out center tags;`;
          const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(q),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
          const data = await res.json();
          type OverpassEl = { tags?: { name?: string }; lat?: number; lon?: number; center?: { lat: number; lon: number } };
          const hospitals: NearbyHospital[] = [];
          const seen = new Set<string>();
          for (const el of (data.elements ?? []) as OverpassEl[]) {
            const name = el.tags?.name;
            if (!name) continue;
            const k = name.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            const distanceM = elLat != null && elLon != null ? haversineM(lat, lng, elLat, elLon) : 0;
            hospitals.push({ name, distanceM });
          }
          hospitals.sort((a, b) => a.distanceM - b.distanceM);
          setNearby(hospitals);
          setLocating(hospitals.length === 0 ? "none" : "done");
        } catch {
          setLocating("error");
        }
      },
      (err) => {
        setLocating(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div className="space-y-2">
      <Field label="Hospital">
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Which emergency department?"
        />
      </Field>

      {/* Known hospitals — one-tap fill from profile + past visits */}
      {known.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)] font-semibold mb-1">
            From your records
          </div>
          <div className="flex flex-wrap gap-1.5">
            {known.map((h) => {
              const on = value === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => onChange(on ? "" : h)}
                  className={`rounded-full px-2.5 py-1 text-xs border transition ${
                    on
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {on && <Check size={11} className="inline mr-1 -mt-0.5" />}
                  {h}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Geolocation helper */}
      <div>
        <button
          type="button"
          onClick={findNearMe}
          disabled={locating === "locating" || locating === "searching"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          <MapPin size={14} />
          {locating === "locating" ? "Getting location…"
            : locating === "searching" ? "Looking up hospitals…"
            : "Find hospitals near me"}
        </button>
        {locating === "denied" && (
          <p className="text-[11px] text-[var(--ink-soft)] mt-1">
            Location permission denied — type the hospital manually.
          </p>
        )}
        {locating === "none" && (
          <p className="text-[11px] text-[var(--ink-soft)] mt-1">
            No hospitals found within 15 km of your current location.
          </p>
        )}
        {locating === "error" && (
          <p className="text-[11px] text-[var(--ink-soft)] mt-1">
            Couldn't fetch nearby hospitals. Try again or type manually.
          </p>
        )}
      </div>

      {nearby.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)] font-semibold mb-1">
            Nearby (tap to fill)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nearby.slice(0, 10).map((h) => {
              const on = value === h.name;
              const km = (h.distanceM / 1000).toFixed(1);
              return (
                <button
                  key={h.name}
                  type="button"
                  onClick={() => onChange(on ? "" : h.name)}
                  className={`rounded-full px-2.5 py-1 text-xs border transition ${
                    on
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {h.name} · {km} km
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Great-circle distance in metres (haversine). */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
