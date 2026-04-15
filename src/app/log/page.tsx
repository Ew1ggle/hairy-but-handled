"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Slider0to10, Submit, TagToggles, TextArea, TextInput } from "@/components/ui";
import { useEntries, type DailyLog } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO } from "date-fns";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LogPageWrapper() {
  return (
    <Suspense fallback={<AppShell><div /></AppShell>}>
      <LogPage />
    </Suspense>
  );
}

const NEW_TAGS = [
  "Fever / chills",
  "New bruising",
  "Heavy bleeding",
  "Mouth ulcers",
  "Rash / itching",
  "Breathless",
  "Chest pain",
  "Confusion",
  "Vomiting",
  "Diarrhoea",
  "Can't keep fluids down",
  "Infusion site pain",
];

function LogPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { addEntry, updateEntry } = useSession();
  const flagged = search.get("flagged") === "1";
  const entries = useEntries("daily");
  const existing = entries.find((d) => isToday(parseISO(d.createdAt)));

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
    }
  }, [existing?.id]);

  const save = async () => {
    const payload = {
      kind: "daily" as const,
      temperatureC: temperatureC ? Number(temperatureC) : null,
      fatigue, pain, nausea, appetite, breathlessness, mood, brainFog,
      sleepHours: sleepHours ? Number(sleepHours) : null,
      tags, notes,
    };
    if (existing) await updateEntry(existing.id, payload);
    else await addEntry(payload as Omit<DailyLog, "id" | "createdAt">);
    router.push("/");
  };

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

      <Card className="space-y-4 mb-4">
        <Field label="Temperature" hint="°C">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="e.g. 36.8"
            value={temperatureC}
            onChange={(e) => setTemp(e.target.value)}
          />
        </Field>
        <Field label="Sleep" hint="hours">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.5"
            placeholder="e.g. 7"
            value={sleepHours}
            onChange={(e) => setSleep(e.target.value)}
          />
        </Field>
      </Card>

      <Card className="space-y-5 mb-4">
        <Slider0to10 label="Fatigue" value={fatigue} onChange={setFatigue} />
        <Slider0to10 label="Pain" value={pain} onChange={setPain} />
        <Slider0to10 label="Nausea" value={nausea} onChange={setNausea} />
        <Slider0to10 label="Appetite (10 = normal)" value={appetite} onChange={setAppetite} />
        <Slider0to10 label="Breathlessness" value={breathlessness} onChange={setBreath} />
        <Slider0to10 label="Mood (10 = good)" value={mood} onChange={setMood} />
        <Slider0to10 label="Brain fog" value={brainFog} onChange={setBrainFog} />
      </Card>

      <Card className="space-y-3 mb-4">
        <div>
          <div className="text-sm font-medium mb-2">Anything new or worse?</div>
          <TagToggles options={NEW_TAGS} value={tags} onChange={setTags} />
        </div>
      </Card>

      <Card className="mb-6">
        <Field label="Notes (optional)">
          <TextArea
            placeholder="Anything else worth the team knowing…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </Card>

      <Submit onClick={save}>{existing ? "Update log" : "Save log"}</Submit>
    </AppShell>
  );
}
