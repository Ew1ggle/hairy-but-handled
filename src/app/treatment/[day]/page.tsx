"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TagToggles, TextArea, TextInput } from "@/components/ui";
import { useEntries, type InfusionLog } from "@/lib/store";
import { useSession } from "@/lib/session";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer, ClipboardList, Plus, Trash2 } from "lucide-react";

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

type NurseLog = { id: string; issue?: string; addressed?: "Yes" | "No" | "Partly" | ""; response?: string };

type InfusionExtra = {
  premedsGiven?: string[];
  premedsOther?: string;
  cannulaSite?: string;
  cannulaIssues?: string[];
  cannulaIssuesOther?: string;
  nurse?: string;
  nurseLogs?: NurseLog[];
  reactionSymptomsOther?: string;
  pausedAt?: string;
  recommenced?: boolean;
  recommencedAt?: string;
};

export default function InfusionDay({ params }: { params: Promise<{ day: string }> }) {
  const { day } = use(params);
  const router = useRouter();
  const { addEntry, updateEntry, role } = useSession();
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
        premedsOther: ex.premedsOther ?? "",
        cannulaSite: ex.cannulaSite ?? "",
        cannulaIssues: ex.cannulaIssues ?? [],
        cannulaIssuesOther: ex.cannulaIssuesOther ?? "",
        nurse: ex.nurse ?? "",
        nurseLogs: ex.nurseLogs ?? [],
        reactionSymptomsOther: ex.reactionSymptomsOther ?? "",
        pausedAt: ex.pausedAt ?? "",
        recommenced: !!ex.recommenced,
        recommencedAt: ex.recommencedAt ?? "",
      });
    }
  }, [existing?.id]);

  const uid = () => Math.random().toString(36).slice(2, 10);
  const addNurseLog = () => setExtra({ ...extra, nurseLogs: [...(extra.nurseLogs ?? []), { id: uid() }] });
  const updNurseLog = (id: string, patch: Partial<NurseLog>) =>
    setExtra({ ...extra, nurseLogs: (extra.nurseLogs ?? []).map((n) => n.id === id ? { ...n, ...patch } : n) });
  const delNurseLog = (id: string) =>
    setExtra({ ...extra, nurseLogs: (extra.nurseLogs ?? []).filter((n) => n.id !== id) });

  const nowLocal = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const nowStart = () => setStart(nowLocal());
  const nowEnd = () => setEnd(nowLocal());

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

      {role === "support" && (
        <Card className="mb-4 border-[var(--accent)] bg-[var(--surface-soft)]">
          <div className="flex items-start gap-2.5">
            <ClipboardList size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold mb-1">Reminder for the support person</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--ink)]">
                <li>Tap <b>Use now</b> as soon as the infusion starts, and again when it ends.</li>
                <li>If any reaction begins, open your phone's <b>Clock → Timer</b>, start it, and note how long after the infusion started it happened.</li>
                <li>Record symptoms in real time. Note the exact times the infusion is paused + recommenced.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

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
        <Field label="Other (please specify)">
          <TextArea rows={2} value={extra.premedsOther ?? ""} onChange={(e) => setExtra({ ...extra, premedsOther: e.target.value })} placeholder="Anything else given that isn't on the list…" />
        </Field>
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
        <Field label="Other issue (please specify)">
          <TextArea rows={2} value={extra.cannulaIssuesOther ?? ""} onChange={(e) => setExtra({ ...extra, cannulaIssuesOther: e.target.value })} placeholder="Anything else not on the list…" />
        </Field>
        <Field label="Nurse (optional)">
          <TextInput value={extra.nurse ?? ""} onChange={(e) => setExtra({ ...extra, nurse: e.target.value })} placeholder="Who's looking after you" />
        </Field>
      </Card>

      <Card className="space-y-3 mb-4">
        <div>
          <h2 className="font-semibold">Issues raised with the nurse</h2>
          <p className="text-xs text-[var(--ink-soft)]">Log what was raised, whether it was addressed, and what they said.</p>
        </div>
        {(extra.nurseLogs ?? []).map((n, idx) => (
          <div key={n.id} className="rounded-xl border border-[var(--border)] p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-[var(--ink-soft)]">Item {idx + 1}</div>
              <button onClick={() => delNurseLog(n.id)} aria-label="Remove" className="text-[var(--ink-soft)] p-1"><Trash2 size={14} /></button>
            </div>
            <Field label="Issue raised">
              <TextArea rows={2} value={n.issue ?? ""} onChange={(e) => updNurseLog(n.id, { issue: e.target.value })} placeholder="What you asked / flagged" />
            </Field>
            <div className="mt-2">
              <div className="text-sm font-medium mb-1.5">Was it addressed?</div>
              <div className="flex gap-2">
                {(["Yes","No","Partly"] as const).map((opt) => {
                  const on = n.addressed === opt;
                  return (
                    <button key={opt} type="button"
                      onClick={() => updNurseLog(n.id, { addressed: on ? "" : opt })}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2">
              <Field label="What was said / done">
                <TextArea rows={2} value={n.response ?? ""} onChange={(e) => updNurseLog(n.id, { response: e.target.value })} placeholder="Their answer or action" />
              </Field>
            </div>
          </div>
        ))}
        <button onClick={addNurseLog} className="w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-sm inline-flex items-center justify-center gap-2">
          <Plus size={14} /> Add item
        </button>
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
            <Field label="Other symptoms (please specify)">
              <TextArea rows={2} value={extra.reactionSymptomsOther ?? ""} onChange={(e) => setExtra({ ...extra, reactionSymptomsOther: e.target.value })} placeholder="Any other symptoms not listed…" />
            </Field>
            <Field label="Time after start" hint="e.g. 20 min">
              <TextInput value={reactionTimeAfterStart} onChange={(e) => setReactTime(e.target.value)} />
            </Field>

            <div className="border-t border-[var(--border)] pt-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} className="w-5 h-5" />
                <span className="font-medium">Infusion paused</span>
              </label>
              {paused && (
                <div className="mt-2">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-medium">Paused at</span>
                    <button type="button" onClick={() => setExtra({ ...extra, pausedAt: nowLocal() })} className="text-xs text-[var(--primary)] font-medium">
                      <Timer size={12} className="inline mr-1" />Use now
                    </button>
                  </div>
                  <TextInput type="datetime-local" value={extra.pausedAt ?? ""} onChange={(e) => setExtra({ ...extra, pausedAt: e.target.value })} />
                </div>
              )}
            </div>

            <Field label="Medications given for reaction">
              <TextInput value={meds} onChange={(e) => setMeds(e.target.value)} placeholder="e.g. hydrocortisone, antihistamine" />
            </Field>

            <div className="border-t border-[var(--border)] pt-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={!!extra.recommenced} onChange={(e) => setExtra({ ...extra, recommenced: e.target.checked })} className="w-5 h-5" />
                <span className="font-medium">Infusion recommenced</span>
              </label>
              {extra.recommenced && (
                <div className="mt-2">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-medium">Recommenced at</span>
                    <button type="button" onClick={() => setExtra({ ...extra, recommencedAt: nowLocal() })} className="text-xs text-[var(--primary)] font-medium">
                      <Timer size={12} className="inline mr-1" />Use now
                    </button>
                  </div>
                  <TextInput type="datetime-local" value={extra.recommencedAt ?? ""} onChange={(e) => setExtra({ ...extra, recommencedAt: e.target.value })} />
                </div>
              )}
            </div>

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
