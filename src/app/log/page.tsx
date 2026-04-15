"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Slider0to10, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type DailyLog } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO } from "date-fns";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Copy as CopyIcon } from "lucide-react";

export default function LogPageWrapper() {
  return (
    <Suspense fallback={<AppShell><div /></AppShell>}>
      <LogPage />
    </Suspense>
  );
}

type YNN = "Yes" | "No" | "Not sure" | "";

// Structured "what's happening today" — mirrors the profile's main-issues style so it's familiar
const CHECKINS: { key: keyof DailyLogExtra; label: string; hint?: string }[] = [
  { key: "fever", label: "Fever or chills", hint: "Temperature ≥ 38 °C, shivers, sweats" },
  { key: "breathless", label: "Breathlessness or chest pain", hint: "Any shortness of breath that's new or worse" },
  { key: "bleeding", label: "Bleeding or new bruising", hint: "Gums, nose, heavy period, black stools, unexplained bruises" },
  { key: "infusionSite", label: "Infusion site / cannula issue", hint: "Pain, swelling, redness, leaking" },
  { key: "nauseaVom", label: "Can't keep fluids down", hint: "Vomiting, severe nausea, no intake" },
  { key: "confusion", label: "Confusion or feeling very unwell", hint: "Faintness, severe weakness, 'becoming unwell'" },
];

type DailyLogExtra = {
  fever?: YNN; breathless?: YNN; bleeding?: YNN; infusionSite?: YNN; nauseaVom?: YNN; confusion?: YNN;
  bowels?: YNN;
  hydrationL?: string;
};

function LogPage() {
  const router = useRouter();
  const search = useSearchParams();
  const flagged = search.get("flagged") === "1";
  const { addEntry, updateEntry } = useSession();
  const entries = useEntries("daily");
  const existing = entries.find((d) => isToday(parseISO(d.createdAt)));
  const previous = entries.filter((d) => !isToday(parseISO(d.createdAt)))[0];

  const [temperatureC, setTemp] = useState<string>("");
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [nausea, setNausea] = useState<number | null>(null);
  const [appetite, setAppetite] = useState<number | null>(null);
  const [breathlessness, setBreath] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [brainFog, setBrainFog] = useState<number | null>(null);
  const [sleepHours, setSleep] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [extra, setExtra] = useState<DailyLogExtra>({});

  useEffect(() => {
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
      setTags(existing.tags ?? []);
      setNotes(existing.notes ?? "");
      const ex = (existing as unknown as DailyLogExtra);
      setExtra({
        fever: ex.fever, breathless: ex.breathless, bleeding: ex.bleeding,
        infusionSite: ex.infusionSite, nauseaVom: ex.nauseaVom, confusion: ex.confusion,
        bowels: ex.bowels, hydrationL: ex.hydrationL,
      });
    }
  }, [existing?.id]);

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

  const save = async () => {
    const payload = {
      kind: "daily" as const,
      temperatureC: temperatureC ? Number(temperatureC) : null,
      fatigue, pain, nausea, appetite, breathlessness, mood, brainFog,
      sleepHours: sleepHours ? Number(sleepHours) : null,
      tags, notes, ...extra,
    };
    if (existing) await updateEntry(existing.id, payload);
    else await addEntry(payload as Omit<DailyLog, "id" | "createdAt">);
    router.push("/");
  };

  const hasRedFlag = CHECKINS.some((c) => extra[c.key] === "Yes");

  return (
    <AppShell>
      <PageTitle sub={format(new Date(), "EEEE d MMMM, h:mm a")}>
        {existing ? "Update today" : "How are you today?"}
      </PageTitle>

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
          <CopyIcon size={14} /> Copy yesterday's values (then tweak)
        </button>
      )}

      {/* Fast red-flag check — do this first */}
      <Card className="space-y-4 mb-4">
        <div>
          <h2 className="font-semibold">Anything serious right now?</h2>
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
      </Card>

      {/* How am I feeling — sliders */}
      <Card className="space-y-5 mb-4">
        <div>
          <h2 className="font-semibold">How are you feeling?</h2>
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

      <Card className="mb-6">
        <Field label="Notes (optional)" hint="Anything else worth the team knowing">
          <TextArea
            placeholder="Anything — meds you took, someone visited, how the night was…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </Card>

      <Submit onClick={save}>{existing ? "Update log" : "Save log"}</Submit>
    </AppShell>
  );
}
