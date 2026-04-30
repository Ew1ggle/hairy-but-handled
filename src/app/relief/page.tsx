"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { EntryTimestampField } from "@/components/EntryTimestampField";
import { useEntries, type ReliefEntry, type ReliefRating, type SymptomCard } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangle, CheckCircle2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

const HELPED_OPTIONS: ReliefRating[] = ["Yes", "A bit", "No"];

const HELPED_TONE: Record<ReliefRating, "ok" | "warn" | "alert"> = {
  Yes: "ok",
  "A bit": "warn",
  No: "alert",
};

export default function ReliefLogPage() {
  const { deleteEntry } = useSession();
  const entries = useEntries("relief");
  const symptoms = useEntries("symptom");
  const activeSymptoms = symptoms.filter((s) => s.stillActive !== false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReliefEntry | null>(null);

  const sorted = useMemo(
    () => entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );
  const todays = useMemo(() => sorted.filter((e) => isToday(parseISO(e.createdAt))), [sorted]);
  const earlier = useMemo(() => sorted.filter((e) => !isToday(parseISO(e.createdAt))), [sorted]);

  return (
    <AppShell>
      <PageTitle sub="What actually helped">Relief Log</PageTitle>

      <p className="text-sm text-[var(--ink-soft)] mb-3">
        Keep the wins, ditch the useless stuff. Each entry: what symptom, what was tried, did it help, how quickly, any downside.
      </p>

      {editing ? (
        <ReliefForm existing={editing} symptoms={activeSymptoms} onDone={() => setEditing(null)} />
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5"
        >
          <Plus size={18} /> Log a relief attempt
        </button>
      ) : (
        <ReliefForm symptoms={activeSymptoms} onDone={() => setOpen(false)} />
      )}

      {sorted.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">No relief attempts logged yet.</Card>
      )}

      {todays.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Today</h2>
          <div className="space-y-2 mb-4">
            {todays.map((e) => (
              <ReliefCard
                key={e.id}
                e={e}
                onEdit={() => { setEditing(e); setOpen(false); }}
                onDelete={() => deleteEntry(e.id)}
              />
            ))}
          </div>
        </>
      )}

      {earlier.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Earlier</h2>
          <div className="space-y-2">
            {earlier.map((e) => (
              <ReliefCard
                key={e.id}
                e={e}
                onEdit={() => { setEditing(e); setOpen(false); }}
                onDelete={() => deleteEntry(e.id)}
              />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function ReliefCard({ e, onEdit, onDelete }: { e: ReliefEntry; onEdit: () => void; onDelete: () => void }) {
  const tone = e.helped ? HELPED_TONE[e.helped] : "warn";
  const Icon = e.helped === "Yes" ? CheckCircle2 : e.helped === "No" ? X : Sparkles;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex-1 text-left active:opacity-70 transition">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={tone === "alert"
                ? { backgroundColor: "var(--alert-soft)", color: "var(--alert)" }
                : tone === "ok"
                  ? { backgroundColor: "var(--primary)", color: "white" }
                  : { backgroundColor: "var(--surface-soft)", color: "var(--ink)" }
              }
            >
              <Icon size={14} />
            </div>
            <div className="font-semibold">
              {e.triedWhat}
              {e.symptom && <span className="text-[var(--ink-soft)] font-normal"> · for {e.symptom}</span>}
            </div>
            {e.helped && (
              <span
                className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold"
                style={tone === "alert"
                  ? { backgroundColor: "var(--alert-soft)", color: "var(--alert)" }
                  : { backgroundColor: "var(--surface-soft)", color: "var(--ink)" }
                }
              >
                Helped: {e.helped}
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-1">
            {[
              e.time ?? format(parseISO(e.createdAt), "HH:mm"),
              format(parseISO(e.createdAt), "d MMM"),
              e.howQuickly && `worked in ${e.howQuickly}`,
            ].filter(Boolean).join(" · ")}
          </div>
          {e.downside && (
            <div className="text-sm mt-1">
              <span className="font-semibold">Downside: </span>{e.downside}
            </div>
          )}
          {e.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{e.notes}</div>}
        </button>
        <button onClick={onDelete} className="text-[var(--ink-soft)] p-1 shrink-0" aria-label="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </Card>
  );
}

function ReliefForm({ existing, symptoms, onDone }: { existing?: ReliefEntry; symptoms: SymptomCard[]; onDone: () => void }) {
  const { addEntry, updateEntry } = useSession();
  const [symptom, setSymptom] = useState<string>(existing?.symptom ?? "");
  const [triedWhat, setTriedWhat] = useState<string>(existing?.triedWhat ?? "");
  const [time, setTime] = useState<string>(existing?.time ?? "");
  const [helped, setHelped] = useState<ReliefRating | "">(existing?.helped ?? "");
  const [howQuickly, setHowQuickly] = useState<string>(existing?.howQuickly ?? "");
  const [downside, setDownside] = useState<string>(existing?.downside ?? "");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [linkedTripwire, setLinkedTripwire] = useState<boolean>(!!existing?.linkedTripwire);
  const [recordedAt, setRecordedAt] = useState<string>(
    existing?.createdAt ?? new Date().toISOString(),
  );

  const save = async () => {
    if (!symptom.trim() || !triedWhat.trim()) return;
    const payload: Partial<ReliefEntry> = {
      symptom: symptom.trim(),
      triedWhat: triedWhat.trim(),
      time: time || undefined,
      helped: helped || undefined,
      howQuickly: howQuickly || undefined,
      downside: downside || undefined,
      notes: notes || undefined,
      linkedTripwire: linkedTripwire || undefined,
    };
    if (existing) {
      await updateEntry(existing.id, { ...payload, createdAt: recordedAt } as Partial<ReliefEntry> & { createdAt?: string });
    } else {
      await addEntry({ kind: "relief", ...payload, createdAt: recordedAt } as unknown as Omit<ReliefEntry, "id" | "createdAt">);
    }
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      {symptoms.length > 0 && !existing && (
        <div>
          <div className="text-sm font-medium mb-2">Pick from active symptoms</div>
          <div className="flex flex-wrap gap-1.5">
            {symptoms.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSymptom(s.name)}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  symptom === s.name
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field label="Symptom"><TextInput value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="e.g. Headache, nausea" /></Field>

      <Field label="What was tried"><TextInput value={triedWhat} onChange={(e) => setTriedWhat(e.target.value)} placeholder="e.g. Paracetamol 1g, lying down, ginger tea" /></Field>

      <Field label="Time tried">
        <div className="flex gap-2">
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <button
            type="button"
            onClick={() => setTime(format(new Date(), "HH:mm"))}
            className="shrink-0 rounded-xl border border-[var(--border)] px-3 text-sm font-medium active:bg-[var(--surface-soft)]"
          >
            Use now
          </button>
        </div>
      </Field>

      <div>
        <div className="text-sm font-medium mb-2">Helped?</div>
        <div className="flex gap-2">
          {HELPED_OPTIONS.map((opt) => {
            const on = helped === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setHelped(on ? "" : opt)}
                className={`flex-1 rounded-lg px-2 py-2 text-sm border ${
                  on
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="How quickly it helped" hint="Skip if it didn't">
        <TextInput value={howQuickly} onChange={(e) => setHowQuickly(e.target.value)} placeholder="e.g. 20 min, an hour, almost straight away" />
      </Field>

      <Field label="Any downside" hint="e.g. drowsy, upset stomach, made it harder later">
        <TextInput value={downside} onChange={(e) => setDownside(e.target.value)} />
      </Field>

      <button
        type="button"
        onClick={() => setLinkedTripwire(!linkedTripwire)}
        className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 border text-sm text-left ${
          linkedTripwire
            ? "bg-[var(--alert-soft)] border-[var(--alert)] text-[var(--alert)]"
            : "border-[var(--border)]"
        }`}
      >
        <AlertTriangle size={16} className={linkedTripwire ? "text-[var(--alert)]" : "text-[var(--ink-soft)]"} />
        <span className="flex-1">
          <span className="font-semibold">Linked to Tripwire?</span>
          <span className="block text-xs opacity-80">{linkedTripwire ? "Will create a Tripwire flag on save" : "Tap if relief failed and the symptom escalated"}</span>
        </span>
      </button>

      <Field label="Notes"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

      <EntryTimestampField
        label="Time recorded"
        value={recordedAt}
        onChange={setRecordedAt}
      />

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!symptom.trim() || !triedWhat.trim()}>Save</Submit>
      </div>
    </Card>
  );
}
