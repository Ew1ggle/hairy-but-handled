"use client";
import AppShell from "@/components/AppShell";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { format, parseISO, subDays, isToday } from "date-fns";
import { Printer } from "lucide-react";
import { AttachmentList, type Attachment } from "@/components/FileUpload";
import { SIGNAL_BY_ID, formatReading, CATEGORY_LABEL, type Category } from "@/lib/signals";
import { getBaselineComparison, getBloodsComparison } from "@/lib/trends";
import { BaselineVitalsTable, BloodsComparisonTable } from "@/components/ComparisonTables";

type SupportPerson = { id: string; name?: string; phone?: string; email?: string; relationship?: string; isEPOA?: boolean };
type EmergencyContact = { id: string; name?: string; phone?: string; relationship?: string };
type Allergy = { id: string; classification?: string; name?: string; hayFever?: boolean; asthma?: boolean; hives?: boolean; anaphylaxis?: boolean; otherChecked?: boolean; other?: string };
type HistoryRow = { id: string; category: string; details?: string; date?: string };
type AdditionalDiagnosis = { id: string; details?: string; date?: string };
type AdditionalSymptom = { id: string; text?: string; answer?: string };
type CustomPractitioner = { id: string; label?: string; name?: string; phone?: string; mobile?: string; clinic?: string; email?: string; website?: string; na?: boolean; status?: "current" | "previous" | ""; since?: string; from?: string; to?: string };
type Pathology = {
  requestedDate?: string; collectedDate?: string; reportedDate?: string; reportFor?: string; reportForOther?: string; copyTo?: string;
  biopsyType?: string; biopsyPerformedAt?: string; biopsyPerformedBy?: string; biopsyDate?: string;
  clinicalNotes?: string;
  hb?: string; mcv?: string; platelets?: string; wcc?: string; retic?: string;
  otherInvestigations?: string; bloodFilm?: string;
  biopsySite?: string; boneConsistency?: string; aspirateNotes?: string;
  diffNeutrophils?: string; diffLymphocytes?: string; diffMonocytes?: string; diffEosinophils?: string;
  diffMetamyelocytes?: string; diffProerythroblasts?: string; diffBasophilicErythroblasts?: string;
  diffPolychromaticErythroblasts?: string; diffOrthochromaticErythroblasts?: string; diffPlasmaCells?: string;
  diffBasophils?: string; meRatio?: string;
  smearComment?: string;
  specimenType?: string; specimenQuality?: string;
  cellularity?: string; megakaryocytes?: string; erythron?: string; leukon?: string;
  lymphoidPlasma?: string; otherInfiltrate?: string; bloodVessels?: string; reticulin?: string;
  boneTrabeculae?: string; specialStains?: string; salientFeatures?: string; conclusions?: string;
};
type ProfileT = {
  [key: string]: unknown;
  name?: string; dob?: string; medicareNumber?: string; medicarePosition?: string; medicareExpiry?: string;
  bloodType?: string;
  privateFundName?: string; privateFundNumber?: string; privateFundPosition?: string; privateFundCoverage?: string;
  supportPeople?: SupportPerson[];
  emergencyContacts?: EmergencyContact[];
  customPractitioners?: CustomPractitioner[];
  diagnosis?: string; diagnosisOther?: string; diagnosisDate?: string; brafResult?: string;
  additionalDiagnoses?: AdditionalDiagnosis[];
  preferredName?: string;
  spleen?: string; spleenEnlarged?: string; spleenUpperLeftPain?: string; spleenEarlySatiety?: string;
  flowMarkers?: Record<string, string>; flowMarkersNotTested?: Record<string, boolean>; flowMarkersNotes?: string;
  regimen?: string; regimenOther?: string; startDate?: string;
  allergies?: Allergy[]; medicalHistory?: HistoryRow[]; historyNA?: Record<string, boolean>;
  baselineWeight?: string; baselineHeight?: string; baselineTemp?: string; baselineBP?: string; baselineHR?: string;
  genderIdentity?: string; genderIdentityOther?: string; sexAtBirth?: string; sexAtBirthOther?: string;
  pronouns?: string; pronounsNeo?: string; pronounsNeoOther?: string; pronounsOther?: string;
  symptoms?: Record<string, string>; additionalSymptoms?: AdditionalSymptom[];
  treatmentInstructions?: string; valuesDirective?: string; notes?: string;
  pathology?: Pathology;
};

const PRACT_KEYS = [
  { key: "hematologist", label: "Hematologist" },
  { key: "immunologist", label: "Immunologist" },
  { key: "psychologist", label: "Psychologist" },
  { key: "psychiatrist", label: "Psychiatrist" },
  { key: "gp", label: "GP" },
  { key: "coordinator", label: "Cancer care coordinator" },
] as const;

const SYMPTOM_GROUPS: { heading: string; items: string[] }[] = [
  { heading: "Extreme fatigue / weakness", items: ["Constant tiredness", "Anaemia (low red blood cell count)", "Lack of energy"] },
  { heading: "Abdominal fullness / pain", items: ["Upper left discomfort or 'dragging' sensation (enlarged spleen)"] },
  { heading: "Frequent infections", items: ["Recurring infections", "Slow healing"] },
  { heading: "Easy bruising or bleeding", items: ["Unexplained bruises", "Petechiae (tiny red/purple spots)", "Nosebleeds", "Heavy bleeding"] },
  { heading: "Weight loss and night sweats", items: ["Unexplained weight loss", "Drenching night sweats"] },
  { heading: "Pale skin / breathlessness", items: ["Pallor", "Shortness of breath on normal activity"] },
];

const HISTORY_CATEGORIES = [
  "Active or Recent Infections",
  "Previous Infections",
  "Autoimmune Disorders",
  "Previous Cancers",
  "Metabolic and Cardiovascular History",
  "Spleen History",
  "NSAID use",
  "Warfarin use",
  "Organ Function",
  "Vaccination History",
  "Gynecological History",
];

export default function ExportPage() {
  const admissions = useEntries("admission").slice().sort((a, b) => (b.admissionDate ?? "").localeCompare(a.admissionDate ?? ""));
  const daily = useEntries("daily").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const infusions = useEntries("infusion").slice().sort((a, b) => a.cycleDay - b.cycleDay);
  const bloods = useEntries("bloods").slice().sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""));
  const meds = useEntries("med");
  const questions = useEntries("question");
  const flags = useEntries("flag").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const appointments = useEntries("appointment");
  const signals = useEntries("signal").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const trendEntries = useEntries("trend").slice().sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  const doses = useEntries("dose").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fuel = useEntries("fuel").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const hydration = useEntries("hydration").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const symptomCards = useEntries("symptom").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const relief = useEntries("relief").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const todayApps = appointments.filter((a) => a.date && isToday(parseISO(a.date))).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const upcomingApps = appointments.filter((a) => a.date && parseISO(a.date) > new Date() && !isToday(parseISO(a.date))).sort((a, b) => a.date.localeCompare(b.date));
  const pastApps = appointments.filter((a) => a.date && parseISO(a.date) < new Date() && !isToday(parseISO(a.date))).sort((a, b) => b.date.localeCompare(a.date));
  const edVisitFlags = flags.filter((f) => (f as unknown as { wentToED?: boolean }).wentToED);
  const edVisitDailyLogs = daily.filter((d) => (d as unknown as { edVisit?: boolean }).edVisit);
  const unansweredQs = questions.filter((q) => !q.answer);

  const [showAll, setShowAll] = useState(false);
  const cutoff = subDays(new Date(), 14).toISOString();
  const recentDaily = showAll ? daily : daily.filter((d) => d.createdAt >= cutoff);
  const recentFlags = showAll ? flags : flags.filter((f) => f.createdAt >= cutoff);
  const recentSignals = showAll ? signals : signals.filter((s) => s.createdAt >= cutoff);
  const recentPastApps = showAll ? pastApps : pastApps.filter((a) => a.date && a.date >= cutoff.slice(0, 10));
  const recentDoses = showAll ? doses : doses.filter((d) => d.createdAt >= cutoff);
  const recentFuel = showAll ? fuel : fuel.filter((f) => f.createdAt >= cutoff);
  const recentHydration = showAll ? hydration : hydration.filter((h) => h.createdAt >= cutoff);
  const activeSymptomCards = symptomCards.filter((s) => s.stillActive !== false);
  const resolvedSymptomCards = symptomCards.filter((s) => s.stillActive === false);
  const recentRelief = showAll ? relief : relief.filter((r) => r.createdAt >= cutoff);

  const { activePatientId } = useSession();
  const [profile, setProfile] = useState<ProfileT | null>(null);
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => setProfile((data?.data as ProfileT) ?? null));
  }, [activePatientId]);

  const diagnosisLabel =
    profile?.diagnosis === "Other" ? profile?.diagnosisOther ?? "Other" : profile?.diagnosis ?? "";
  const regimenLabel =
    profile?.regimen === "Other" ? profile?.regimenOther ?? "Other" : profile?.regimen ?? "";
  const support = profile?.supportPeople ?? [];
  const epoa = support.filter((s) => s.isEPOA);
  const allergies = profile?.allergies ?? [];
  const medHistory = profile?.medicalHistory ?? [];
  const historyNA = profile?.historyNA ?? {};
  const additionalSymptoms = profile?.additionalSymptoms ?? [];

  const exportFilename = `HBH_Export${showAll ? "_AllRecords" : ""}_${format(new Date(), "yyyy-MM-dd")}`;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = exportFilename;
    window.print();
    // Restore after a short delay so the print dialog picks up the new title
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  return (
    <AppShell>
      <div className="no-print mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="display text-3xl">Summary for the team</h1>
            <p className="text-[var(--ink-soft)] text-sm mt-1">{showAll ? "All records" : "Last 14 days of activity"} plus the full patient profile.</p>
          </div>
          <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 font-medium shrink-0">
            <Printer size={16} /> Print / PDF
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAll(false)} className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium border ${!showAll ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
            Last 14 days
          </button>
          <button onClick={() => setShowAll(true)} className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium border ${showAll ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
            All records
          </button>
        </div>
      </div>

      <div className="print-root report">
        {/* Cover */}
        <header className="mb-8 pb-4 border-b-2 border-[var(--primary)]">
          <div className="flex items-center gap-4 mb-3">
            <img src="/logo.png" alt="Hairy but Handled" className="h-20 w-auto" />
            <div className="brand-font">
              <div className="text-2xl font-semibold uppercase tracking-[0.15em] text-[var(--ink)]">Clinical Summary</div>
              <div className="text-[11px] font-light uppercase tracking-[0.25em] text-[var(--ink-soft)] mt-1">Hairy but Handled</div>
            </div>
          </div>
          <h2 className="display text-3xl mt-1">{profile?.name || "(patient name not set)"}</h2>
          {profile?.preferredName && profile.preferredName.trim() && profile.preferredName.trim() !== profile?.name?.trim() && (
            <div className="text-sm text-[var(--ink-soft)] mt-1">Goes by <b>{profile.preferredName}</b></div>
          )}
          <div className="text-sm text-[var(--ink-soft)] mt-2 flex flex-wrap gap-x-6 gap-y-1">
            {profile?.dob && <span>DOB {profile.dob}</span>}
            {profile?.medicareNumber && (
              <span>
                Medicare {profile.medicareNumber}
                {profile.medicarePosition ? ` #${profile.medicarePosition}` : ""}
                {profile.medicareExpiry ? ` · exp ${profile.medicareExpiry}` : ""}
              </span>
            )}
            {profile?.bloodType && <span>Blood type: <b>{profile.bloodType}</b></span>}
            {diagnosisLabel && <span>Diagnosis: <b>{diagnosisLabel}</b>{profile?.diagnosisDate ? ` (${profile.diagnosisDate})` : ""}</span>}
            {regimenLabel && <span>Regimen: <b>{regimenLabel}</b>{profile?.startDate ? ` · start ${profile.startDate}` : ""}</span>}
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-2 flex flex-wrap gap-x-4">
            <span>Report generated {format(new Date(), "d MMM yyyy, h:mm a")}</span>
            {(profile as unknown as { profileCompletedDate?: string })?.profileCompletedDate && (
              <span>Profile completed {format(parseISO((profile as unknown as { profileCompletedDate: string }).profileCompletedDate), "d MMM yyyy")}</span>
            )}
          </div>
        </header>

        {todayApps.length > 0 && (
          <section className="mb-8 rounded-2xl border-2 border-[var(--primary)] p-4 print-break">
            <div className="text-xs uppercase tracking-widest text-[var(--primary)] font-semibold">Today's agenda</div>
            <div className="mt-2 text-sm">
              {todayApps.map((a) => (
                <div key={a.id} className="mb-1">
                  <b>{a.time || "Time not set"}</b>{a.type && ` · ${a.type}`}{a.provider && ` · ${a.provider}`}{a.location && ` · ${a.location}`}
                  {a.notes && <span className="text-[var(--ink-soft)]"> — {a.notes}</span>}
                </div>
              ))}
            </div>
            {unansweredQs.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">Questions to raise</div>
                <ol className="text-sm pl-5 list-decimal space-y-1">
                  {unansweredQs.map((q) => <li key={q.id}>{q.question}</li>)}
                </ol>
              </div>
            )}
            {recentFlags.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">Red flags since last visit</div>
                <ul className="text-sm pl-5 list-disc space-y-1">
                  {recentFlags.slice(0, 8).map((f) => (
                    <li key={f.id}>
                      <span className="text-[var(--ink-soft)]">{format(parseISO(f.createdAt), "d MMM h:mm a")}</span> — {f.triggerLabel}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Recent activity — at top so doctor sees it first */}
        <Section title={showAll ? "Red flags (all)" : "Red flags (last 14 days)"}>
          {recentFlags.length === 0 ? <Empty /> : (
            <ul className="space-y-1 text-sm">
              {recentFlags.map((f) => (
                <li key={f.id} className="flex gap-3">
                  <span className="w-28 text-[var(--ink-soft)] shrink-0">{format(parseISO(f.createdAt), "d MMM, h:mm a")}</span>
                  <span className="flex-1">{f.triggerLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Emergency department visits">
          {edVisitFlags.length === 0 && edVisitDailyLogs.length === 0 && admissions.filter((a) => a.reason?.startsWith("ED presentation")).length === 0 ? <Empty /> : (
            <div className="space-y-3">
              {admissions.filter((a) => a.reason?.startsWith("ED presentation") || a.reason?.startsWith("ED visit")).map((a) => (
                <div key={a.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-semibold text-[var(--alert)] bg-[var(--alert-soft)] px-2 py-0.5 rounded-full">ED Visit</span>
                    <span className="text-sm text-[var(--ink-soft)]">{a.admissionDate ? format(parseISO(a.admissionDate), "d MMM yyyy") : "—"}</span>
                  </div>
                  <div className="text-sm font-semibold">{a.hospital || "Hospital not recorded"}</div>
                  <div className="text-sm mt-1">{a.reason}</div>
                  {(a.treatments ?? []).length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Treatments</div>
                      <ul className="text-sm pl-4 list-disc space-y-0.5">
                        {(a.treatments ?? []).map((t) => <li key={t.id}>{t.treatment}{t.details && ` — ${t.details}`}</li>)}
                      </ul>
                    </div>
                  )}
                  {a.notes && <div className="text-sm mt-1 text-[var(--ink-soft)]">{a.notes}</div>}
                  <AttachmentList attachments={(a as unknown as { attachments?: Attachment[] }).attachments ?? []} />
                </div>
              ))}
              {edVisitDailyLogs.map((d) => {
                const ex = d as unknown as Record<string, string | string[] | { id: string; treatment: string; details: string }[] | undefined>;
                return (
                  <div key={d.id} className="rounded-xl border border-[var(--border)] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-semibold text-[var(--alert)] bg-[var(--alert-soft)] px-2 py-0.5 rounded-full">ED Visit (logged in daily)</span>
                      <span className="text-sm text-[var(--ink-soft)]">{format(parseISO(d.createdAt), "d MMM yyyy")}</span>
                    </div>
                    {ex.edHospital && <div className="text-sm font-semibold">{ex.edHospital as string}</div>}
                    {ex.edTime && <div className="text-sm">Arrival: {ex.edTime as string}</div>}
                    {ex.edPresentation && <div className="text-sm">Presentation: {ex.edPresentation as string}</div>}
                    {Array.isArray(ex.edDoctors) && (ex.edDoctors as string[]).filter(Boolean).length > 0 && (
                      <div className="text-sm">Doctors: {(ex.edDoctors as string[]).filter(Boolean).join(", ")}</div>
                    )}
                    {Array.isArray(ex.edNurses) && (ex.edNurses as string[]).filter(Boolean).length > 0 && (
                      <div className="text-sm">Nurses: {(ex.edNurses as string[]).filter(Boolean).join(", ")}</div>
                    )}
                    {Array.isArray(ex.edTreatments) && (ex.edTreatments as { id: string; treatment: string; details: string }[]).length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Treatments</div>
                        <ul className="text-sm pl-4 list-disc space-y-0.5">
                          {(ex.edTreatments as { id: string; treatment: string; details: string }[]).map((t) => (
                            <li key={t.id}>{t.treatment}{t.details && ` — ${t.details}`}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title={showAll ? "Past appointments (all)" : "Past appointments (last 14 days)"}>
          {recentPastApps.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {recentPastApps.map((a) => (
                <div key={a.id} className="rounded-xl border border-[var(--border)] p-3 flex items-start gap-3">
                  <div className="shrink-0 text-center rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 min-w-[60px]">
                    <div className="text-xs text-[var(--ink-soft)]">{format(parseISO(a.date), "EEE")}</div>
                    <div className="text-lg font-bold leading-tight">{format(parseISO(a.date), "d")}</div>
                    <div className="text-xs text-[var(--ink-soft)]">{format(parseISO(a.date), "MMM")}</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{a.type || "Appointment"}</div>
                    {a.time && <div className="text-sm text-[var(--ink-soft)]">{a.time}</div>}
                    {a.provider && <div className="text-sm">{a.provider}</div>}
                    {a.location && <div className="text-sm text-[var(--ink-soft)]">{a.location}</div>}
                    {a.notes && <div className="text-xs text-[var(--ink-soft)] mt-1">{a.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Upcoming appointments">
          {upcomingApps.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {upcomingApps.slice(0, 10).map((a) => (
                <div key={a.id} className="rounded-xl border border-[var(--border)] p-3 flex items-start gap-3">
                  <div className="shrink-0 text-center rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 min-w-[60px]">
                    <div className="text-xs text-[var(--ink-soft)]">{format(parseISO(a.date), "EEE")}</div>
                    <div className="text-lg font-bold leading-tight">{format(parseISO(a.date), "d")}</div>
                    <div className="text-xs text-[var(--ink-soft)]">{format(parseISO(a.date), "MMM")}</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{a.type || "Appointment"}</div>
                    {a.time && <div className="text-sm text-[var(--ink-soft)]">{a.time}</div>}
                    {a.provider && <div className="text-sm">{a.provider}</div>}
                    {a.location && <div className="text-sm text-[var(--ink-soft)]">{a.location}</div>}
                    {a.notes && <div className="text-xs text-[var(--ink-soft)] mt-1">{a.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={showAll ? "Daily log (all)" : "Daily log (last 14 days)"}>
          {recentDaily.length === 0 ? <Empty /> : (
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse table-fixed">
                <thead>
                  <tr className="text-left border-b border-[var(--border)]">
                    <Th>Date</Th><Th center>Day</Th><Th center>Night sweats</Th>
                    <Th center>Sleep (h)</Th><Th center>Weight (kg)</Th><Th>Notes / tags</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentDaily.map((d, i) => {
                    const ex = d as unknown as { dayColour?: string; nightSweats?: string; weightKg?: number; weighedAt?: string };
                    const tags = (d.tags ?? []).join(", ");
                    return (
                      <tr key={d.id} className={i % 2 ? "bg-[var(--surface-soft)]" : ""}>
                        <Td>{format(parseISO(d.createdAt), "d MMM")}</Td>
                        <Td center>
                          {ex.dayColour ? (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                backgroundColor:
                                  ex.dayColour === "red" ? "#fde8e8" :
                                  ex.dayColour === "yellow" ? "#fef9e7" : "#e8f5e9",
                                color:
                                  ex.dayColour === "red" ? "#8b0000" :
                                  ex.dayColour === "yellow" ? "#8a6d0f" : "#1f3b24",
                              }}
                            >
                              {ex.dayColour}
                            </span>
                          ) : "—"}
                        </Td>
                        <Td center>{ex.nightSweats ?? "—"}</Td>
                        <Td center>{d.sleepHours ?? "—"}</Td>
                        <Td center>{ex.weightKg != null ? `${ex.weightKg}${ex.weighedAt ? ` @${ex.weighedAt}` : ""}` : "—"}</Td>
                        <Td>
                          {tags && <span className="text-[var(--ink-soft)]">{tags}{d.notes ? " · " : ""}</span>}
                          {d.notes}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Signal Sweep readings — grouped by day, one row per reading */}
        <Section title={showAll ? "Signal Sweep readings (all)" : "Signal Sweep readings (last 14 days)"}>
          {recentSignals.length === 0 ? <Empty /> : (
            <SignalSweepTable signals={recentSignals} />
          )}
        </Section>

        {/* Trends — persisted rule-detected patterns. Active first, then resolved. */}
        <Section title="Trends">
          {trendEntries.length === 0 ? <Empty /> : (
            <TrendsExportBlock trends={trendEntries} />
          )}
        </Section>

        {/* Baseline-vs-current snapshot. Honours the 14-day / all-records
            toggle so the exported tables match what's on the screen. */}
        <Section title={showAll ? "Compared to baseline (all records)" : "Compared to baseline (last 14 days)"}>
          <BaselineVitalsTable
            rows={getBaselineComparison({
              signals, daily, bloods, flags,
              baselineTemp: toNumber(profile?.baselineTemp),
              baselineHR: toNumber(profile?.baselineHR),
              baselineWeight: toNumber(profile?.baselineWeight),
            }, showAll ? undefined : 14)}
            windowLabel={showAll ? "all-time" : "in the last 14 days"}
          />
        </Section>

        <Section title={showAll ? "Bloods · latest vs previous (all)" : "Bloods · latest vs previous (last 14 days)"}>
          <BloodsComparisonTable
            rows={getBloodsComparison(bloods, showAll ? undefined : 14)}
            windowLabel={showAll ? "on record" : "in the last 14 days"}
          />
        </Section>

        <Section title="Bloods (all)">
          {bloods.length === 0 ? <Empty /> : (
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse table-fixed">
                <thead>
                  <tr className="text-left border-b border-[var(--border)]">
                    <Th>Taken</Th><Th center>Hb</Th><Th center>WCC</Th><Th center>Neut</Th>
                    <Th center>Lymph</Th><Th center>Mono</Th><Th center>Plt</Th>
                    <Th center>Creat</Th><Th center>CRP</Th><Th>Notes / flags</Th>
                  </tr>
                </thead>
                <tbody>
                  {bloods.map((b, i) => {
                    const flags = (b as unknown as { flags?: string[] }).flags ?? [];
                    return (
                      <tr key={b.id} className={i % 2 ? "bg-[var(--surface-soft)]" : ""}>
                        <Td>{format(parseISO(b.takenAt), "d MMM yy")}</Td>
                        <Td center>{b.hb ?? "—"}</Td>
                        <Td center>{b.wcc ?? "—"}</Td>
                        <Td center>{b.neutrophils ?? "—"}</Td>
                        <Td center>{b.lymphocytes ?? "—"}</Td>
                        <Td center>{b.monocytes ?? "—"}</Td>
                        <Td center>{b.platelets ?? "—"}</Td>
                        <Td center>{b.creatinine ?? "—"}</Td>
                        <Td center>{b.crp ?? "—"}</Td>
                        <Td>{flags.join(", ")}{flags.length > 0 && b.notes ? " · " : ""}{b.notes}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {bloods.filter((b) => ((b as unknown as { attachments?: Attachment[] }).attachments ?? []).length > 0).length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Attached reports</div>
              {bloods.filter((b) => ((b as unknown as { attachments?: Attachment[] }).attachments ?? []).length > 0).map((b) => (
                <div key={b.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="text-sm font-medium mb-1">{format(parseISO(b.takenAt), "d MMM yyyy")}</div>
                  <AttachmentList attachments={(b as unknown as { attachments?: Attachment[] }).attachments ?? []} />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={showAll ? "Dose Trace (all)" : "Dose Trace (last 14 days)"}>
          {recentDoses.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {recentDoses.map((d) => (
                <div key={d.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold">
                      {d.medName}
                      {d.doseTaken && <span className="text-[var(--ink-soft)] font-normal"> · {d.doseTaken}</span>}
                    </div>
                    {d.status && <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-semibold">{d.status}</span>}
                    {d.linkedTripwire && <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 font-semibold">Tripwire</span>}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] mt-1">
                    {[
                      format(parseISO(d.createdAt), "d MMM, h:mm a"),
                      d.timeDue && `due ${d.timeDue}`,
                      d.timeTaken && `taken ${d.timeTaken}`,
                      d.helped && `helped: ${d.helped}`,
                    ].filter(Boolean).join(" · ")}
                  </div>
                  {d.instructions && <div className="text-sm mt-1"><b>Instructions:</b> {d.instructions}</div>}
                  {d.whyPrn && <div className="text-sm mt-1"><b>For:</b> {d.whyPrn}</div>}
                  {d.reasonMissed && <div className="text-sm mt-1"><b>Reason:</b> {d.reasonMissed}</div>}
                  {d.whatChanged && <div className="text-sm mt-1"><b>After:</b> {d.whatChanged}</div>}
                  {d.reactionAfter && <div className="text-sm mt-1"><b>Reaction:</b> {d.reactionAfter}</div>}
                  {d.notes && <div className="text-sm text-[var(--ink-soft)] mt-1 whitespace-pre-line">{d.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={showAll ? "Fuel Check (all)" : "Fuel Check (last 14 days)"}>
          {recentFuel.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {recentFuel.map((f) => (
                <div key={f.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="font-semibold">
                    {f.food || "Fluids"}
                    {f.amount && <span className="text-[var(--ink-soft)] font-normal"> · {f.amount}</span>}
                    {f.stayedDown === false && <span className="ml-2 text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 font-semibold">Did not stay down</span>}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] mt-1">
                    {[
                      f.time ?? format(parseISO(f.createdAt), "HH:mm"),
                      format(parseISO(f.createdAt), "d MMM"),
                      f.fluids,
                      f.nauseaBefore != null ? `nausea before ${f.nauseaBefore}/10` : undefined,
                      f.nauseaAfter != null ? `nausea after ${f.nauseaAfter}/10` : undefined,
                    ].filter(Boolean).join(" · ")}
                  </div>
                  {f.vomitedAfter && <div className="text-sm mt-1"><b>Vomited after:</b> {f.vomitedAfter}</div>}
                  {f.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{f.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={showAll ? "Hydration Line (all)" : "Hydration Line (last 14 days)"}>
          {recentHydration.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {recentHydration.map((h) => {
                const drinkSummary = h.drinks
                  ? Object.entries(h.drinks)
                      .filter(([, n]) => (n ?? 0) > 0)
                      .map(([k, n]) => {
                        const label = k === "other" && h.otherDrinkLabel ? h.otherDrinkLabel : k;
                        return `${n} ${label}`;
                      })
                      .join(", ")
                  : "";
                return (
                  <div key={h.id} className="rounded-xl border border-[var(--border)] p-3">
                    <div className="font-semibold">
                      {drinkSummary || h.fluidsSinceLast || "Hydration check"}
                      {h.linkedTripwire && <span className="ml-2 text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 font-semibold">Tripwire</span>}
                    </div>
                    <div className="text-xs text-[var(--ink-soft)] mt-1">
                      {[
                        h.time ?? format(parseISO(h.createdAt), "HH:mm"),
                        format(parseISO(h.createdAt), "d MMM"),
                      ].filter(Boolean).join(" · ")}
                    </div>
                    {h.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{h.notes}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Symptom Deck — active">
          {activeSymptomCards.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {activeSymptomCards.map((s) => (
                <div key={s.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold">{s.name}</div>
                    {s.severity && <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-semibold">{s.severity}</span>}
                    {s.pattern && <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-semibold">{s.pattern}</span>}
                    {s.linkedTripwire && <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 font-semibold">Tripwire</span>}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] mt-1">
                    {[
                      s.firstNoticed && `first noticed ${s.firstNoticed}`,
                      `added ${format(parseISO(s.createdAt), "d MMM")}`,
                    ].filter(Boolean).join(" · ")}
                  </div>
                  {s.triggers && <div className="text-sm mt-1"><b>Triggers:</b> {s.triggers}</div>}
                  {s.relievers && <div className="text-sm mt-1"><b>Helps:</b> {s.relievers}</div>}
                  {s.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{s.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {resolvedSymptomCards.length > 0 && (
          <Section title="Symptom Deck — resolved">
            <div className="space-y-2">
              {resolvedSymptomCards.map((s) => (
                <div key={s.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-[var(--ink-soft)] mt-1">
                    {s.firstNoticed && `first noticed ${s.firstNoticed} · `}resolved
                  </div>
                  {s.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{s.notes}</div>}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title={showAll ? "Relief Log (all)" : "Relief Log (last 14 days)"}>
          {recentRelief.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {recentRelief.map((r) => (
                <div key={r.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold">
                      {r.triedWhat}
                      <span className="text-[var(--ink-soft)] font-normal"> · for {r.symptom}</span>
                    </div>
                    {r.helped && <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-semibold">Helped: {r.helped}</span>}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] mt-1">
                    {[
                      r.time ?? format(parseISO(r.createdAt), "HH:mm"),
                      format(parseISO(r.createdAt), "d MMM"),
                      r.howQuickly && `worked in ${r.howQuickly}`,
                    ].filter(Boolean).join(" · ")}
                  </div>
                  {r.downside && <div className="text-sm mt-1"><b>Downside:</b> {r.downside}</div>}
                  {r.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{r.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Treatment calendar">
          {infusions.length === 0 ? <Empty /> : (
            <ul className="space-y-1 text-sm">
              {infusions.map((i) => {
                const ex = i as unknown as Record<string, string[] | string | undefined>;
                return (
                  <li key={i.id} className="flex gap-3">
                    <span className="w-14 shrink-0"><b>Day {i.cycleDay}</b></span>
                    <span className="flex-1">
                      {i.drugs}
                      {i.completed ? " · ✓ completed" : " · not yet"}
                      {i.reaction && <span className="text-[var(--alert)]"> · reaction: {(i.reactionSymptoms ?? []).join(", ") || "yes"}</span>}
                      {Array.isArray(ex.premedsGiven) && ex.premedsGiven.length > 0 && ` · premeds: ${(ex.premedsGiven as string[]).join(", ")}`}
                      {ex.cannulaSite && ` · site: ${ex.cannulaSite as string}`}
                      {i.notes && <span className="text-[var(--ink-soft)]"> — {i.notes}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Hospital admissions">
          {admissions.length === 0 ? <Empty /> : (
            <div className="space-y-4">
              {admissions.map((a) => (
                <div key={a.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {!a.dischargeDate && <span className="text-[10px] uppercase font-semibold text-[var(--alert)] bg-[var(--alert-soft)] px-2 py-0.5 rounded-full">Current</span>}
                    <span className="text-sm font-semibold">{a.hospital || "Hospital not recorded"}</span>
                  </div>
                  <div className="text-xs text-[var(--ink-soft)]">
                    Admitted: {a.admissionDate ? format(parseISO(a.admissionDate), "d MMM yyyy") : "—"}
                    {a.dischargeDate && ` · Discharged: ${format(parseISO(a.dischargeDate), "d MMM yyyy")}`}
                  </div>
                  <div className="text-sm mt-1"><b>Reason:</b> {a.reason}</div>
                  {(a.treatments ?? []).length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Treatments</div>
                      <ul className="text-sm pl-4 list-disc">
                        {(a.treatments ?? []).map((t) => <li key={t.id}>{t.treatment}{t.details && ` — ${t.details}`}</li>)}
                      </ul>
                    </div>
                  )}
                  {a.dischargeDetails && <div className="text-sm mt-1"><b>Discharge:</b> {a.dischargeDetails}</div>}
                  {a.dischargeMedications && <div className="text-sm mt-1"><b>Discharge meds:</b> {a.dischargeMedications}</div>}
                  {a.notes && <div className="text-sm mt-1 text-[var(--ink-soft)]">{a.notes}</div>}
                  <AttachmentList attachments={(a as unknown as { attachments?: Attachment[] }).attachments ?? []} />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Current medications">
          {meds.filter((m) => !m.stopped).length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {meds.filter((m) => !m.stopped).map((m) => {
                const ex = m as unknown as { purpose?: string; helped?: string };
                return (
                  <div key={m.id} className="rounded-xl border border-[var(--border)] p-3">
                    <div className="font-semibold text-sm">{m.name}</div>
                    <div className="text-sm text-[var(--ink-soft)] space-y-0.5">
                      {m.dose && <div>Dose: {m.dose}</div>}
                      {ex.purpose && <div>Purpose: {ex.purpose}</div>}
                      {m.reason && <div>Reason: {m.reason}</div>}
                      {ex.helped && <div>Helped: {ex.helped}</div>}
                      {m.sideEffects && <div>Side effects: {m.sideEffects}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Previously stopped medications (all)">
          {meds.filter((m) => m.stopped).length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {meds.filter((m) => m.stopped).map((m) => {
                const ex = m as unknown as { purpose?: string; helped?: string };
                return (
                  <div key={m.id} className="rounded-xl border border-[var(--border)] p-3 opacity-80">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{m.name}</span>
                      <span className="text-[10px] uppercase font-semibold text-[var(--ink-soft)] bg-[var(--surface-soft)] px-2 py-0.5 rounded-full">Stopped</span>
                    </div>
                    <div className="text-sm text-[var(--ink-soft)] space-y-0.5">
                      {m.dose && <div>Dose: {m.dose}</div>}
                      {ex.purpose && <div>Purpose: {ex.purpose}</div>}
                      {m.reason && <div>Reason: {m.reason}</div>}
                      {ex.helped && <div>Helped: {ex.helped}</div>}
                      {m.sideEffects && <div>Side effects: {m.sideEffects}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Open questions">
          {questions.length === 0 ? <Empty /> : (
            <ul className="space-y-2 text-sm">
              {questions.map((q) => (
                <li key={q.id}>
                  <div><b>Q:</b> {q.question}</div>
                  {q.answer && <div className="pl-4 text-[var(--ink-soft)]"><b>A:</b> {q.answer}</div>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Profile — full reference block */}
        <h2 className="display text-2xl border-b-2 border-[var(--primary)] pb-1 mt-10 mb-4 print-break">Patient profile</h2>

        {(profile?.privateFundName || profile?.privateFundNumber) && (
          <Section title="Private health">
            <Kv label="Fund" value={profile?.privateFundName} />
            <Kv label="Card number" value={[profile?.privateFundNumber, profile?.privateFundPosition && `#${profile.privateFundPosition}`].filter(Boolean).join(" ")} />
            <Kv label="Coverage" value={profile?.privateFundCoverage} />
          </Section>
        )}

        <Section title="Care team">
          <div className="space-y-3">
            {typeof profile?.hospital === "string" && profile.hospital && (
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Treating hospital</div>
                <div className="text-sm font-semibold">{String(profile.hospital)}</div>
                {typeof profile?.unit === "string" && profile.unit && (
                  <div className="text-sm text-[var(--ink-soft)]">Unit: {String(profile.unit)}</div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRACT_KEYS.map(({ key, label }) => {
                const p = (profile ?? {}) as Record<string, string | boolean | undefined>;
                if (p[`${key}NA`]) return (
                  <div key={key} className="rounded-xl border border-[var(--border)] p-3 opacity-60">
                    <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">{label}</div>
                    <div className="text-sm italic text-[var(--ink-soft)]">Not applicable</div>
                  </div>
                );
                const name = p[key] as string | undefined;
                if (!name) return null;
                const phone = p[`${key}Phone`] as string | undefined;
                const mobile = p[`${key}Mobile`] as string | undefined;
                const clinic = p[`${key}Clinic`] as string | undefined;
                const email = p[`${key}Email`] as string | undefined;
                const website = p[`${key}Website`] as string | undefined;
                const status = p[`${key}Status`] as string | undefined;
                const since = p[`${key}Since`] as string | undefined;
                const from = p[`${key}From`] as string | undefined;
                const to = p[`${key}To`] as string | undefined;
                return (
                  <div key={key} className="rounded-xl border border-[var(--border)] p-3 min-w-0 overflow-hidden">
                    <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1 flex items-center gap-2 flex-wrap">
                      <span>{label}</span>
                      {status === "current" && <span className="text-[10px] font-semibold text-white bg-[var(--primary)] px-2 py-0.5 rounded-full normal-case">Current{since ? ` · since ${since}` : ""}</span>}
                      {status === "previous" && <span className="text-[10px] font-semibold text-[var(--ink-soft)] bg-[var(--surface-soft)] px-2 py-0.5 rounded-full normal-case">Previous{from || to ? ` · ${from ?? "?"} — ${to ?? "?"}` : ""}</span>}
                    </div>
                    <div className="text-sm font-semibold break-words">{name}</div>
                    {clinic && <div className="text-sm text-[var(--ink-soft)] break-words">{clinic}</div>}
                    {phone && <div className="text-sm text-[var(--ink-soft)] break-words">Ph: {phone}</div>}
                    {mobile && <div className="text-sm text-[var(--ink-soft)] break-words">Mobile: {mobile}</div>}
                    {email && <div className="text-sm text-[var(--ink-soft)] break-all">{email}</div>}
                    {website && <div className="text-xs text-[var(--ink-soft)] break-all">{website}</div>}
                  </div>
                );
              })}
              {(profile?.customPractitioners ?? []).filter((c) => c.label || c.name).map((c) => (
                <div key={c.id} className={`rounded-xl border border-[var(--border)] p-3 min-w-0 overflow-hidden ${c.na ? "opacity-60" : ""}`}>
                  <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1 flex items-center gap-2 flex-wrap">
                    <span>{c.label || "Practitioner"}</span>
                    {c.status === "current" && <span className="text-[10px] font-semibold text-white bg-[var(--primary)] px-2 py-0.5 rounded-full normal-case">Current{c.since ? ` · since ${c.since}` : ""}</span>}
                    {c.status === "previous" && <span className="text-[10px] font-semibold text-[var(--ink-soft)] bg-[var(--surface-soft)] px-2 py-0.5 rounded-full normal-case">Previous{c.from || c.to ? ` · ${c.from ?? "?"} — ${c.to ?? "?"}` : ""}</span>}
                  </div>
                  {c.na ? (
                    <div className="text-sm italic text-[var(--ink-soft)]">Not applicable</div>
                  ) : (
                    <>
                      {c.name && <div className="text-sm font-semibold break-words">{c.name}</div>}
                      {c.clinic && <div className="text-sm text-[var(--ink-soft)] break-words">{c.clinic}</div>}
                      {c.phone && <div className="text-sm text-[var(--ink-soft)] break-words">Ph: {c.phone}</div>}
                      {c.mobile && <div className="text-sm text-[var(--ink-soft)] break-words">Mobile: {c.mobile}</div>}
                      {c.email && <div className="text-sm text-[var(--ink-soft)] break-all">{c.email}</div>}
                      {c.website && <div className="text-xs text-[var(--ink-soft)] break-all">{c.website}</div>}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Emergency Department practitioners — auto-populated from ED visits */}
            {(() => {
              const eds = ((profile as unknown as { edPractitioners?: Array<{ name: string; hospital: string; role: "doctor" | "nurse"; dateEncountered: string }> } | undefined)?.edPractitioners) ?? [];
              if (eds.length === 0) return null;
              const sorted = eds.slice().sort((a, b) => (b.dateEncountered ?? "").localeCompare(a.dateEncountered ?? ""));
              return (
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">
                    Emergency Department encounters
                  </div>
                  <ul className="space-y-1 text-sm">
                    {sorted.map((ep, idx) => (
                      <li key={`${ep.name}-${ep.hospital}-${ep.role}-${ep.dateEncountered}-${idx}`} className="flex items-start gap-2">
                        <span className="font-semibold">{ep.name}</span>
                        <span className="text-[var(--ink-soft)]">({ep.role})</span>
                        <span className="text-[var(--ink-soft)]">— {ep.hospital || "hospital not recorded"}</span>
                        {ep.dateEncountered && <span className="text-[var(--ink-soft)] ml-auto">first seen {ep.dateEncountered}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        </Section>

        <Section title="Support circle">
          {support.length === 0 ? <Empty /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {support.map((s) => (
                <div key={s.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="font-semibold text-sm">{s.name || "(no name)"}</div>
                  {s.relationship && <div className="text-sm text-[var(--ink-soft)]">{s.relationship}</div>}
                  {s.phone && <div className="text-sm">Ph: {s.phone}</div>}
                  {s.email && <div className="text-sm">{s.email}</div>}
                  {s.isEPOA && <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--primary)] text-white font-semibold">EPOA</span>}
                </div>
              ))}
            </div>
          )}
          {epoa.length > 0 && (
            <p className="text-xs text-[var(--ink-soft)] mt-3">EPOA = Enduring Power of Attorney</p>
          )}
        </Section>

        {(profile?.emergencyContacts ?? []).length > 0 && (
          <Section title="Emergency contacts">
            <p className="text-xs text-[var(--alert)] mb-2 italic">Contact these people only if the identified support people above are unavailable.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(profile?.emergencyContacts ?? []).map((c) => (
                <div key={c.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="font-semibold text-sm">{c.name || "(no name)"}</div>
                  {c.relationship && <div className="text-sm text-[var(--ink-soft)]">{c.relationship}</div>}
                  {c.phone && <div className="text-sm">Ph: {c.phone}</div>}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Diagnosis detail">
          <Kv label="Confirmed" value={diagnosisLabel} />
          {profile?.diagnosisDate && <Kv label="Date confirmed" value={profile.diagnosisDate} />}
          <Kv label="BRAF V600E" value={profile?.brafResult} />
          <Kv label="Spleen enlarged?" value={profile?.spleenEnlarged} />
          <Kv label="Upper-left abdominal pain" value={profile?.spleenUpperLeftPain} />
          <Kv label="Early satiety" value={profile?.spleenEarlySatiety} />
          {profile?.spleen && <Kv label="Spleen notes" value={profile.spleen} />}
          {(profile?.additionalDiagnoses ?? []).filter((d) => d.details || d.date).length > 0 && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Additional diagnoses</div>
              <ul className="pl-3 list-disc text-sm marker:text-[var(--ink-soft)] space-y-0.5">
                {(profile?.additionalDiagnoses ?? []).filter((d) => d.details || d.date).map((d) => (
                  <li key={d.id}>
                    {d.details || "(no detail)"}
                    {d.date ? ` · ${d.date}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {profile?.flowMarkers && Object.keys(profile.flowMarkers).length > 0 && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Flow markers</div>
              <table className="w-full text-xs border-collapse table-fixed">
                <tbody>
                  {Object.entries(profile.flowMarkers).map(([marker, result]) => {
                    const nt = (profile.flowMarkersNotTested ?? {})[marker];
                    if (!result && !nt) return null;
                    return (
                      <tr key={marker} className="border-b border-[var(--border)]">
                        <td className="py-1 pr-3">{marker}</td>
                        <td className="py-1">{nt ? <span className="text-[var(--ink-soft)]">Not tested at baseline</span> : result}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {profile?.flowMarkersNotes && <p className="text-xs text-[var(--ink-soft)] mt-1">{profile.flowMarkersNotes}</p>}
            </div>
          )}
        </Section>

        {profile?.pathology && Object.values(profile.pathology).some((v) => v !== undefined && v !== "") && (
          <Section title="Bone marrow pathology">
            <PathologyBlock path={profile.pathology} />
          </Section>
        )}

        <Section title="Allergies">
          {allergies.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {allergies.map((a) => {
                const reactions: string[] = [];
                if (a.hayFever) reactions.push("Hay fever");
                if (a.asthma) reactions.push("Asthma");
                if (a.hives) reactions.push("Hives");
                if (a.anaphylaxis) reactions.push("Anaphylaxis");
                if (a.otherChecked) reactions.push(a.other ? `Other: ${a.other}` : "Other");
                const isAnaphylactic = a.anaphylaxis;
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-3 break-words ${isAnaphylactic ? "border-[var(--alert)] bg-[var(--alert-soft)]" : "border-[var(--border)]"}`}
                  >
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{a.name || "(unnamed allergen)"}</span>
                      {a.classification && (
                        <span className="inline-block text-[10px] uppercase tracking-wide font-semibold bg-[var(--surface-soft)] text-[var(--ink-soft)] px-2 py-0.5 rounded-full">
                          {a.classification}
                        </span>
                      )}
                      {isAnaphylactic && (
                        <span className="inline-block text-[10px] uppercase font-semibold text-white bg-[var(--alert)] px-2 py-0.5 rounded-full">
                          Anaphylaxis risk
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-sm">
                      <span className="text-[var(--ink-soft)]">Reactions: </span>
                      {reactions.length > 0 ? (
                        <span>{reactions.join(", ")}</span>
                      ) : (
                        <span className="text-[var(--ink-soft)] italic">none recorded</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Medical history">
          {HISTORY_CATEGORIES.map((cat) => {
            if (cat === "Vaccination History") {
              const na = historyNA[cat];
              const vaxes = (profile?.vaccinations ?? {}) as Record<string, { status?: string; date?: string }>;
              const others = (profile?.otherVaccinations ?? []) as { id: string; name?: string; status?: string; date?: string }[];
              const entries = [
                ...Object.entries(vaxes)
                  .filter(([, v]) => v.status || v.date)
                  .map(([name, v]) => ({ name, ...v })),
                ...others
                  .filter((o) => o.name || o.status || o.date)
                  .map((o) => ({ name: o.name || "(unnamed)", status: o.status, date: o.date })),
              ];
              if (!na && entries.length === 0) return null;
              return (
                <div key={cat} className="mb-2 text-sm">
                  <div className="font-semibold">{cat}</div>
                  {na ? <div className="text-[var(--ink-soft)] pl-3">Not applicable / considered</div> : (
                    <table className="w-full text-xs mt-1 border-collapse table-fixed">
                      <thead>
                        <tr className="text-left text-[var(--ink-soft)]">
                          <th className="py-1 pr-2">Vaccine</th>
                          <th className="py-1 pr-2">Status</th>
                          <th className="py-1">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e, i) => (
                          <tr key={i} className="border-t border-[var(--border)]">
                            <td className="py-1 pr-2">{e.name}</td>
                            <td className="py-1 pr-2">{e.status || "—"}</td>
                            <td className="py-1">{e.date || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            }
            const rows = medHistory.filter((r) => r.category === cat);
            const na = historyNA[cat];
            if (!na && rows.length === 0) return null;
            return (
              <div key={cat} className="mb-2 text-sm">
                <div className="font-semibold">{cat}</div>
                {na ? <div className="text-[var(--ink-soft)] pl-3">Not applicable / considered</div> : (
                  <ul className="pl-3 list-disc marker:text-[var(--ink-soft)]">
                    {rows.map((r) => (
                      <li key={r.id}>{r.details || "(no detail)"}{r.date ? ` · ${r.date}` : ""}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </Section>

        <Section title="Baseline">
          <div className="grid grid-cols-2 gap-x-6 text-sm">
            <Kv label="Weight" value={profile?.baselineWeight && `${profile.baselineWeight} kg`} />
            <Kv label="Height" value={profile?.baselineHeight && `${profile.baselineHeight} cm`} />
            <Kv label="Temp" value={profile?.baselineTemp && `${profile.baselineTemp} °C`} />
            <Kv label="Blood pressure" value={profile?.baselineBP} />
            <Kv label="Resting HR" value={profile?.baselineHR && `${profile.baselineHR} bpm`} />
            <Kv label="Blood type" value={profile?.bloodType} />
            <Kv label="Gender identity" value={profile?.genderIdentity === "I use a different term" ? profile.genderIdentityOther : profile?.genderIdentity} />
            <Kv label="Sex at birth" value={profile?.sexAtBirth === "Another term" ? profile.sexAtBirthOther : profile?.sexAtBirth} />
            <Kv label="Pronouns" value={
              profile?.pronouns === "Other" ? profile.pronounsOther :
              profile?.pronouns === "Neopronouns"
                ? (profile.pronounsNeo === "Other" ? profile.pronounsNeoOther : profile.pronounsNeo) || "Neopronouns"
                : profile?.pronouns
            } />
          </div>
        </Section>

        <Section title={`Main issues at the time of completing the profile${(profile as unknown as { profileCompletedDate?: string })?.profileCompletedDate ? ` (${format(parseISO((profile as unknown as { profileCompletedDate: string }).profileCompletedDate), "d MMM yyyy")})` : ""}`}>
          {SYMPTOM_GROUPS.map((grp) => {
            const items = grp.items.map((it) => ({ it, v: (profile?.symptoms ?? {})[`${grp.heading}::${it}`] })).filter((x) => x.v);
            if (items.length === 0) return null;
            return (
              <div key={grp.heading} className="mb-3 rounded-xl border border-[var(--border)] p-3">
                <div className="text-sm font-semibold mb-1.5">{grp.heading}</div>
                <div className="space-y-1">
                  {items.map((x, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{x.it}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${x.v === "Yes" ? "bg-[var(--alert-soft)] text-[var(--alert)]" : x.v === "No" ? "bg-[var(--surface-soft)] text-[var(--ink-soft)]" : "bg-[var(--surface-soft)] text-[var(--accent)]"}`}>
                        {x.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {additionalSymptoms.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="text-sm font-semibold mb-1.5">Other reported symptoms</div>
              <div className="space-y-1">
                {additionalSymptoms.filter((s) => s.text).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.text}</span>
                    {s.answer && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)]">{s.answer}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {profile?.treatmentInstructions && (
          <Section title="Specific treatment instructions">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{profile.treatmentInstructions}</p>
          </Section>
        )}

        {profile?.valuesDirective && (
          <Section title="Values and preferences">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{profile.valuesDirective}</p>
          </Section>
        )}

        {profile?.notes && (
          <Section title="Other notes">
            <p className="text-sm whitespace-pre-wrap">{profile.notes}</p>
          </Section>
        )}

        <footer className="mt-10 pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <img src="/logo-horizontal.png" alt="Hairy but Handled" className="h-8 w-auto opacity-60" />
          <div className="text-xs text-[var(--ink-soft)]">Generated {format(new Date(), "d MMM yyyy, h:mm a")}</div>
        </footer>
      </div>

      <style jsx global>{`
        .report h3.section-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--ink);
          border-bottom: 2px solid #00c9bd;
          padding-bottom: 6px;
          margin-bottom: 12px;
          margin-top: 24px;
        }
        .report .kv-row {
          font-size: 14px;
          display: flex;
          gap: 12px;
          padding: 4px 0;
          border-bottom: 1px solid var(--surface-soft);
        }
        .report .kv-label { color: var(--ink-soft); min-width: 160px; font-weight: 500; }
        .report table { font-variant-numeric: tabular-nums; }
        .report th, .report td { padding: 6px 8px; }
        .report th { font-weight: 600; color: var(--ink-soft); font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
        .report section { margin-bottom: 28px; }
        .report ul { line-height: 1.6; }
        .report li { padding: 2px 0; }
        @media print {
          .report { font-size: 11px; }
          .report h3.section-title { margin-top: 16px; break-inside: avoid; font-size: 16px; }
          .report section { break-inside: avoid; margin-bottom: 18px; }
          .report table { break-inside: auto; }
          .report tr { break-inside: avoid; }
          .report .kv-row { font-size: 12px; }
        }
      `}</style>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="section-title">{title}</h3>
      <div className="mt-3">
        {children}
      </div>
    </section>
  );
}

function Kv({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="kv-row">
      <span className="kv-label">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}

function Empty() { return <p className="text-xs text-[var(--ink-soft)] italic">No entries.</p>; }

function toNumber(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Export block for persisted Trend entries. Active first (no resolvedAt),
 *  then resolved trends as a compact list. Reuses the formatReading vibe:
 *  data table per trend plus the rule's "why" line. */
function TrendsExportBlock({ trends }: { trends: Array<{
  id: string; ruleId: string; title: string;
  severity: "urgent" | "discuss" | "watch";
  interpretation: string; why: string;
  metric: string; unit?: string; baseline?: number; threshold?: number;
  dataPoints: { t: string; v?: number | null; label?: string }[];
  detectedAt: string; resolvedAt?: string;
}> }) {
  const active = trends.filter((t) => !t.resolvedAt);
  const resolved = trends.filter((t) => t.resolvedAt);
  const badge = (sev: "urgent" | "discuss" | "watch") =>
    sev === "urgent" ? { bg: "var(--alert)", label: "URGENT" }
    : sev === "discuss" ? { bg: "var(--alert)", label: "Discuss" }
    : { bg: "#d4a017", label: "Watch" };
  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Active</div>
          <div className="space-y-3">
            {active.map((t) => {
              const b = badge(t.severity);
              return (
                <div key={t.id} className="rounded-xl border border-[var(--border)] p-3 break-words">
                  <div className="flex items-start gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{t.title}</span>
                    <span
                      className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: b.bg }}
                    >
                      {b.label}
                    </span>
                  </div>
                  <div className="text-xs mb-2">{t.interpretation}</div>
                  {t.dataPoints.length > 0 && (
                    <table className="w-full text-xs border-collapse table-fixed mb-2">
                      <thead>
                        <tr className="text-left border-b border-[var(--border)]">
                          <th className="py-1 px-1 align-bottom">When</th>
                          <th className="py-1 px-1 align-bottom">
                            {t.metric}{t.unit ? ` (${t.unit})` : ""}
                          </th>
                          {t.dataPoints.some((p) => p.label) && (
                            <th className="py-1 px-1 align-bottom">Note</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {t.dataPoints.map((p, i) => (
                          <tr key={i} className={i % 2 ? "bg-[var(--surface-soft)]" : ""}>
                            <td className="py-1 px-1 align-top break-words whitespace-normal">
                              {format(parseISO(p.t), "d MMM HH:mm")}
                            </td>
                            <td className="py-1 px-1 align-top break-words whitespace-normal">
                              {typeof p.v === "number" ? p.v : "—"}
                            </td>
                            {t.dataPoints.some((x) => x.label) && (
                              <td className="py-1 px-1 align-top break-words whitespace-normal">
                                {p.label ?? ""}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="text-xs text-[var(--ink-soft)] leading-relaxed">
                    <span className="font-semibold">Why:</span> {t.why}
                  </div>
                  {(t.baseline != null || t.threshold != null) && (
                    <div className="text-[11px] text-[var(--ink-soft)] mt-1">
                      {t.baseline != null && <>Baseline: {t.baseline}{t.unit ?? ""}{t.threshold != null ? " · " : ""}</>}
                      {t.threshold != null && <>Threshold: {t.threshold}{t.unit ?? ""}</>}
                    </div>
                  )}
                  <div className="text-[11px] text-[var(--ink-soft)] mt-1">
                    Detected {format(parseISO(t.detectedAt), "d MMM yyyy")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {resolved.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Resolved (history)</div>
          <ul className="text-xs space-y-1">
            {resolved.map((t) => (
              <li key={t.id} className="break-words">
                <b>{t.title}</b> — {t.interpretation}
                <span className="text-[var(--ink-soft)]">
                  {" "}(detected {format(parseISO(t.detectedAt), "d MMM")}, resolved {t.resolvedAt ? format(parseISO(t.resolvedAt), "d MMM") : "—"})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Signal Sweep readings export table — groups per day, shows every reading
 *  with its time, label, value (via formatReading), per-option locations,
 *  follow-ups, and notes. Flags auto-flagged rows in red. */
function SignalSweepTable({ signals }: { signals: Array<{
  id: string; createdAt: string; signalType: string;
  value?: number | null; unit?: string; choice?: string; choices?: string[];
  score?: number | null; customLabel?: string; notes?: string; followUps?: string[];
  locationScores?: { area: string; score: number }[];
  optionLocations?: Record<string, string[]>;
  autoFlag?: boolean;
}> }) {
  // Group by yyyy-MM-dd
  const byDay = new Map<string, typeof signals>();
  for (const s of signals) {
    const key = format(parseISO(s.createdAt), "yyyy-MM-dd");
    const arr = byDay.get(key) ?? [];
    arr.push(s);
    byDay.set(key, arr);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const items = byDay.get(day)!.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return (
          <div key={day}>
            <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">
              {format(parseISO(`${day}T00:00:00`), "EEE d MMM yyyy")}
            </div>
            <table className="w-full text-xs border-collapse table-fixed">
              <thead>
                <tr className="text-left border-b border-[var(--border)]">
                  <Th>Time</Th>
                  <Th>Category</Th>
                  <Th>Signal</Th>
                  <Th>Value</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((s, i) => {
                  const def = SIGNAL_BY_ID[s.signalType];
                  const catLabel = def ? CATEGORY_LABEL[def.category as Category] : "—";
                  const label = def?.label ?? s.signalType;
                  const valueParts: string[] = [];
                  if (def) valueParts.push(formatReading(def, s));
                  else if (s.customLabel) valueParts.push(s.customLabel);
                  if (s.optionLocations) {
                    for (const [opt, locs] of Object.entries(s.optionLocations)) {
                      if (locs && locs.length) valueParts.push(`${opt}: ${locs.join(", ")}`);
                    }
                  }
                  if (s.locationScores && s.locationScores.length && def?.input.kind !== "locatedRating") {
                    valueParts.push(s.locationScores.map((l) => `${l.area} ${l.score}/10`).join(", "));
                  }
                  return (
                    <tr key={s.id} className={i % 2 ? "bg-[var(--surface-soft)]" : ""}>
                      <Td>{format(parseISO(s.createdAt), "HH:mm")}</Td>
                      <Td>{catLabel}</Td>
                      <Td>
                        {s.autoFlag && <span className="text-[var(--alert)] font-semibold mr-1">⚑</span>}
                        {label}
                      </Td>
                      <Td>{valueParts.join(" · ")}</Td>
                      <Td>{s.notes ?? ""}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function PathologyBlock({ path }: { path: Pathology }) {
  const diffRows: { label: string; key: keyof Pathology }[] = [
    { label: "Neutrophils", key: "diffNeutrophils" },
    { label: "Lymphocytes", key: "diffLymphocytes" },
    { label: "Monocytes", key: "diffMonocytes" },
    { label: "Eosinophils", key: "diffEosinophils" },
    { label: "Metamyelocytes", key: "diffMetamyelocytes" },
    { label: "Proerythroblasts", key: "diffProerythroblasts" },
    { label: "Basophilic erythroblasts", key: "diffBasophilicErythroblasts" },
    { label: "Polychromatic erythroblasts", key: "diffPolychromaticErythroblasts" },
    { label: "Orthochromatic erythroblasts", key: "diffOrthochromaticErythroblasts" },
    { label: "Plasma cells", key: "diffPlasmaCells" },
    { label: "Basophils", key: "diffBasophils" },
  ];
  const anyDiff = diffRows.some((r) => path[r.key]);

  return (
    <div className="space-y-4">
      {(path.requestedDate || path.collectedDate || path.reportedDate || path.reportFor || path.copyTo) && (
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Specimen</div>
          <div className="grid grid-cols-2 gap-x-6 text-sm">
            <Kv label="Requested" value={path.requestedDate} />
            <Kv label="Collected" value={path.collectedDate} />
            <Kv label="Reported" value={path.reportedDate} />
            <Kv label="Report for" value={path.reportFor === "__other__" ? path.reportForOther : path.reportFor} />
            <Kv label="Copy to" value={path.copyTo} />
          </div>
        </div>
      )}

      {(path.biopsyType || path.biopsyPerformedAt || path.biopsyPerformedBy || path.biopsyDate) && (
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Bone marrow biopsy</div>
          <div className="grid grid-cols-2 gap-x-6 text-sm">
            <Kv label="Biopsy type" value={path.biopsyType} />
            <Kv label="Performed at" value={path.biopsyPerformedAt} />
            <Kv label="Performed by" value={path.biopsyPerformedBy} />
            <Kv label="Date" value={path.biopsyDate} />
          </div>
        </div>
      )}

      {path.clinicalNotes && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Clinical notes / history</div>
          <p className="text-sm whitespace-pre-wrap">{path.clinicalNotes}</p>
        </div>
      )}

      {(path.hb || path.mcv || path.platelets || path.wcc || path.retic) && (
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Laboratory parameters</div>
          <div className="grid grid-cols-2 gap-x-6 text-sm">
            <Kv label="Hb (g/L)" value={path.hb} />
            <Kv label="MCV (fL)" value={path.mcv} />
            <Kv label="Platelets (×10⁹/L)" value={path.platelets} />
            <Kv label="WCC (×10⁹/L)" value={path.wcc} />
            <Kv label="Retic (%)" value={path.retic} />
          </div>
        </div>
      )}

      {path.otherInvestigations && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Other investigations</div>
          <p className="text-sm whitespace-pre-wrap">{path.otherInvestigations}</p>
        </div>
      )}
      {path.bloodFilm && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Blood film</div>
          <p className="text-sm whitespace-pre-wrap">{path.bloodFilm}</p>
        </div>
      )}

      {(path.biopsySite || path.boneConsistency || path.aspirateNotes) && (
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Biopsy site / specimen quality</div>
          <div className="grid grid-cols-2 gap-x-6 text-sm">
            <Kv label="Site" value={path.biopsySite} />
            <Kv label="Consistency of bone" value={path.boneConsistency} />
          </div>
          {path.aspirateNotes && <p className="text-sm whitespace-pre-wrap mt-1">{path.aspirateNotes}</p>}
        </div>
      )}

      {(anyDiff || path.meRatio) && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Bone marrow differential</div>
          <table className="w-full text-xs border-collapse table-fixed">
            <tbody>
              {diffRows.filter((r) => path[r.key]).map((r) => (
                <tr key={r.key as string} className="border-b border-[var(--border)]">
                  <td className="py-1 pr-3">{r.label}</td>
                  <td className="py-1">{String(path[r.key] ?? "")}%</td>
                </tr>
              ))}
              {path.meRatio && (
                <tr className="border-b border-[var(--border)]">
                  <td className="py-1 pr-3 font-semibold">Myeloid:Erythroid ratio</td>
                  <td className="py-1 font-semibold">{path.meRatio}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {path.smearComment && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Bone marrow smear</div>
          <p className="text-sm whitespace-pre-wrap">{path.smearComment}</p>
        </div>
      )}

      {(path.specimenType || path.specimenQuality || path.cellularity || path.megakaryocytes || path.erythron || path.leukon || path.lymphoidPlasma || path.otherInfiltrate || path.bloodVessels || path.reticulin || path.boneTrabeculae || path.specialStains) && (
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Bone marrow histology</div>
          <Kv label="Type of specimen" value={path.specimenType} />
          <Kv label="Specimen quality" value={path.specimenQuality} />
          {path.cellularity && <PathField label="Cellularity / architecture" value={path.cellularity} />}
          {path.megakaryocytes && <PathField label="Megakaryocytes" value={path.megakaryocytes} />}
          {path.erythron && <PathField label="Erythron" value={path.erythron} />}
          {path.leukon && <PathField label="Leukon" value={path.leukon} />}
          {path.lymphoidPlasma && <PathField label="Lymphoid / plasma cells" value={path.lymphoidPlasma} />}
          {path.otherInfiltrate && <PathField label="Other infiltrate / granuloma" value={path.otherInfiltrate} />}
          <Kv label="Blood vessels" value={path.bloodVessels} />
          <Kv label="Reticulin" value={path.reticulin} />
          <Kv label="Bone trabeculae" value={path.boneTrabeculae} />
          {path.specialStains && <PathField label="Special stains" value={path.specialStains} />}
        </div>
      )}

      {path.salientFeatures && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Salient features</div>
          <p className="text-sm whitespace-pre-wrap">{path.salientFeatures}</p>
        </div>
      )}
      {path.conclusions && (
        <div className="rounded-xl border-2 border-[var(--primary)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--primary)] font-semibold mb-1">Conclusions</div>
          <p className="text-sm whitespace-pre-wrap font-medium">{path.conclusions}</p>
        </div>
      )}
    </div>
  );
}

function PathField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)] font-semibold mt-1.5">{label}</div>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th
      className={`py-1.5 px-1.5 align-bottom font-semibold ${center ? "text-center" : "text-left"}`}
    >
      {children}
    </th>
  );
}
function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <td
      className={`py-1.5 px-1.5 align-top break-words whitespace-normal ${center ? "text-center" : "text-left"}`}
    >
      {children}
    </td>
  );
}
