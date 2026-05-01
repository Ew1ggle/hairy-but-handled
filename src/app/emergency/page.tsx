"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, TextArea, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { useEntries, type Admission, type Appointment, type FlagEvent, type Signal, type TreatmentRow, type TreatmentCourse } from "@/lib/store";
import { TreatingTeamPicker } from "@/components/TreatingTeamPicker";
import { TreatmentPlanForm } from "@/components/TreatmentPlanForm";
import { ClinicianPicker } from "@/components/ClinicianPicker";
import { SIGNAL_BY_ID } from "@/lib/signals";
import { planTreatmentMedSync } from "@/lib/syncTreatmentMeds";
import { getOpenEdVisit, isEdVisit } from "@/lib/admissionContext";
import { useCareTeamMembers } from "@/lib/useCareTeam";
import { QuickSignalLogger } from "@/components/QuickSignalLogger";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { Activity, AlertTriangle, Plus, Trash2, Building2, Droplet, Dog, UserX, ShieldAlert, Flag, MapPin, Check, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePatientName } from "@/lib/usePatientName";
import { FileUpload, type Attachment } from "@/components/FileUpload";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";

// Treatment-row UI + helpers live in a shared component to keep
// /emergency and /admissions in lockstep.
import {
  TREATMENT_OPTIONS,
  TEST_OPTIONS,
  MEDICATION_OPTIONS,
  TreatmentRowEditor,
} from "@/components/TreatmentRowEditor";

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
  const medsAll = useEntries("med");
  const dosesAll = useEntries("dose");

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

  const [arrivalDate, setArrivalDate] = useState(format(new Date(), "yyyy-MM-dd"));
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
  // True when the form silently re-opened an in-progress ED visit
  // (no ?edit param, no explicit picker tap — just an open visit
  // detected on mount). Drives a banner at the top of the form so
  // the user knows they're editing not creating, with a one-tap
  // path to start fresh if that wasn't what they wanted.
  const [wasAutoResumed, setWasAutoResumed] = useState(false);

  /** ED-visit admissions, newest first. The picker at the top lets the
   *  user re-open one to amend (e.g. add the discharge details after the
   *  fact, fix a typed name, mark the outcome). */
  const pastEdVisits = useMemo(
    () => admissions
      .filter(isEdVisit)
      .sort((a, b) => (b.admissionDate ?? "").localeCompare(a.admissionDate ?? "")),
    [admissions],
  );

  const startEditingEdVisit = (a: Admission) => {
    setEditingId(a.id);
    setSaved(false);
    // Default off — auto-resume code path overrides to true afterwards.
    setWasAutoResumed(false);
    setArrivalDate(a.admissionDate ?? format(new Date(), "yyyy-MM-dd"));
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
    setWasAutoResumed(false);
    setArrivalDate(format(new Date(), "yyyy-MM-dd"));
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

  // Known doctor / nurse pickers — pull from profile.edPractitioners
  // (saved on every ED visit save), the patient's care-team
  // practitioners (so the GP / hematologist surfaces as a chip when
  // they happen to be at ED too), plus any names already typed onto
  // this admission's doctors[] / nurses[] arrays. De-duped case-
  // insensitively.
  const careTeam = useCareTeamMembers();
  const knownDoctors = useMemo(() => {
    const seen = new Map<string, string>();
    const add = (name: string | undefined) => {
      if (!name?.trim()) return;
      const k = name.trim().toLowerCase();
      if (!seen.has(k)) seen.set(k, name.trim());
    };
    const eds = (profileData.edPractitioners as EdPractitioner[] | undefined) ?? [];
    for (const p of eds) if (p.role === "doctor") add(p.name);
    for (const m of careTeam) add(m.value);
    for (const a of admissions) for (const d of (a.doctors ?? [])) add(d);
    return Array.from(seen.values()).sort();
  }, [profileData, careTeam, admissions]);
  const knownNurses = useMemo(() => {
    const seen = new Map<string, string>();
    const add = (name: string | undefined) => {
      if (!name?.trim()) return;
      const k = name.trim().toLowerCase();
      if (!seen.has(k)) seen.set(k, name.trim());
    };
    const eds = (profileData.edPractitioners as EdPractitioner[] | undefined) ?? [];
    for (const p of eds) if (p.role === "nurse") add(p.name);
    for (const a of admissions) for (const n of (a.nurses ?? [])) add(n);
    return Array.from(seen.values()).sort();
  }, [profileData, admissions]);

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
    const open = getOpenEdVisit(admissions);
    if (open) {
      startEditingEdVisit(open);
      setWasAutoResumed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissions]);

  const { clear: clearDraft } = useDraft<{
    arrivalDate: string;
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
    state: { arrivalDate, arrivalTime, hospital, presentations, presentationOther, doctors, nurses, treatments, notes, outcome, dischargeDate, dischargeInstructions, dischargeMeds, ward, bedNumber, admittingTeam },
    onRestore: (d) => {
      if (d.arrivalDate) setArrivalDate(d.arrivalDate);
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
    const isCustom = name.trim().toLowerCase() === "other";
    setTreatments([
      ...treatments,
      { id: crypto.randomUUID(), treatment: name, details: "", ...(isCustom ? { isCustom: true } : {}) },
    ]);
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

  /** Stub-create the admission row for this visit when it doesn't
   *  exist yet, so signals (and other linked data) have an FK to
   *  attach to. Returns the existing id if already saved, or the
   *  freshly-created stub id otherwise. */
  const launchSignalSweepStub = async (): Promise<string | null> => {
    if (editingId) return editingId;
    const today = format(new Date(), "yyyy-MM-dd");
    const stub = await addEntry({
      kind: "admission",
      admissionDate: arrivalDate || today,
      hospital,
      reason: presentationText ? `ED presentation: ${presentationText}` : "ED visit",
      edVisit: true,
      arrivalTime: arrivalTime || undefined,
      presentations: presentations.length ? presentations : undefined,
      doctors: doctors.filter(Boolean),
      nurses: nurses.filter(Boolean),
    } as Omit<Admission, "id" | "createdAt">);
    const id = stub?.id ?? null;
    if (id) setEditingId(id);
    return id;
  };

  const saveAsAdmission = async () => {
    // Soft validation. Don't block — Terri may be partway through a
    // visit and want to save what she has — but flag obviously-empty
    // saves so they aren't silently lost. Skip the prompt in edit
    // mode (the row already exists; she's intentionally amending).
    if (!editingId && !hospital.trim() && !presentationText.trim()) {
      const ok = typeof window !== "undefined" && window.confirm(
        "No hospital and no reason recorded yet. Save this ED visit as a draft anyway?",
      );
      if (!ok) return;
    }

    const today = format(new Date(), "yyyy-MM-dd");

    const payload = {
      hospital,
      reason: presentationText ? `ED presentation: ${presentationText}` : "ED visit",
      treatments,
      attachments,
      edVisit: true,
      // Arrival date/time of the ED visit. admissionDate carries the
      // ED arrival date so multi-day stays land on the right slot in
      // the timeline (a visit that started yesterday but is logged
      // today shouldn't show as starting today).
      admissionDate: arrivalDate || today,
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
      // Edit-mode: update the existing admission row. admissionDate
      // is intentionally part of the payload so the user can correct
      // an arrival date they got wrong on the first save.
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

    // Auto-sync course-style treatment rows → MedEntry + DoseEntry.
    // Same logic as /admissions save — keeps the in-hospital meds
    // visible on /meds and dose tracker for the term of the stay.
    if (savedId) {
      const synthAdmission: Admission = {
        ...(payload as unknown as Admission),
        id: savedId,
        createdAt: editingId
          ? (admissions.find((a) => a.id === editingId)?.createdAt ?? new Date().toISOString())
          : new Date().toISOString(),
      };
      const plan = planTreatmentMedSync({
        admission: synthAdmission,
        existingMeds: medsAll,
        existingDoses: dosesAll,
      });
      for (const m of plan.medsToCreate) await addEntry(m);
      for (const u of plan.medsToUpdate) await updateEntry(u.id, u.patch);
      for (const d of plan.dosesToCreate) await addEntry(d);
      for (const u of plan.dosesToUpdate) await updateEntry(u.id, u.patch);
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
                {pastEdVisits.slice(0, 5).map((v) => {
                  // Outcome chip: "Open" while the visit hasn't closed,
                  // "ED → Home" or "ED → Ward" once it has, so a glance
                  // shows where the patient ended up. Falls back to the
                  // legacy dischargeDate-only data on old rows that
                  // don't have the outcome field set.
                  const outcomeKind: "open" | "discharged" | "admitted" = v.outcome
                    ? v.outcome
                    : v.dischargeDate
                      ? "discharged"
                      : "open";
                  const chipText =
                    outcomeKind === "discharged"
                      ? "ED → Home"
                      : outcomeKind === "admitted"
                        ? `ED → Ward${v.ward ? ` (${v.ward})` : ""}`
                        : "Ongoing";
                  const chipClass =
                    outcomeKind === "discharged"
                      ? "bg-[var(--primary)] text-white"
                      : outcomeKind === "admitted"
                        ? "bg-[var(--alert)] text-white"
                        : "bg-[var(--alert-soft)] text-[var(--alert)] border border-[var(--alert)]";
                  return (
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
                          <span className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold shrink-0 ${chipClass}`}>
                            {chipText}
                          </span>
                        </div>
                        {v.reason && (
                          <div className="text-xs text-[var(--ink-soft)] mt-0.5 truncate">
                            {v.reason.replace(/^ED presentation:\s*/i, "")}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <EdJourneyCard
            arrivalDate={arrivalDate}
            arrivalTime={arrivalTime}
            hospital={hospital}
            treatmentCount={treatments.length}
            signalCount={edVisitSignals.length}
            outcome={outcome}
            ward={ward}
            bedNumber={bedNumber}
            dischargeDate={dischargeDate}
            isEditing={!!editingId}
            onCancelEditing={cancelEditing}
          />

          {/* Admitted-from-ED cue. When this visit's outcome is
               "admitted", the row also lives on /admissions as the
               ward stay — but the ED phase data here (arrival time,
               presentations, ED doctors / nurses, ED treatments)
               stays the standalone record of what happened in
               Emergency. Banner makes that explicit so the user
               doesn't think the ED log was overwritten when the
               admission took over. */}
          {editingId && outcome === "admitted" && (
            <Card className="!border-2 !border-[var(--primary)] bg-[var(--surface-soft)]">
              <div className="flex items-start gap-3">
                <Building2 size={18} className="text-[var(--primary)] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="font-semibold">ED log retained — also a ward admission</div>
                  <div className="text-[var(--ink-soft)] text-xs mt-0.5">
                    The ED phase you logged here (arrival, presentations, ED-phase doctors, treatments) stays as this visit&apos;s standalone record. Ward-stay updates (ward / bed / discharge / doctor rounds) live on the admissions log.
                  </div>
                </div>
                <Link
                  href={`/admissions?edit=${editingId}`}
                  className="text-xs font-semibold text-[var(--primary)] shrink-0"
                >
                  Open admission
                </Link>
              </div>
            </Card>
          )}

          {/* Auto-resume cue. The form silently re-opened an
               in-progress ED visit on mount — without a banner, the
               user could think they were filling in a fresh entry and
               wonder why hospital / arrival time were already set. */}
          {wasAutoResumed && editingId && (
            <Card className="!border-2 !border-[var(--accent)] bg-[var(--surface-soft)]">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="font-semibold">Continuing your open ED visit</div>
                  <div className="text-[var(--ink-soft)] text-xs mt-0.5">
                    {arrivalDate && `Arrived ${format(parseISO(arrivalDate), "EEE d MMM")}`}
                    {arrivalTime && ` · ${arrivalTime}`}
                    {hospital && ` · ${hospital}`} — anything you change saves to this row.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cancelEditing();
                    setSaved(false);
                  }}
                  className="text-xs font-semibold text-[var(--primary)] shrink-0"
                >
                  Start fresh
                </button>
              </div>
            </Card>
          )}

          {/* Arrival date/time + Hospital. Date matters because ED stays
               can run more than a day — a visit that started yesterday
               and is still going shouldn't be re-stamped to today. */}
          <Card className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Arrival date">
                <DateInput value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
              </Field>
              <Field label="Arrival time">
                <TextInput type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
              </Field>
            </div>
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

          {/* Signal Sweep — quick logger handles temp / SpO₂ / pulse /
               blood sugar inline so vitals don't require a page switch.
               Full picker still one tap away via the link inside the
               quick logger for less common signals (mood, pain
               location, sleep, exposure). */}
          <QuickSignalLogger
            edVisitId={editingId}
            returnTo={`/emergency${editingId ? `?edit=${editingId}` : ""}`}
            onLaunchUnsaved={async () => {
              const id = await launchSignalSweepStub();
              return id;
            }}
          />
          <Card className="space-y-3">
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
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <div className="flex-1 min-w-0">
                    <ClinicianPicker
                      value={d}
                      onChange={(v) => { const arr = [...doctors]; arr[i] = v; setDoctors(arr); }}
                      known={knownDoctors}
                      placeholder="Doctor name (e.g. Dr Patel)"
                    />
                  </div>
                  {doctors.length > 1 && (
                    <button type="button" onClick={() => setDoctors(doctors.filter((_, idx) => idx !== i))} className="text-[var(--ink-soft)] p-2 shrink-0">
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
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <div className="flex-1 min-w-0">
                    <ClinicianPicker
                      value={n}
                      onChange={(v) => { const arr = [...nurses]; arr[i] = v; setNurses(arr); }}
                      known={knownNurses}
                      placeholder="Nurse name"
                    />
                  </div>
                  {nurses.length > 1 && (
                    <button type="button" onClick={() => setNurses(nurses.filter((_, idx) => idx !== i))} className="text-[var(--ink-soft)] p-2 shrink-0">
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
            {/* Quick-pick chip strips up top so the picker is always
                 visible — selected items group below by category so a
                 long visit doesn't read as a wall of mixed rows. */}
            {!treatmentSearch && (
              <div className="space-y-2">
                <div className="text-xs text-[var(--ink-soft)]">Quick pick — tap to add or remove</div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                    Tests / investigations
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEST_OPTIONS.map((t) => {
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
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
                    Medications / treatments
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDICATION_OPTIONS.map((t) => {
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
              </div>
            )}

            {treatments.length > 0 && (() => {
              const selectedTests = treatments.filter((t) => TEST_OPTIONS.includes(t.treatment));
              const selectedMeds = treatments.filter((t) => !TEST_OPTIONS.includes(t.treatment));
              return (
                <div className="space-y-4">
                  {selectedTests.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1.5">
                        Tests added ({selectedTests.length})
                      </div>
                      <div className="space-y-2">
                        {selectedTests.map((t) => (
                          <TreatmentRowEditor
                            key={t.id}
                            row={t}
                            onChange={(patch) => setTreatments(treatments.map((x) => x.id === t.id ? { ...x, ...patch } : x))}
                            onRemove={() => setTreatments(treatments.filter((x) => x.id !== t.id))}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedMeds.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1.5">
                        Medications added ({selectedMeds.length})
                      </div>
                      <div className="space-y-2">
                        {selectedMeds.map((t) => (
                          <TreatmentRowEditor
                            key={t.id}
                            row={t}
                            onChange={(patch) => setTreatments(treatments.map((x) => x.id === t.id ? { ...x, ...patch } : x))}
                            onRemove={() => setTreatments(treatments.filter((x) => x.id !== t.id))}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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
                <Field label="Treating team / consultant" hint="Tap a team or type your own">
                  <TreatingTeamPicker value={admittingTeam} onChange={setAdmittingTeam} />
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

          {/* Save — copy reflects what'll happen next so the redirect to
               /admissions doesn't feel like a surprise. */}
          <button
            type="button"
            onClick={saveAsAdmission}
            className="w-full rounded-2xl bg-[var(--alert)] text-white font-bold py-5 text-lg active:scale-[0.99] transition"
          >
            {outcome === "admitted"
              ? "Save & open admissions log →"
              : outcome === "discharged"
                ? "Close visit — discharged home"
                : editingId
                  ? "Update ED visit"
                  : "Save ED visit"}
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

/** Journey card at the top of /emergency — three step badges
 *  (Arrived → In treatment → Outcome) coloured by current state, with
 *  the discharge or admission destination spelled out so the user can
 *  see at a glance where the visit is at. Renders for both new and
 *  edit-mode visits; the Cancel button only shows in edit mode.
 *
 *  Step states:
 *   - "done" filled green/primary with check
 *   - "active" filled red/alert
 *   - "pending" outlined dashed border
 */
function EdJourneyCard({
  arrivalDate,
  arrivalTime,
  hospital,
  treatmentCount,
  signalCount,
  outcome,
  ward,
  bedNumber,
  dischargeDate,
  isEditing,
  onCancelEditing,
}: {
  arrivalDate: string;
  arrivalTime: string;
  hospital: string;
  treatmentCount: number;
  signalCount: number;
  outcome: "" | "discharged" | "admitted";
  ward: string;
  bedNumber: string;
  dischargeDate: string;
  isEditing: boolean;
  onCancelEditing: () => void;
}) {
  const arrived = !!(arrivalDate || arrivalTime || hospital);
  // Build a compact arrival label that includes the date when it
  // isn't today, so multi-day ED stays don't lose the timeline cue.
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const dateChunk = arrivalDate && arrivalDate !== todayStr
    ? format(parseISO(arrivalDate), "d MMM")
    : "";
  const arrivedSummary = (() => {
    const parts: string[] = [];
    if (dateChunk) parts.push(dateChunk);
    if (arrivalTime) parts.push(arrivalTime);
    if (hospital) parts.push(hospital.split(" ").slice(0, 2).join(" "));
    return parts.length ? parts.join(" · ") : "ED";
  })();
  const inTreatment = treatmentCount > 0 || signalCount > 0;
  const closed = !!outcome;

  // Step status: arrived once arrival or hospital is set; in-treatment
  // once any treatment row or ED signal is captured; closed once outcome
  // is picked. Active step is the next one that isn't done yet.
  const arrivedState: "done" | "active" | "pending" = arrived ? "done" : "active";
  const treatmentState: "done" | "active" | "pending" =
    inTreatment ? "done" : arrived ? "active" : "pending";
  const outcomeState: "done" | "active" | "pending" =
    closed ? "done" : inTreatment ? "active" : "pending";

  const stepClass = (state: "done" | "active" | "pending") => {
    if (state === "done") return "bg-[var(--primary)] text-white border-[var(--primary)]";
    if (state === "active") return "bg-[var(--alert)] text-white border-[var(--alert)] animate-pulse";
    return "bg-[var(--surface)] text-[var(--ink-soft)] border-dashed border-[var(--border)]";
  };

  const outcomeLabel = (() => {
    if (outcome === "discharged") {
      return dischargeDate ? `Discharged ${dischargeDate}` : "Discharged home";
    }
    if (outcome === "admitted") {
      const tail = [ward, bedNumber && `Bed ${bedNumber}`].filter(Boolean).join(" · ");
      return tail ? `Admitted — ${tail}` : "Admitted to ward";
    }
    return "Ongoing — pick once decision made";
  })();

  return (
    <Card className="space-y-3 border-2 border-[var(--primary)]">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold uppercase tracking-wide text-[var(--primary)]">
          {isEditing
            ? dateChunk
              ? `Resuming ED visit from ${dateChunk}`
              : "ED visit in progress"
            : "New ED visit"}
        </div>
        {isEditing && (
          <button type="button" onClick={onCancelEditing} className="text-xs text-[var(--ink-soft)] font-medium">
            Start fresh
          </button>
        )}
      </div>

      {/* Three-step strip */}
      <div className="flex items-stretch gap-1.5">
        <div className={`flex-1 rounded-xl border-2 px-2 py-2 text-center ${stepClass(arrivedState)}`}>
          <div className="text-[10px] uppercase tracking-wider opacity-80">1 · Arrived</div>
          <div className="text-xs font-semibold mt-0.5">
            {arrived ? arrivedSummary : "Tap arrival date/time below"}
          </div>
        </div>
        <div className="self-center text-[var(--ink-soft)]">→</div>
        <div className={`flex-1 rounded-xl border-2 px-2 py-2 text-center ${stepClass(treatmentState)}`}>
          <div className="text-[10px] uppercase tracking-wider opacity-80">2 · Treatment</div>
          <div className="text-xs font-semibold mt-0.5">
            {inTreatment
              ? `${treatmentCount} tx${signalCount > 0 ? ` · ${signalCount} signal${signalCount === 1 ? "" : "s"}` : ""}`
              : "Add as it happens"}
          </div>
        </div>
        <div className="self-center text-[var(--ink-soft)]">→</div>
        <div className={`flex-1 rounded-xl border-2 px-2 py-2 text-center ${stepClass(outcomeState)}`}>
          <div className="text-[10px] uppercase tracking-wider opacity-80">3 · Outcome</div>
          <div className="text-xs font-semibold mt-0.5">{outcomeLabel}</div>
        </div>
      </div>

      {/* Pathway hint */}
      <div className="rounded-xl bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--ink-soft)]">
        {!closed && (
          <>
            Two paths from here: <b className="text-[var(--ink)]">discharged home</b> (with discharge letter + meds) or{" "}
            <b className="text-[var(--ink)]">admitted to ward</b> (with ward + bed). Pick one in the Outcome card below to close the visit.
          </>
        )}
        {outcome === "discharged" && (
          <>
            Pathway: <b className="text-[var(--ink)]">ED → Discharged home</b>. This visit will close once saved; remember to add discharge meds to the Med Deck if any were given.
          </>
        )}
        {outcome === "admitted" && (
          <>
            Pathway: <b className="text-[var(--ink)]">ED → Admitted to ward</b>. Saving will move tracking onto the admissions log so the inpatient stay can be followed through to discharge.
          </>
        )}
      </div>

      {!closed && (
        <a
          href="#outcome-card"
          className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] text-white px-3 py-1.5 text-xs font-semibold"
        >
          Mark outcome ↓
        </a>
      )}
    </Card>
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
