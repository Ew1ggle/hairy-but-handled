"use client";
import AppShell from "@/components/AppShell";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { format, parseISO, subDays, isToday } from "date-fns";
import { Printer } from "lucide-react";

type SupportPerson = { id: string; name?: string; phone?: string; email?: string; relationship?: string; isEPOA?: boolean };
type Allergy = { id: string; classification?: string; name?: string; hayFever?: boolean; asthma?: boolean; hives?: boolean; anaphylaxis?: boolean; otherChecked?: boolean; other?: string };
type HistoryRow = { id: string; category: string; details?: string; date?: string };
type AdditionalSymptom = { id: string; text?: string; answer?: string };
type ProfileT = {
  [key: string]: string | number | boolean | undefined | SupportPerson[] | Allergy[] | HistoryRow[] | AdditionalSymptom[] | Record<string, string> | Record<string, boolean>;
  name?: string; dob?: string; medicareNumber?: string; medicarePosition?: string;
  privateFundName?: string; privateFundNumber?: string; privateFundPosition?: string; privateFundCoverage?: string;
  supportPeople?: SupportPerson[];
  diagnosis?: string; diagnosisOther?: string; diagnosisDate?: string; brafResult?: string;
  spleen?: string; spleenEnlarged?: string; spleenUpperLeftPain?: string; spleenEarlySatiety?: string;
  flowMarkers?: Record<string, string>; flowMarkersNotTested?: Record<string, boolean>; flowMarkersNotes?: string;
  regimen?: string; regimenOther?: string; startDate?: string;
  allergies?: Allergy[]; medicalHistory?: HistoryRow[]; historyNA?: Record<string, boolean>;
  baselineWeight?: string; baselineHeight?: string; baselineTemp?: string; baselineBP?: string; baselineHR?: string;
  genderIdentity?: string; genderIdentityOther?: string; sexAtBirth?: string; sexAtBirthOther?: string;
  symptoms?: Record<string, string>; additionalSymptoms?: AdditionalSymptom[];
  treatmentInstructions?: string; valuesDirective?: string; notes?: string;
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
  const todayApps = appointments.filter((a) => a.date && isToday(parseISO(a.date))).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const upcomingApps = appointments.filter((a) => a.date && parseISO(a.date) > new Date() && !isToday(parseISO(a.date))).sort((a, b) => a.date.localeCompare(b.date));
  const edVisitFlags = flags.filter((f) => (f as unknown as { wentToED?: boolean }).wentToED);
  const edVisitDailyLogs = daily.filter((d) => (d as unknown as { edVisit?: boolean }).edVisit);
  const unansweredQs = questions.filter((q) => !q.answer);

  const cutoff = subDays(new Date(), 14).toISOString();
  const recentDaily = daily.filter((d) => d.createdAt >= cutoff);
  const recentFlags = flags.filter((f) => f.createdAt >= cutoff);

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

  return (
    <AppShell>
      <div className="no-print flex items-center justify-between mb-5">
        <div>
          <h1 className="display text-3xl">Summary for the team</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">Last 14 days of activity plus the full patient profile. Tap Print → Save as PDF.</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 font-medium">
          <Printer size={16} /> Print / PDF
        </button>
      </div>

      <div className="print-root report">
        {/* Cover */}
        <header className="mb-8 pb-4 border-b-2 border-[var(--primary)]">
          <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)]">Hairy but Handled — Clinical summary</div>
          <h2 className="display text-3xl mt-1">{profile?.name || "(patient name not set)"}</h2>
          <div className="text-sm text-[var(--ink-soft)] mt-2 flex flex-wrap gap-x-6 gap-y-1">
            {profile?.dob && <span>DOB {profile.dob}</span>}
            {profile?.medicareNumber && <span>Medicare {profile.medicareNumber}{profile.medicarePosition ? ` #${profile.medicarePosition}` : ""}</span>}
            {diagnosisLabel && <span>Diagnosis: <b>{diagnosisLabel}</b>{profile?.diagnosisDate ? ` (${profile.diagnosisDate})` : ""}</span>}
            {regimenLabel && <span>Regimen: <b>{regimenLabel}</b>{profile?.startDate ? ` · start ${profile.startDate}` : ""}</span>}
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-2">Generated {format(new Date(), "d MMM yyyy, h:mm a")}</div>
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
        <Section title="Recent red flags (14 days)">
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

        <Section title="Daily log — last 14 days">
          {recentDaily.length === 0 ? <Empty /> : (
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left border-b border-[var(--border)]">
                    <Th>Date</Th><Th center>°C</Th><Th center>Fat</Th><Th center>Pain</Th>
                    <Th center>Naus</Th><Th center>App</Th><Th center>SOB</Th><Th center>Mood</Th>
                    <Th center>Fog</Th><Th center>Sleep</Th><Th>Flags / notes</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentDaily.map((d, i) => {
                    const ex = d as unknown as Record<string, string | undefined>;
                    const flagsHit = ["fever","breathless","bleeding","infusionSite","nauseaVom","confusion"].filter((k) => ex[k] === "Yes");
                    return (
                      <tr key={d.id} className={i % 2 ? "bg-[var(--surface-soft)]" : ""}>
                        <Td>{format(parseISO(d.createdAt), "d MMM")}</Td>
                        <Td center>{d.temperatureC ?? "—"}</Td>
                        <Td center>{d.fatigue ?? "—"}</Td>
                        <Td center>{d.pain ?? "—"}</Td>
                        <Td center>{d.nausea ?? "—"}</Td>
                        <Td center>{d.appetite ?? "—"}</Td>
                        <Td center>{d.breathlessness ?? "—"}</Td>
                        <Td center>{d.mood ?? "—"}</Td>
                        <Td center>{d.brainFog ?? "—"}</Td>
                        <Td center>{d.sleepHours ?? "—"}</Td>
                        <Td>
                          {flagsHit.length > 0 && <span className="text-[var(--alert)]">⚑ {flagsHit.join(", ")} · </span>}
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

        <Section title="Bloods (all)">
          {bloods.length === 0 ? <Empty /> : (
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse">
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
                return (
                  <div key={key} className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">{label}</div>
                    <div className="text-sm font-semibold">{name}</div>
                    {clinic && <div className="text-sm text-[var(--ink-soft)]">{clinic}</div>}
                    {phone && <div className="text-sm text-[var(--ink-soft)]">Ph: {phone}</div>}
                    {mobile && <div className="text-sm text-[var(--ink-soft)]">Mobile: {mobile}</div>}
                  </div>
                );
              })}
            </div>
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

        <Section title="Diagnosis detail">
          <Kv label="Confirmed" value={diagnosisLabel} />
          {profile?.diagnosisDate && <Kv label="Date confirmed" value={profile.diagnosisDate} />}
          <Kv label="BRAF V600E" value={profile?.brafResult} />
          <Kv label="Spleen enlarged?" value={profile?.spleenEnlarged} />
          <Kv label="Upper-left abdominal pain" value={profile?.spleenUpperLeftPain} />
          <Kv label="Early satiety" value={profile?.spleenEarlySatiety} />
          {profile?.spleen && <Kv label="Spleen notes" value={profile.spleen} />}
          {profile?.flowMarkers && Object.keys(profile.flowMarkers).length > 0 && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Flow markers</div>
              <table className="w-full text-xs border-collapse">
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

        <Section title="Allergies">
          {allergies.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {allergies.map((a) => {
                const sx = [
                  a.hayFever && "hay fever",
                  a.asthma && "asthma",
                  a.hives && "hives",
                  a.anaphylaxis && "anaphylaxis",
                  a.otherChecked && a.other ? `other: ${a.other}` : a.otherChecked && "other",
                ].filter(Boolean).join(", ");
                return (
                  <div key={a.id} className="rounded-xl border border-[var(--border)] p-3">
                    <div className="font-semibold text-sm">{a.name || "(unnamed)"}</div>
                    {a.classification && <div className="text-sm text-[var(--ink-soft)]">{a.classification}</div>}
                    {sx && <div className="text-sm">Reactions: {sx}</div>}
                    {a.anaphylaxis && <span className="inline-block mt-1 text-[10px] uppercase font-semibold text-[var(--alert)] bg-[var(--alert-soft)] px-2 py-0.5 rounded-full">Anaphylaxis risk</span>}
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
                    <table className="w-full text-xs mt-1 border-collapse">
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
            <Kv label="Gender identity" value={profile?.genderIdentity === "I use a different term" ? profile.genderIdentityOther : profile?.genderIdentity} />
            <Kv label="Sex at birth" value={profile?.sexAtBirth === "Another term" ? profile.sexAtBirthOther : profile?.sexAtBirth} />
          </div>
        </Section>

        <Section title="Main issues right now">
          {SYMPTOM_GROUPS.map((grp) => {
            const items = grp.items.map((it) => ({ it, v: (profile?.symptoms ?? {})[`${grp.heading}::${it}`] })).filter((x) => x.v);
            if (items.length === 0) return null;
            return (
              <div key={grp.heading} className="mb-1 text-sm">
                <span className="font-semibold">{grp.heading}:</span>{" "}
                {items.map((x, i) => (
                  <span key={i} className={x.v === "Yes" ? "text-[var(--alert)]" : "text-[var(--ink-soft)]"}>
                    {x.it} ({x.v}){i < items.length - 1 ? "; " : ""}
                  </span>
                ))}
              </div>
            );
          })}
          {additionalSymptoms.length > 0 && (
            <div className="mt-2 text-sm">
              <span className="font-semibold">Other:</span>{" "}
              {additionalSymptoms.filter((s) => s.text).map((s, i) => (
                <span key={s.id}>
                  {s.text} {s.answer ? `(${s.answer})` : ""}{i < additionalSymptoms.length - 1 ? "; " : ""}
                </span>
              ))}
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

        <footer className="mt-10 pt-4 border-t border-[var(--border)] text-xs text-[var(--ink-soft)]">
          Hairy but Handled — Notice the Shifts. Act on the Flags. · Generated {format(new Date(), "d MMM yyyy, h:mm a")}.
        </footer>
      </div>

      <style jsx global>{`
        .report h3.section-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--ink);
          border-bottom: 2px solid var(--primary);
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

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <th className={center ? "text-center" : "text-left"}>{children}</th>;
}
function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <td className={center ? "text-center" : "text-left"}>{children}</td>;
}
