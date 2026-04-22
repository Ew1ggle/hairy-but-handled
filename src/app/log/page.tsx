"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, PageTitle, Slider0to10, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type DailyLog } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { differenceInCalendarDays, format, isToday, parseISO } from "date-fns";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Copy as CopyIcon, Plus, Trash2, Search, X, TrendingDown, TrendingUp, Minus, ChevronLeft, ChevronRight, CalendarDays, Droplet } from "lucide-react";
import Link from "next/link";
import { usePatientName } from "@/lib/usePatientName";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";
import { SIDE_EFFECTS, PHASE_LABEL, type SideEffect } from "@/lib/sideEffects";
import { DAY_DEFINITIONS, getSuggestedActivities, type DayColour } from "@/lib/dayActivities";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";

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
  { key: "fever", label: "Fever or chills", hint: "Temperature ≥ 38 °C, shivers, sweats" },
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

type DailyLogExtra = {
  fever?: YNN; breathless?: YNN; bleeding?: YNN; infusionSite?: YNN; nauseaVom?: YNN; confusion?: YNN;
  bowels?: YNN;
  hydrationL?: string;
  dayColour?: DayColour;
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
      <PageTitle sub={isLoggingToday ? format(new Date(), "EEEE d MMMM, h:mm a") : `Logging for ${logDateLabel}`}>
        {isLoggingToday
          ? (existing ? "Update today" : isSupport ? `How is ${firstName} today?` : "How are you today?")
          : (existing ? `Update log — ${logDateLabel}` : isSupport ? `How was ${firstName} on ${logDateLabel}?` : `How were you on ${logDateLabel}?`)}
      </PageTitle>

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

      {/* Infusion shortcut — when an infusion is logged for the selected day */}
      {infusionForDay && (
        <Link
          href={`/treatment/${infusionForDay.cycleDay}`}
          className="block mb-4 rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-3 active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
              <Droplet size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--ink)]">
                Infusion logged — Day {infusionForDay.cycleDay}
              </div>
              <div className="text-xs text-[var(--ink-soft)] truncate">
                {infusionForDay.drugs || "Open the infusion log"}
                {infusionForDay.completed ? " · completed" : ""}
                {infusionForDay.reaction ? " · reaction recorded" : ""}
              </div>
            </div>
            <ChevronRight size={18} className="text-[var(--ink-soft)] shrink-0" />
          </div>
        </Link>
      )}

      {/* Missed days quick-jump (only when viewing today and there are gaps) */}
      {isLoggingToday && missedDays.length > 0 && (
        <Card className="mb-4 border-dashed">
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-1">Missed days (last week)</div>
          <p className="text-xs text-[var(--ink-soft)] mb-2">No log yet for these days. Tap one to fill it in.</p>
          <div className="flex flex-wrap gap-2">
            {missedDays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setLogDate(d)}
                className="rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-sm"
              >
                {format(parseISO(`${d}T00:00:00`), "EEE d MMM")}
              </button>
            ))}
          </div>
        </Card>
      )}

      <MedicalDisclaimerBanner />

      {flagged && (
        <Card className="mb-4 border-[var(--alert)] bg-[var(--alert-soft)]">
          <p className="text-sm">🚩 A red flag was logged. Add any extra detail here, then save.</p>
        </Card>
      )}

      {previous && !existing && (
        <button
          onClick={copyYesterday}
          className="w-full mb-4 rounded-2xl border border-[var(--border)] py-3 text-sm inline-flex items-center justify-center gap-2"
        >
          <CopyIcon size={14} /> Copy values from {format(parseISO(previous.createdAt), "EEE d MMM")} (then tweak)
        </button>
      )}

      {/* Fast red-flag check — do this first */}
      <Card className="space-y-4 mb-4">
        <div>
          <h2 className="font-semibold">{isSupport ? `Anything serious for ${firstName} right now?` : "Anything serious right now?"}</h2>
          <p className="text-xs text-[var(--ink-soft)]">Tick Yes if any of these are happening. Yes means call the team.</p>
        </div>
        {CHECKINS.map((c) => {
          const v = extra[c.key] ?? "";
          return (
            <div key={c.key as string}>
              <div className="text-sm">{c.label}</div>
              {c.hint && <div className="text-xs text-[var(--ink-soft)] mb-2">{c.hint}</div>}
              <div className="flex gap-2">
                {(["Yes","No","Not sure"] as const).map((opt) => {
                  const on = v === opt;
                  return (
                    <button key={opt} type="button"
                      onClick={() => setExtra({ ...extra, [c.key]: on ? "" : opt })}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm border ${on ? (opt === "Yes" ? "bg-[var(--alert)] text-white border-[var(--alert)]" : "bg-[var(--primary)] text-white border-[var(--primary)]") : "border-[var(--border)]"}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {hasRedFlag && (
          <div className="rounded-xl bg-[var(--alert-soft)] border border-[var(--alert)] p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-[var(--alert)] mb-1">
              <AlertTriangle size={14} /> Call the treating team now
            </div>
            Don't wait to see if it passes. Your answers are saved — add detail in the notes at the bottom.
          </div>
        )}
      </Card>

      {/* Day colour check-in */}
      <Card className="space-y-4 mb-4">
        <div>
          <h2 className="font-semibold">{isSupport ? `How is ${firstName} feeling overall?` : "How am I feeling overall?"}</h2>
          <p className="text-xs text-[var(--ink-soft)]">Tap the colour that best fits right now</p>
        </div>
        <div className="flex gap-2">
          {(["red", "yellow", "green"] as const).map((colour) => {
            const on = extra.dayColour === colour;
            const bg = colour === "red" ? "#8b0000" : colour === "yellow" ? "#d4a017" : "#2d7a4f";
            return (
              <button key={colour} type="button"
                onClick={() => setExtra({ ...extra, dayColour: on ? "" : colour })}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold border-2 transition ${on ? "text-white" : "border-[var(--border)] text-[var(--ink)]"}`}
                style={on ? { backgroundColor: bg, borderColor: bg } : undefined}
              >
                {colour === "red" ? "Red" : colour === "yellow" ? "Yellow" : "Green"}
              </button>
            );
          })}
        </div>
        {extra.dayColour && (
          <div className="rounded-xl p-3 text-sm" style={{
            backgroundColor: extra.dayColour === "red" ? "#fde8e8" : extra.dayColour === "yellow" ? "#fef9e7" : "#e8f5e9",
            borderLeft: `4px solid ${extra.dayColour === "red" ? "#8b0000" : extra.dayColour === "yellow" ? "#d4a017" : "#2d7a4f"}`,
          }}>
            <div className="font-semibold mb-1">{DAY_DEFINITIONS[extra.dayColour].label}</div>
            <div className="text-[var(--ink-soft)] text-xs leading-relaxed">{DAY_DEFINITIONS[extra.dayColour].description}</div>
          </div>
        )}
        {extra.dayColour && (
          <div className="rounded-xl border border-[var(--border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Suggested for today</div>
            <ul className="space-y-2 text-sm">
              {getSuggestedActivities(extra.dayColour).map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 mt-0.5" style={{ color: extra.dayColour === "red" ? "#8b0000" : extra.dayColour === "yellow" ? "#d4a017" : "#2d7a4f" }}>
                    {extra.dayColour === "green" ? "→" : extra.dayColour === "yellow" ? "·" : "~"}
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Quick numbers */}
      <Card className="space-y-4 mb-4">
        <h2 className="font-semibold">Quick numbers</h2>
        <Field label="Temperature" hint="°C">
          <TextInput type="number" inputMode="decimal" step="0.1" placeholder="e.g. 36.8" value={temperatureC} onChange={(e) => setTemp(e.target.value)} />
        </Field>
        <Field label="Sleep last night" hint="hours">
          <TextInput type="number" inputMode="decimal" step="0.5" placeholder="e.g. 7" value={sleepHours} onChange={(e) => setSleep(e.target.value)} />
        </Field>
        <Field label="Fluids today so far" hint="litres (approx)">
          <TextInput type="number" inputMode="decimal" step="0.1" placeholder="e.g. 1.5" value={extra.hydrationL ?? ""} onChange={(e) => setExtra({ ...extra, hydrationL: e.target.value })} />
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

      {/* How am I feeling — sliders */}
      <Card className="space-y-5 mb-4">
        <div>
          <h2 className="font-semibold">{isSupport ? `How is ${firstName} feeling?` : "How are you feeling?"}</h2>
          <p className="text-xs text-[var(--ink-soft)]">Drag the dot. 0 = none. 10 = worst.</p>
        </div>
        <Slider0to10 label="Fatigue" value={fatigue} onChange={setFatigue} />
        <Slider0to10 label="Pain" value={pain} onChange={setPain} />
        <Slider0to10 label="Nausea" value={nausea} onChange={setNausea} />
        <Slider0to10 label="Appetite (10 = normal)" value={appetite} onChange={setAppetite} />
        <Slider0to10 label="Breathlessness" value={breathlessness} onChange={setBreath} />
        <Slider0to10 label="Mood (10 = good)" value={mood} onChange={setMood} />
        <Slider0to10 label="Brain fog" value={brainFog} onChange={setBrainFog} />
      </Card>

      {/* Side effects */}
      <SideEffectPicker tags={tags} onTagsChange={setTags} />

      {/* Bowels quick */}
      <Card className="space-y-3 mb-4">
        <div>
          <h2 className="font-semibold">Bowels and bladder</h2>
          <p className="text-xs text-[var(--ink-soft)]">Anything different from normal?</p>
        </div>
        <div className="flex gap-2">
          {(["Yes","No","Not sure"] as const).map((opt) => {
            const on = (extra.bowels ?? "") === opt;
            return (
              <button key={opt} type="button"
                onClick={() => setExtra({ ...extra, bowels: on ? "" : opt })}
                className={`flex-1 rounded-lg px-2 py-2 text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {opt}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ED Visit */}
      <EDVisitSection extra={extra} setExtra={setExtra} />

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

function SideEffectPicker({ tags, onTagsChange }: {
  tags: string[];
  onTagsChange: (t: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const { firstName, isSupport } = usePatientName();

  const activeSideEffects = tags
    .filter((t) => t.startsWith("Side effect: "))
    .map((t) => t.replace("Side effect: ", ""));

  const filtered = q.trim()
    ? SIDE_EFFECTS.filter((s) => {
        const t = q.toLowerCase();
        return s.title.toLowerCase().includes(t)
          || s.keywords.some((k) => k.toLowerCase().includes(t))
          || s.description.toLowerCase().includes(t)
          || (s.symptoms ?? []).some((x) => x.toLowerCase().includes(t))
          || (s.whatToDo ?? []).some((x) => x.toLowerCase().includes(t))
          || (s.urgent ?? []).some((x) => x.toLowerCase().includes(t))
          || (s.subtitle ?? "").toLowerCase().includes(t);
      })
    : [];

  const addSideEffect = (s: SideEffect) => {
    const tag = `Side effect: ${s.title}`;
    if (!tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
    setQ("");
  };

  const removeSideEffect = (title: string) => {
    onTagsChange(tags.filter((t) => t !== `Side effect: ${title}`));
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
