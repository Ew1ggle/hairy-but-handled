"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, PageTitle, Slider0to10, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type Admission, type DailyLog, type FlagEvent, type InfusionLog } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { differenceInCalendarDays, format, isToday, parseISO } from "date-fns";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Copy as CopyIcon, Plus, Trash2, Search, X, TrendingDown, TrendingUp, Minus, ChevronLeft, ChevronRight, CalendarDays, Droplet, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { usePatientName } from "@/lib/usePatientName";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";
import { PHASE_LABEL, searchSideEffects, tagForSideEffect, type SideEffect } from "@/lib/sideEffects";
import { DAY_DEFINITIONS, getSuggestedActivities, type DayColour } from "@/lib/dayActivities";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";
import { TodaysSignalsCard } from "@/components/TodaysSignalsCard";
import { QuestionsCard } from "@/components/QuestionsCard";
import { BloodsSummaryCard } from "@/components/BloodsSummaryCard";
import { TripwiresTodayCard } from "@/components/TripwiresTodayCard";
import { MoreTripwiresPrompt } from "@/components/MoreTripwiresPrompt";
import { ScheduledInfusionTile } from "@/components/ScheduledInfusionTile";
import { TrendsSummaryCard } from "@/components/TrendsSummaryCard";

export default function LogPageWrapper() {
  return (
    <Suspense fallback={<AppShell><div /></AppShell>}>
      <LogPage />
    </Suspense>
  );
}

type YNN = "Yes" | "No" | "Not sure" | "";

// Structured "what's happening today" — mirrors the profile's main-issues-at-time-of-profile style
const CHECKINS: { key: keyof DailyLogExtra; label: string; hint?: string }[] = [
  { key: "fever", label: "Fever or chills", hint: "Temperature ≥ 37.8 °C, shivers, sweats" },
  { key: "breathless", label: "Breathlessness or chest pain", hint: "Any shortness of breath that's new or worse" },
  { key: "bleeding", label: "Bleeding or new bruising", hint: "Gums, nose, heavy period, black stools, unexplained bruises" },
  { key: "infusionSite", label: "Infusion site / cannula issue", hint: "Pain, swelling, redness, leaking" },
  { key: "nauseaVom", label: "Can't keep fluids down", hint: "Vomiting, severe nausea, no intake" },
  { key: "confusion", label: "Confusion or feeling very unwell", hint: "Faintness, severe weakness, 'becoming unwell'" },
];

type EDTreatmentRow = {
  id: string;
  treatment: string;
  details: string;
};

type NightSweats = "" | "none" | "some" | "drenched";

type DailyLogExtra = {
  fever?: YNN; breathless?: YNN; bleeding?: YNN; infusionSite?: YNN; nauseaVom?: YNN; confusion?: YNN;
  bowels?: YNN;
  hydrationL?: string;
  dayColour?: DayColour;
  nightSweats?: NightSweats;
  edVisit?: boolean;
  edTime?: string;
  edHospital?: string;
  edDoctors?: string[];
  edNurses?: string[];
  edPresentation?: string;
  edPresentationOther?: string;
  edTreatments?: EDTreatmentRow[];
};

const ISO_DAY = (d: Date) => format(d, "yyyy-MM-dd");
const TODAY_ISO = () => ISO_DAY(new Date());
const entryDay = (d: DailyLog) => format(parseISO(d.createdAt), "yyyy-MM-dd");

function LogPage() {
  const router = useRouter();
  const search = useSearchParams();
  const flagged = search.get("flagged") === "1";
  const dateParam = search.get("date");
  const { firstName, isSupport } = usePatientName();
  const { addEntry, updateEntry, activePatientId } = useSession();
  const entries = useEntries("daily");
  const infusionEntries = useEntries("infusion");
  const admissionEntries = useEntries("admission");

  // Which day are we logging for? Default to today. Accept ?date=yyyy-mm-dd for deep-links.
  const [logDate, setLogDate] = useState<string>(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam;
    return TODAY_ISO();
  });

  const existing = useMemo(
    () => entries.find((d) => entryDay(d) === logDate),
    [entries, logDate]
  );
  // Most recent log BEFORE the selected date, used for "copy from previous"
  const previous = useMemo(
    () => entries.filter((d) => entryDay(d) < logDate).sort((a, b) => entryDay(b).localeCompare(entryDay(a)))[0],
    [entries, logDate]
  );
  const isLoggingToday = logDate === TODAY_ISO();
  const logDateLabel = useMemo(() => {
    const d = parseISO(`${logDate}T00:00:00`);
    if (isToday(d)) return "Today";
    const diff = differenceInCalendarDays(new Date(), d);
    const datePart = format(d, "EEE d MMM");
    if (diff === 1) return `Yesterday (${datePart})`;
    if (diff > 1 && diff <= 7) return `${diff} days ago (${datePart})`;
    return datePart;
  }, [logDate]);

  // Infusion entry for the currently-selected log date, if any
  const infusionForDay = useMemo(
    () => infusionEntries.find((i) => format(parseISO(i.createdAt), "yyyy-MM-dd") === logDate),
    [infusionEntries, logDate]
  );

  // Admission entry where admissionDate matches the selected log date
  const admissionForDay = useMemo(
    () => admissionEntries.find((a) => a.admissionDate === logDate),
    [admissionEntries, logDate]
  );

  // Days we have no log for, in the last 7 days (excluding today), to nudge backfill
  const missedDays = useMemo(() => {
    const haveDays = new Set(entries.map(entryDay));
    const out: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = ISO_DAY(d);
      if (!haveDays.has(iso)) out.push(iso);
    }
    return out;
  }, [entries]);

  const [temperatureC, setTemp] = useState<string>("");
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [nausea, setNausea] = useState<number | null>(null);
  const [appetite, setAppetite] = useState<number | null>(null);
  const [breathlessness, setBreath] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [brainFog, setBrainFog] = useState<number | null>(null);
  const [sleepHours, setSleep] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [weighedAt, setWeighedAt] = useState<string>("");
  const [baselineWeight, setBaselineWeight] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [extra, setExtra] = useState<DailyLogExtra>({});
  const [dirty, setDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved">("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useUnsavedWarning(dirty);

  // Pull baseline weight from the patient profile for delta comparison
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const raw = (data?.data as { baselineWeight?: string } | undefined)?.baselineWeight;
        const n = raw ? Number(raw) : NaN;
        setBaselineWeight(Number.isFinite(n) && n > 0 ? n : null);
      });
  }, [activePatientId]);

  useEffect(() => {
    // Reset first so switching to a day with no log doesn't keep another day's values
    setTemp("");
    setFatigue(null); setPain(null); setNausea(null); setAppetite(null);
    setBreath(null); setMood(null); setBrainFog(null);
    setSleep("");
    setWeightKg(""); setWeighedAt("");
    setTags([]); setNotes("");
    setExtra({});
    setDirty(false);

    if (existing) {
      setTemp(existing.temperatureC?.toString() ?? "");
      setFatigue(existing.fatigue ?? null);
      setPain(existing.pain ?? null);
      setNausea(existing.nausea ?? null);
      setAppetite(existing.appetite ?? null);
      setBreath(existing.breathlessness ?? null);
      setMood(existing.mood ?? null);
      setBrainFog(existing.brainFog ?? null);
      setSleep(existing.sleepHours?.toString() ?? "");
      setWeightKg(existing.weightKg != null ? String(existing.weightKg) : "");
      setWeighedAt(existing.weighedAt ?? "");
      setTags(existing.tags ?? []);
      setNotes(existing.notes ?? "");
      const ex = (existing as unknown as DailyLogExtra);
      setExtra({
        fever: ex.fever, breathless: ex.breathless, bleeding: ex.bleeding,
        infusionSite: ex.infusionSite, nauseaVom: ex.nauseaVom, confusion: ex.confusion,
        bowels: ex.bowels, hydrationL: ex.hydrationL,
        edVisit: ex.edVisit, edTime: ex.edTime, edHospital: ex.edHospital,
        edDoctors: ex.edDoctors ?? [], edNurses: ex.edNurses ?? [],
        edPresentation: ex.edPresentation, edPresentationOther: ex.edPresentationOther,
        edTreatments: ex.edTreatments ?? [],
        dayColour: ex.dayColour,
        nightSweats: ex.nightSweats,
      });
    }
  }, [logDate, existing?.id]);

  const copyYesterday = () => {
    if (!previous) return;
    setTemp(previous.temperatureC?.toString() ?? "");
    setFatigue(previous.fatigue ?? null);
    setPain(previous.pain ?? null);
    setNausea(previous.nausea ?? null);
    setAppetite(previous.appetite ?? null);
    setBreath(previous.breathlessness ?? null);
    setMood(previous.mood ?? null);
    setBrainFog(previous.brainFog ?? null);
    setSleep(previous.sleepHours?.toString() ?? "");
    setTags(previous.tags ?? []);
  };

  const buildPayload = useCallback(() => {
    const base = {
      kind: "daily" as const,
      temperatureC: temperatureC ? Number(temperatureC) : null,
      fatigue, pain, nausea, appetite, breathlessness, mood, brainFog,
      sleepHours: sleepHours ? Number(sleepHours) : null,
      weightKg: weightKg ? Number(weightKg) : null,
      weighedAt: weighedAt || undefined,
      tags, notes, manuallyLogged: true, ...extra,
    };
    // For backfilled (non-today) dates, anchor the entry to noon of the selected day
    // so the UI date maths reads it as that day. Today uses whatever "now" is.
    if (!isLoggingToday) {
      return { ...base, createdAt: new Date(`${logDate}T12:00:00`).toISOString() };
    }
    return base;
  }, [temperatureC, fatigue, pain, nausea, appetite, breathlessness, mood, brainFog, sleepHours, weightKg, weighedAt, tags, notes, extra, isLoggingToday, logDate]);

  // Autosave — debounced 3 seconds after any change
  useEffect(() => {
    if (!dirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      const payload = buildPayload();
      if (existing) {
        await updateEntry(existing.id, payload);
      } else {
        await addEntry(payload as Omit<DailyLog, "id" | "createdAt">);
      }
      setDirty(false);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus(""), 2000);
    }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [dirty, buildPayload, existing, updateEntry, addEntry]);

  const saveAndClose = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const payload = buildPayload();
    setDirty(false);
    if (existing) await updateEntry(existing.id, payload);
    else await addEntry(payload as Omit<DailyLog, "id" | "createdAt">);
    router.push("/");
  };

  const hasRedFlag = CHECKINS.some((c) => extra[c.key] === "Yes");

  return (
    <AppShell>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      {/* Autosave indicator */}
      {autoSaveStatus && (
        <div className="fixed top-14 right-4 z-50 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink-soft)] shadow-lg brand-font">
          {autoSaveStatus === "saving" ? "Saving..." : "Saved"}
        </div>
      )}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div data-dirty={dirty ? "true" : "false"} onChange={() => { if (!dirty) setDirty(true); }} onClick={() => { if (!dirty) setDirty(true); }}>
      <PageTitle sub="From fragments to focus">Daily Trace</PageTitle>
      <p className="-mt-3 mb-5 text-sm text-[var(--ink)]">
        <span className="font-medium">
          {isLoggingToday
            ? (existing ? "Update today" : isSupport ? `How is ${firstName} today?` : "How are you today?")
            : (existing ? `Update log — ${logDateLabel}` : isSupport ? `How was ${firstName} on ${logDateLabel}?` : `How were you on ${logDateLabel}?`)}
        </span>
        <span className="text-[var(--ink-soft)]">
          {" · "}
          {isLoggingToday ? format(new Date(), "EEEE d MMMM, h:mm a") : `Logging for ${logDateLabel}`}
        </span>
      </p>

      {/* Date selector */}
      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-[var(--ink-soft)] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-semibold">Logging for</div>
            <div className="font-semibold truncate">{logDateLabel}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              const d = parseISO(`${logDate}T00:00:00`);
              d.setDate(d.getDate() - 1);
              setLogDate(ISO_DAY(d));
            }}
            className="p-2 rounded-xl border border-[var(--border)]"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={isLoggingToday}
            onClick={() => {
              const d = parseISO(`${logDate}T00:00:00`);
              d.setDate(d.getDate() + 1);
              const next = ISO_DAY(d);
              setLogDate(next > TODAY_ISO() ? TODAY_ISO() : next);
            }}
            className="p-2 rounded-xl border border-[var(--border)] disabled:opacity-40"
            aria-label="Next day"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <DateInput value={logDate} onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (v > TODAY_ISO()) { setLogDate(TODAY_ISO()); return; }
              setLogDate(v);
            }} />
          </div>
          {!isLoggingToday && (
            <button
              type="button"
              onClick={() => setLogDate(TODAY_ISO())}
              className="rounded-xl bg-[var(--primary)] text-white px-3 py-2 text-sm font-medium"
            >
              Today
            </button>
          )}
        </div>
        {!isLoggingToday && !existing && (
          <p className="mt-2 text-xs text-[var(--ink-soft)]">
            Backfilling — this day has no log yet. Anything you save will be anchored to {format(parseISO(`${logDate}T00:00:00`), "EEE d MMM")}.
          </p>
        )}
      </Card>

      {/* Scheduled treatment for the selected day — flagged red/amber if not
           completed, green if it is. Always rendered for scheduled days, even
           when no infusion entry exists yet, so a forgotten infusion is never
           silent on the daily record. */}
      <ScheduledInfusionTile date={logDate} className="mb-4" />

      {/* Expanded inline detail for an existing infusion entry on this day. */}
      {infusionForDay && <InfusionInlineCard infusion={infusionForDay} />}

      {/* ED admission for the selected day — expandable to show details inline */}
      {admissionForDay && <AdmissionInlineCard admission={admissionForDay} />}

      {/* Missed days — collapsed banner with expand + dismiss option */}
      {isLoggingToday && missedDays.length > 0 && (
        <MissedDaysBanner
          missedDays={missedDays}
          onPickDate={(d) => setLogDate(d)}
          activePatientId={activePatientId}
          onDismiss={async (days) => {
            // Silently flag each missed day so exports still know the gap existed.
            for (const d of days) {
              await addEntry({
                kind: "flag",
                triggerLabel: `Day not logged — patient opted out (${d})`,
                createdAt: new Date(`${d}T12:00:00`).toISOString(),
              } as Omit<FlagEvent, "id" | "createdAt"> & { createdAt?: string });
            }
          }}
        />
      )}

      <MedicalDisclaimerBanner />

      {/* Cross-link: show today's Signal Sweep readings so they aren't re-entered here. */}
      {isLoggingToday && <TodaysSignalsCard />}

      {/* Trends that the rule engine is currently firing — sits next to the
           day's data so patterns surface at log time. */}
      {isLoggingToday && <TrendsSummaryCard title="Trends firing now" />}

      {flagged && <MoreTripwiresPrompt />}

      {previous && !existing && (
        <button
          onClick={copyYesterday}
          className="w-full mb-4 rounded-2xl border border-[var(--border)] py-3 text-sm inline-flex items-center justify-center gap-2"
        >
          <CopyIcon size={14} /> Copy values from {format(parseISO(previous.createdAt), "EEE d MMM")} (then tweak)
        </button>
      )}

      {/* Tripwires raised today — sourced from flag entries populated by
           Signal Sweep auto-detections, Tripwires taps, and Emergency visits.
           Replaces the old manual Yes/No grid. */}
      <TripwiresTodayCard />

      {/* Day colour picker moved to the home page ("How am I feeling overall?")
           so the descriptor and suggested strategies are visible up front. */}

      {/* Once a day — night sweats, sleep, weight. The rest (temp, fluids,
           fatigue/mood/pain etc.) lives in Signal Sweep now. */}
      <Card className="space-y-4 mb-4">
        <div>
          <h2 className="font-semibold">Once a day</h2>
          <p className="text-xs text-[var(--ink-soft)]">
            Night sweats are a classic lymphoma signal. Sleep and weight are
            worth trending.
          </p>
        </div>
        <div>
          <div className="text-sm mb-1.5">Night sweats (from last night)</div>
          <div className="flex gap-2">
            {([
              { key: "none", label: "None" },
              { key: "some", label: "A bit damp" },
              { key: "drenched", label: "Drenched — changed clothes or sheets" },
            ] as const).map(({ key, label }) => {
              const on = (extra.nightSweats ?? "") === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setExtra({ ...extra, nightSweats: on ? "" : key })}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs border leading-tight ${
                    on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Sleep last night" hint="hours">
          <TextInput type="number" inputMode="decimal" step="0.5" placeholder="e.g. 7" value={sleepHours} onChange={(e) => setSleep(e.target.value)} />
        </Field>
        <div>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <Field label="Weight today" hint="kg">
              <TextInput
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={baselineWeight != null ? `baseline ${baselineWeight}` : "e.g. 68.5"}
                value={weightKg}
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  if (e.target.value && !weighedAt) {
                    const now = new Date();
                    setWeighedAt(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
                  }
                }}
              />
            </Field>
            <Field label="Weighed at">
              <TextInput type="time" value={weighedAt} onChange={(e) => setWeighedAt(e.target.value)} />
            </Field>
          </div>
          <WeightDelta current={weightKg} baseline={baselineWeight} />
        </div>
      </Card>

      {/* Test results — compact summary of latest bloods */}
      {isLoggingToday && <BloodsSummaryCard />}

      {/* Questions for the care team — collapsed from the old /questions page */}
      {isLoggingToday && <QuestionsCard />}

      {/* ED Visit — only surface the manual toggle when there's no admission for today */}
      {!admissionForDay && <EDVisitSection extra={extra} setExtra={setExtra} />}

      <Card className="mb-6">
        <Field label="Notes (optional)" hint="Anything else worth the team knowing">
          <TextArea
            placeholder="Anything — meds you took, someone visited, how the night was…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </Card>

      </div>
      <Submit onClick={saveAndClose}>{existing ? "Save and close" : "Save log"}</Submit>
      <p className="text-xs text-center text-[var(--ink-soft)] mt-2">Changes are autosaved as you go</p>
    </AppShell>
  );
}

/** Collapsed missed-days notice with expand + permanent-dismiss option.
 *  Persistence: per-patient localStorage key so the user only decides once. */
function MissedDaysBanner({
  missedDays, onPickDate, onDismiss, activePatientId,
}: {
  missedDays: string[];
  onPickDate: (iso: string) => void;
  onDismiss: (days: string[]) => Promise<void>;
  activePatientId: string | null;
}) {
  const storageKey = `hbh_dismissMissedDays_${activePatientId ?? "anon"}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  const handleDismiss = async () => {
    try { window.localStorage.setItem(storageKey, "1"); } catch {}
    setDismissed(true);
    await onDismiss(missedDays);
  };

  return (
    <div className="mb-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-2.5 flex items-center gap-3 active:bg-[var(--surface-soft)]"
      >
        <CalendarDays size={16} className="text-[var(--ink-soft)] shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium">
            {missedDays.length} day{missedDays.length === 1 ? "" : "s"} missed last week
          </div>
          <div className="text-[11px] text-[var(--ink-soft)]">
            Tap to expand or dismiss
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[var(--ink-soft)]" /> : <ChevronDown size={16} className="text-[var(--ink-soft)]" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-[var(--border)] pt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {missedDays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onPickDate(d)}
                className="rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-sm"
              >
                {format(parseISO(`${d}T00:00:00`), "EEE d MMM")}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full text-left rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm active:bg-[var(--surface-soft)]"
          >
            <div className="font-medium">I won't be logging missed days</div>
            <div className="text-[11px] text-[var(--ink-soft)] mt-0.5 leading-relaxed">
              Stops these nudges. A silent "day not logged" marker is saved for each missed day so the care team's export still shows the gap.
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

/** Today's infusion — summary header + click-to-expand details inline.
 *  The "Open full log" link is still there for the full editor on /treatment/[day]. */
function InfusionInlineCard({ infusion }: { infusion: InfusionLog }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 active:bg-[var(--surface-soft)]"
      >
        <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
          <Droplet size={18} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-semibold text-[var(--ink)]">
            Infusion logged — Day {infusion.cycleDay}
          </div>
          <div className="text-xs text-[var(--ink-soft)] truncate">
            {infusion.drugs || "Open the infusion log"}
            {infusion.completed ? " · completed" : ""}
            {infusion.reaction ? " · reaction recorded" : ""}
          </div>
        </div>
        <ChevronRight
          size={18}
          className="text-[var(--ink-soft)] shrink-0 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-1.5 text-sm">
          {infusion.plannedTime && <InfoRow label="Planned" value={infusion.plannedTime} />}
          {infusion.actualStart && <InfoRow label="Started" value={infusion.actualStart.replace("T", " ")} />}
          {infusion.actualEnd && <InfoRow label="Ended" value={infusion.actualEnd.replace("T", " ")} />}
          <InfoRow label="Completed" value={infusion.completed ? "Yes" : "No"} />
          <InfoRow label="Reaction" value={infusion.reaction ? "Yes" : "No"} />
          {infusion.reaction && (infusion.reactionSymptoms ?? []).length > 0 && (
            <InfoRow label="Symptoms" value={(infusion.reactionSymptoms ?? []).join(", ")} />
          )}
          {infusion.reactionTimeAfterStart && (
            <InfoRow label="After start" value={infusion.reactionTimeAfterStart} />
          )}
          {infusion.paused && <InfoRow label="Paused" value="Yes" />}
          {infusion.meds && <InfoRow label="Meds given" value={infusion.meds} />}
          {infusion.outcome && <InfoRow label="Outcome" value={infusion.outcome} />}
          {infusion.notes && <InfoRow label="Notes" value={infusion.notes} />}
          <Link
            href={`/treatment/${infusion.cycleDay}`}
            className="inline-block mt-2 text-sm font-medium text-[var(--primary)]"
          >
            Edit full log →
          </Link>
        </div>
      )}
    </div>
  );
}

/** Auto-populated card when an admission exists for the selected day —
 *  replaces the manual ED Visit toggle so the info doesn't have to be re-entered. */
function AdmissionInlineCard({ admission }: { admission: Admission }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded-2xl border-2 border-[var(--alert)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 active:bg-[var(--surface-soft)]"
      >
        <div className="w-10 h-10 rounded-full bg-[var(--alert)] text-white flex items-center justify-center shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-semibold text-[var(--alert)]">
            ED / hospital visit logged
          </div>
          <div className="text-xs text-[var(--ink-soft)] truncate">
            {admission.hospital}
            {admission.reason ? ` · ${admission.reason}` : ""}
            {admission.dischargeDate ? " · discharged" : " · ongoing"}
          </div>
        </div>
        <ChevronRight
          size={18}
          className="text-[var(--ink-soft)] shrink-0 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-1.5 text-sm">
          <InfoRow label="Hospital" value={admission.hospital} />
          <InfoRow label="Reason" value={admission.reason} />
          <InfoRow label="Admitted" value={admission.admissionDate} />
          {admission.dischargeDate && <InfoRow label="Discharged" value={admission.dischargeDate} />}
          {admission.dischargeDetails && <InfoRow label="Discharge notes" value={admission.dischargeDetails} />}
          {admission.dischargeMedications && (
            <InfoRow label="Discharge meds" value={admission.dischargeMedications} />
          )}
          {(admission.treatments ?? []).length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mt-2 mb-1">Treatments</div>
              <ul className="list-disc pl-5 text-sm space-y-0.5">
                {(admission.treatments ?? []).map((t) => (
                  <li key={t.id}>
                    <span className="font-medium">{t.treatment}</span>
                    {t.details ? <span className="text-[var(--ink-soft)]"> — {t.details}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {admission.notes && <InfoRow label="Notes" value={admission.notes} />}
          <Link
            href="/admissions"
            className="inline-block mt-2 text-sm font-medium text-[var(--primary)]"
          >
            Edit admission →
          </Link>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 w-28 text-xs uppercase tracking-wide text-[var(--ink-soft)] pt-0.5">{label}</span>
      <span className="flex-1 min-w-0 text-[var(--ink)] break-words">{value}</span>
    </div>
  );
}

function SideEffectPicker({ tags, onTagsChange }: {
  tags: string[];
  onTagsChange: (t: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const { firstName, isSupport } = usePatientName();

  const sideEffectPrefix = tagForSideEffect({ title: "" }); // "Side effect: "
  const activeSideEffects = tags
    .filter((t) => t.startsWith(sideEffectPrefix))
    .map((t) => t.slice(sideEffectPrefix.length));

  const filtered = searchSideEffects(q);

  const addSideEffect = (s: SideEffect) => {
    const tag = tagForSideEffect(s);
    if (!tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
    setQ("");
  };

  const removeSideEffect = (title: string) => {
    onTagsChange(tags.filter((t) => t !== tagForSideEffect({ title })));
  };

  return (
    <Card className="space-y-3 mb-4">
      <div>
        <h2 className="font-semibold">Side effects</h2>
        <p className="text-xs text-[var(--ink-soft)]">Search and add any side effects {isSupport ? `${firstName} is` : "you're"} experiencing</p>
      </div>

      {activeSideEffects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeSideEffects.map((title) => (
            <span key={title} className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] text-white px-3 py-1.5 text-sm">
              {title}
              <button type="button" onClick={() => removeSideEffect(title)} className="opacity-80 hover:opacity-100">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search side effects... e.g. rash, fever, tired"
          className="pl-9"
        />
        {q.trim() && filtered.length > 0 && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-auto">
            {filtered.map((s) => {
              const already = activeSideEffects.includes(s.title);
              return (
                <button key={s.id} type="button" onClick={() => !already && addSideEffect(s)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-[var(--border)] last:border-0 ${already ? "opacity-50" : "hover:bg-[var(--surface-soft)]"}`}>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{PHASE_LABEL[s.phase]}{s.urgentAction === "ed" ? " · Urgent" : ""}</div>
                </button>
              );
            })}
          </div>
        )}
        {q.trim() && filtered.length === 0 && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg px-3 py-2 text-sm text-[var(--ink-soft)]">
            No matches for "{q}"
          </div>
        )}
      </div>
    </Card>
  );
}

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

const ED_TREATMENT_OPTIONS = [
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

function WeightDelta({ current, baseline }: { current: string; baseline: number | null }) {
  if (baseline == null) {
    if (!current) return null;
    return (
      <p className="mt-2 text-xs text-[var(--ink-soft)]">
        Set a baseline weight in the profile to see change since baseline.
      </p>
    );
  }
  const n = Number(current);
  if (!current || !Number.isFinite(n) || n <= 0) return null;
  const diff = n - baseline;
  const pct = (diff / baseline) * 100;
  const absPct = Math.abs(pct);

  // Cancer care: unintended weight loss ≥2% is clinically meaningful.
  const isLoss = diff < 0;
  const isSignificantLoss = isLoss && absPct >= 2;
  const isStable = absPct < 0.5;

  const tone = isSignificantLoss
    ? { bg: "var(--alert-soft)", border: "var(--alert)", ink: "var(--alert)" }
    : isStable
    ? { bg: "var(--surface-soft)", border: "var(--border)", ink: "var(--ink-soft)" }
    : { bg: "var(--surface-soft)", border: "var(--border)", ink: "var(--ink)" };

  const Icon = isStable ? Minus : isLoss ? TrendingDown : TrendingUp;
  const direction = isStable ? "Stable" : isLoss ? "Down" : "Up";
  const signed = `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`;

  return (
    <div
      className="mt-2 rounded-xl border p-3 text-sm"
      style={{ backgroundColor: tone.bg, borderColor: tone.border, color: tone.ink }}
    >
      <div className="flex items-center gap-2 font-semibold">
        <Icon size={14} /> {direction}: {signed} vs baseline ({baseline} kg)
      </div>
      {isSignificantLoss && (
        <p className="mt-1 text-xs">
          Unintended weight loss of 2% or more since baseline is worth flagging to the team — it can affect treatment planning.
        </p>
      )}
    </div>
  );
}

function EDVisitSection({ extra, setExtra }: { extra: DailyLogExtra; setExtra: (v: DailyLogExtra) => void }) {
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const filteredTreatments = treatmentSearch
    ? ED_TREATMENT_OPTIONS.filter((t) => t.toLowerCase().includes(treatmentSearch.toLowerCase()))
    : ED_TREATMENT_OPTIONS;

  const doctors = extra.edDoctors ?? [];
  const nurses = extra.edNurses ?? [];
  const treatments = extra.edTreatments ?? [];

  const addDoctor = () => setExtra({ ...extra, edDoctors: [...doctors, ""] });
  const updateDoctor = (i: number, v: string) => { const d = [...doctors]; d[i] = v; setExtra({ ...extra, edDoctors: d }); };
  const removeDoctor = (i: number) => setExtra({ ...extra, edDoctors: doctors.filter((_, idx) => idx !== i) });

  const addNurse = () => setExtra({ ...extra, edNurses: [...nurses, ""] });
  const updateNurse = (i: number, v: string) => { const n = [...nurses]; n[i] = v; setExtra({ ...extra, edNurses: n }); };
  const removeNurse = (i: number) => setExtra({ ...extra, edNurses: nurses.filter((_, idx) => idx !== i) });

  const addTreatment = (name: string) => {
    if (treatments.some((t) => t.treatment === name)) return;
    setExtra({ ...extra, edTreatments: [...treatments, { id: crypto.randomUUID(), treatment: name, details: "" }] });
    setTreatmentSearch("");
  };
  const updateTreatmentDetails = (id: string, details: string) => {
    setExtra({ ...extra, edTreatments: treatments.map((t) => t.id === id ? { ...t, details } : t) });
  };
  const removeTreatment = (id: string) => {
    setExtra({ ...extra, edTreatments: treatments.filter((t) => t.id !== id) });
  };

  return (
    <Card className="space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Emergency Department visit</h2>
          <p className="text-xs text-[var(--ink-soft)]">Tick if you attended ED today</p>
        </div>
        <button
          type="button"
          onClick={() => setExtra({ ...extra, edVisit: !extra.edVisit })}
          className={`w-12 h-7 rounded-full transition-colors ${extra.edVisit ? "bg-[var(--alert)]" : "bg-[var(--border)]"}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${extra.edVisit ? "translate-x-5" : ""}`} />
        </button>
      </div>

      {extra.edVisit && (
        <div className="space-y-4 pt-2 border-t border-[var(--border)]">
          <Field label="Time of visit">
            <TextInput type="time" value={extra.edTime ?? ""} onChange={(e) => setExtra({ ...extra, edTime: e.target.value })} />
          </Field>

          <Field label="Hospital / Emergency visited">
            <TextInput value={extra.edHospital ?? ""} onChange={(e) => setExtra({ ...extra, edHospital: e.target.value })} placeholder="e.g. Royal Brisbane" />
          </Field>

          {/* Treating Doctors */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">Treating doctor(s) <span className="text-xs text-[var(--ink-soft)]">(if known)</span></span>
              <button type="button" onClick={addDoctor} className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium">
                <Plus size={14} /> Add
              </button>
            </div>
            {doctors.map((d, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <TextInput value={d} onChange={(e) => updateDoctor(i, e.target.value)} placeholder="Doctor name" />
                <button type="button" onClick={() => removeDoctor(i)} className="text-[var(--ink-soft)] shrink-0 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {doctors.length === 0 && (
              <button type="button" onClick={addDoctor} className="w-full rounded-xl border border-dashed border-[var(--border)] py-2.5 text-sm text-[var(--ink-soft)]">
                + Add a treating doctor
              </button>
            )}
          </div>

          {/* Treating Nurses */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">Treating nurse(s) <span className="text-xs text-[var(--ink-soft)]">(if known)</span></span>
              <button type="button" onClick={addNurse} className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium">
                <Plus size={14} /> Add
              </button>
            </div>
            {nurses.map((n, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <TextInput value={n} onChange={(e) => updateNurse(i, e.target.value)} placeholder="Nurse name" />
                <button type="button" onClick={() => removeNurse(i)} className="text-[var(--ink-soft)] shrink-0 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {nurses.length === 0 && (
              <button type="button" onClick={addNurse} className="w-full rounded-xl border border-dashed border-[var(--border)] py-2.5 text-sm text-[var(--ink-soft)]">
                + Add a treating nurse
              </button>
            )}
          </div>

          {/* Presentation */}
          <div>
            <div className="text-sm font-medium mb-1.5">Presentation</div>
            <div className="flex flex-wrap gap-2">
              {ED_PRESENTATIONS.map((p) => {
                const on = extra.edPresentation === p;
                return (
                  <button key={p} type="button" onClick={() => setExtra({ ...extra, edPresentation: on ? "" : p })}
                    className={`rounded-xl px-3 py-2 text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
            {extra.edPresentation === "Other [Please specify]" && (
              <TextInput className="mt-2" value={extra.edPresentationOther ?? ""} onChange={(e) => setExtra({ ...extra, edPresentationOther: e.target.value })} placeholder="Please specify presentation" />
            )}
          </div>

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
                          <input
                            type="text"
                            value={t.details}
                            onChange={(e) => updateTreatmentDetails(t.id, e.target.value)}
                            placeholder="Additional details"
                            className="w-full bg-transparent py-1 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-2">
                          <button type="button" onClick={() => removeTreatment(t.id)} className="text-[var(--ink-soft)] p-1">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quick-add common treatments */}
            {treatments.length === 0 && !treatmentSearch && (
              <div className="flex flex-wrap gap-1.5">
                {ED_TREATMENT_OPTIONS.slice(0, 6).map((t) => (
                  <button key={t} type="button" onClick={() => addTreatment(t)}
                    className="rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)]">
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
