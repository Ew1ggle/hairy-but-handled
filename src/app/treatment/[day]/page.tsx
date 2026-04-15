"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TagToggles, TextArea, TextInput } from "@/components/ui";
import { useEntries, type InfusionLog } from "@/lib/store";
import { useSession } from "@/lib/session";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CYCLE_DRUGS: Record<number, string> = {
  1: "Rituximab + Cladribine",
  2: "Cladribine", 3: "Cladribine", 4: "Cladribine", 5: "Cladribine",
  8: "Rituximab", 15: "Rituximab", 22: "Rituximab", 29: "Rituximab",
  36: "Rituximab", 43: "Rituximab", 50: "Rituximab",
};

const REACTION_SYMPTOMS = [
  "Rash / itching / flushing",
  "Throat tightness / wheeze / SOB",
  "Chest pain / arm discomfort",
  "Fever / chills / rigors",
  "Dizziness / faintness",
  "Headache / back pain / nausea",
];

const PREMEDS = [
  "Paracetamol",
  "Antihistamine (e.g. phenergan, loratadine)",
  "Steroid (e.g. hydrocortisone, dexamethasone)",
  "Anti-emetic (e.g. ondansetron)",
  "IV fluids",
];

const CANNULA_ISSUES = [
  "Pain",
  "Stinging",
  "Swelling",
  "Redness",
  "Warmth",
  "Hardness",
  "Leaking",
  "Bruising",
];

type InfusionExtra = {
  premedsGiven?: string[];
  cannulaSite?: string;
  cannulaIssues?: string[];
  nurse?: string;
};

export default function InfusionDay({ params }: { params: Promise<{ day: string }> }) {
  const { day } = use(params);
  const router = useRouter();
  const { addEntry, updateEntry } = useSession();
  const cycleDay = Number(day);
  const drugs = CYCLE_DRUGS[cycleDay] ?? "Rituximab";
  const all = useEntries("infusion");
  const existing = all.find((i) => i.cycleDay === cycleDay);

  const [plannedTime, setPlanned] = useState("");
  const [actualStart, setStart] = useState("");
  const [actualEnd, setEnd] = useState("");
  const [completed, setCompleted] = useState(false);
  const [reaction, setReaction] = useState(false);
  const [reactionSymptoms, setSymptoms] = useState<string[]>([]);
  const [reactionTimeAfterStart, setReactTime] = useState("");
  const [paused, setPaused] = useState(false);
  const [meds, setMeds] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [extra, setExtra] = useState<InfusionExtra>({ premedsGiven: [], cannulaIssues: [] });

  useEffect(() => {
    if (existing) {
      setPlanned(existing.plannedTime ?? "");
      setStart(existing.actualStart ?? "");
      setEnd(existing.actualEnd ?? "");
      setCompleted(!!existing.completed);
      setReaction(!!existing.reaction);
      setSymptoms(existing.reactionSymptoms ?? []);
      setReactTime(existing.reactionTimeAfterStart ?? "");
      setPaused(!!existing.paused);
      setMeds(existing.meds ?? "");
      setOutcome(existing.outcome ?? "");
      setNotes(existing.notes ?? "");
      const ex = existing as unknown as InfusionExtra;
      setExtra({
        premedsGiven: ex.premedsGiven ?? [],
        cannulaSite: ex.cannulaSite ?? "",
        cannulaIssues: ex.cannulaIssues ?? [],
        nurse: ex.nurse ?? "",
      });
    }
  }, [existing?.id]);

  const nowStart = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStart(local);
  };
  const nowEnd = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEnd(local);
  };

  const save = async () => {
    const payload = {
      kind: "infusion" as const,
      cycleDay, drugs,
      plannedTime, actualStart, actualEnd, completed,
      reaction, reactionSymptoms, reactionTimeAfterStart, paused,
      meds, outcome, notes, ...extra,
    };
    if (existing) await updateEntry(existing.id, payload);
    else await addEntry(payload as Omit<InfusionLog, "id" | "createdAt">);
    router.push("/treatment");
  };

  return (
    <AppShell>
      <PageTitle sub={drugs}>Day {cycleDay}</PageTitle>

      <Card className="space-y-4 mb-4">
        <h2 className="font-semibold">Timing</h2>
        <Field label="Planned time">
          <TextInput type="text" placeholder="e.g. 10:00 am" value={plannedTime} onChange={(e) => setPlanned(e.target.value)} />
        </Field>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-medium">Actual start</span>
            <button type="button" onClick={nowStart} className="text-xs text-[var(--primary)] font-medium">Use now</button>
          </div>
          <TextInput type="datetime-local" value={actualStart} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-medium">Actual end</span>
            <button type="button" onClick={nowEnd} className="text-xs text-[var(--primary)] font-medium">Use now</button>
          </div>
          <TextInput type="datetime-local" value={actualEnd} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <label className="flex items-center gap-3 pt-1">
          <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} className="w-5 h-5" />
          <span>Infusion completed</span>
        </label>
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Premeds given</h2>
        <p className="text-xs text-[var(--ink-soft)]">Tick everything they gave you before / during the infusion.</p>
        <TagToggles options={PREMEDS} value={extra.premedsGiven ?? []} onChange={(v) => setExtra({ ...extra, premedsGiven: v })} />
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Cannula / line site</h2>
        <Field label="Site used" hint="e.g. left forearm, back of right hand, port">
          <TextInput value={extra.cannulaSite ?? ""} onChange={(e) => setExtra({ ...extra, cannulaSite: e.target.value })} />
        </Field>
        <div>
          <div className="text-sm font-medium mb-2">Any issues at the site?</div>
          <TagToggles options={CANNULA_ISSUES} value={extra.cannulaIssues ?? []} onChange={(v) => setExtra({ ...extra, cannulaIssues: v })} />
        </div>
        <Field label="Nurse (optional)">
          <TextInput value={extra.nurse ?? ""} onChange={(e) => setExtra({ ...extra, nurse: e.target.value })} placeholder="Who's looking after you" />
        </Field>
      </Card>

      <Card className="mb-4 space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={reaction} onChange={(e) => setReaction(e.target.checked)} className="w-5 h-5" />
          <span className="font-medium">Any reaction during the infusion?</span>
        </label>

        {reaction && (
          <>
            <div>
              <div className="text-sm font-medium mb-2">Symptoms</div>
              <TagToggles options={REACTION_SYMPTOMS} value={reactionSymptoms} onChange={setSymptoms} />
            </div>
            <Field label="Time after start" hint="e.g. 20 min">
              <TextInput value={reactionTimeAfterStart} onChange={(e) => setReactTime(e.target.value)} />
            </Field>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} className="w-5 h-5" />
              <span>Infusion paused</span>
            </label>
            <Field label="Medications given for reaction">
              <TextInput value={meds} onChange={(e) => setMeds(e.target.value)} placeholder="e.g. hydrocortisone, antihistamine" />
            </Field>
            <Field label="Outcome">
              <TextArea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What happened next…" />
            </Field>
          </>
        )}
      </Card>

      <Card className="mb-6">
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering…" />
        </Field>
      </Card>

      <Submit onClick={save}>{existing ? "Update" : "Save"}</Submit>
    </AppShell>
  );
}
