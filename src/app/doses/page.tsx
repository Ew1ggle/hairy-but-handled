"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type DoseEntry, type DoseStatus, type DoseHelpedRating, type InfusionLog, type MedEntry, type Signal } from "@/lib/store";
import { SIGNAL_BY_ID } from "@/lib/signals";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangle, Droplet, Pill, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const STATUS_LABEL: Record<DoseStatus, string> = {
  taken: "Taken",
  late: "Late",
  missed: "Missed",
  "vomited-after": "Vomited after",
  withheld: "Withheld",
  refused: "Refused",
};

/** Status colour used for the small chip on each dose card. Taken/late
 *  read calm; missed/vomited/withheld read alert so a glance shows what
 *  needs follow-up. */
const STATUS_TONE: Record<DoseStatus, "calm" | "warn" | "alert"> = {
  taken: "calm",
  late: "warn",
  missed: "alert",
  "vomited-after": "alert",
  withheld: "warn",
  refused: "alert",
};

const HELPED_OPTIONS: DoseHelpedRating[] = ["Yes", "A bit", "No", "Not sure"];

/** A timeline row in Dose Trace — either a real DoseEntry or a virtual
 *  row derived from an InfusionLog so infusions show up alongside doses
 *  without duplicating data. Edits to virtual rows redirect to /treatment. */
type TimelineRow =
  | { type: "dose"; createdAt: string; data: DoseEntry }
  | { type: "infusion"; createdAt: string; data: InfusionLog };

export default function DoseTracePage() {
  const { deleteEntry } = useSession();
  const doses = useEntries("dose");
  const meds = useEntries("med");
  const infusions = useEntries("infusion");
  const signals = useEntries("signal");
  // Map signal id → signal so DoseCard can render 'for nausea' / 'for headache'
  // when a dose was given in response (linkedSignalId is set).
  const signalById = useMemo(() => {
    const m = new Map<string, Signal>();
    for (const s of signals) m.set(s.id, s);
    return m;
  }, [signals]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DoseEntry | null>(null);

  const timeline = useMemo<TimelineRow[]>(() => {
    const rows: TimelineRow[] = [
      ...doses.map((d) => ({ type: "dose" as const, createdAt: d.createdAt, data: d })),
      ...infusions.map((i) => ({ type: "infusion" as const, createdAt: i.createdAt, data: i })),
    ];
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [doses, infusions]);

  const todays = useMemo(() => timeline.filter((r) => isToday(parseISO(r.createdAt))), [timeline]);
  const earlier = useMemo(() => timeline.filter((r) => !isToday(parseISO(r.createdAt))), [timeline]);

  const activeMeds = meds.filter((m) => !m.stopped && m.status !== "stopped");

  return (
    <AppShell>
      <PageTitle sub="What landed, when, and what followed">Dose Trace</PageTitle>

      <p className="text-sm text-[var(--ink-soft)] mb-3">
        One entry per dose. Use this to track what was actually taken, what shifted afterwards, and where misses or vomits line up with a Tripwire.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        <Link
          href="/meds"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium active:bg-[var(--surface-soft)]"
        >
          <Pill size={13} /> Med Deck
        </Link>
        <Link
          href="/med-shift"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium active:bg-[var(--surface-soft)]"
        >
          <AlertTriangle size={13} /> Med Shift
        </Link>
      </div>

      {editing ? (
        <DoseForm existing={editing} meds={activeMeds} onDone={() => setEditing(null)} />
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5"
        >
          <Plus size={18} /> Log a dose
        </button>
      ) : (
        <DoseForm meds={activeMeds} onDone={() => setOpen(false)} />
      )}

      {timeline.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">No doses logged yet.</Card>
      )}

      {todays.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Today</h2>
          <div className="space-y-2 mb-4">
            {todays.map((r) => renderRow(r, signalById, setEditing, setOpen, deleteEntry))}
          </div>
        </>
      )}

      {earlier.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Earlier</h2>
          <div className="space-y-2">
            {earlier.map((r) => renderRow(r, signalById, setEditing, setOpen, deleteEntry))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function renderRow(
  r: TimelineRow,
  signalById: Map<string, Signal>,
  setEditing: (d: DoseEntry) => void,
  setOpen: (b: boolean) => void,
  deleteEntry: (id: string) => Promise<void>,
) {
  if (r.type === "dose") {
    return (
      <DoseCard
        key={r.data.id}
        d={r.data}
        linkedSignal={r.data.linkedSignalId ? signalById.get(r.data.linkedSignalId) : undefined}
        onEdit={() => { setEditing(r.data); setOpen(false); }}
        onDelete={() => deleteEntry(r.data.id)}
      />
    );
  }
  return <InfusionRow key={r.data.id} inf={r.data} />;
}

function InfusionRow({ inf }: { inf: InfusionLog }) {
  return (
    <Link href={`/treatment/${inf.cycleDay}`} className="block">
      <Card className="active:scale-[0.99] transition">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
            <Droplet size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-semibold">
                {inf.drugs || "Infusion"}
              </div>
              <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] px-2 py-0.5 font-semibold">
                Infusion · Day {inf.cycleDay}
              </span>
              {inf.completed && (
                <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--primary)] text-white px-2 py-0.5 font-semibold">
                  Completed
                </span>
              )}
              {inf.reaction && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 text-[10px] font-semibold">
                  <AlertTriangle size={10} /> Reaction
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--ink-soft)] mt-1">
              {[
                format(parseISO(inf.createdAt), "d MMM"),
                inf.actualStart && `start ${inf.actualStart}`,
                inf.actualEnd && `end ${inf.actualEnd}`,
                inf.outcome,
              ].filter(Boolean).join(" · ")}
            </div>
            {inf.notes && <div className="text-xs text-[var(--ink-soft)] mt-1 truncate">{inf.notes}</div>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function DoseCard({ d, linkedSignal, onEdit, onDelete }: { d: DoseEntry; linkedSignal?: Signal; onEdit: () => void; onDelete: () => void }) {
  const tone = d.status ? STATUS_TONE[d.status] : "calm";
  const signalLabel = linkedSignal
    ? (SIGNAL_BY_ID[linkedSignal.signalType]?.label ?? linkedSignal.signalType)
    : undefined;
  const toneClass = tone === "alert"
    ? "bg-[var(--alert-soft)] text-[var(--alert)]"
    : tone === "warn"
      ? "bg-[var(--surface-soft)] text-[var(--ink)]"
      : "bg-[var(--primary)] text-white";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex-1 text-left active:opacity-70 transition">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill size={14} className="text-[var(--ink-soft)] shrink-0" />
            <div className="font-semibold">
              {d.medName}
              {d.doseTaken && <span className="text-[var(--ink-soft)] font-normal"> · {d.doseTaken}</span>}
            </div>
            {d.status && (
              <span className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold ${toneClass}`}>
                {STATUS_LABEL[d.status]}
              </span>
            )}
            {d.linkedTripwire && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 text-[10px] font-semibold">
                <AlertTriangle size={10} /> Tripwire
              </span>
            )}
            {signalLabel && (
              <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--purple)] text-[var(--purple-ink)] px-2 py-0.5 font-semibold">
                For {signalLabel.toLowerCase()}
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-1">
            {[
              format(parseISO(d.createdAt), "d MMM"),
              d.timeDue && `due ${d.timeDue}`,
              d.timeTaken && `taken ${d.timeTaken}`,
              d.helped && `helped: ${d.helped}`,
            ].filter(Boolean).join(" · ")}
          </div>
          {d.whyPrn && <div className="text-sm mt-1"><span className="font-semibold">For: </span>{d.whyPrn}</div>}
          {d.reasonMissed && <div className="text-sm mt-1"><span className="font-semibold">Reason: </span>{d.reasonMissed}</div>}
          {d.whatChanged && <div className="text-sm mt-1"><span className="font-semibold">After: </span>{d.whatChanged}</div>}
          {d.reactionAfter && (
            <div className="text-sm mt-1 rounded-lg bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-1.5">
              <span className="font-semibold">Reaction: </span>{d.reactionAfter}
            </div>
          )}
          {d.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{d.notes}</div>}
        </button>
        <button onClick={onDelete} className="text-[var(--ink-soft)] p-1 shrink-0" aria-label="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </Card>
  );
}

function DoseForm({ existing, meds, onDone }: { existing?: DoseEntry; meds: MedEntry[]; onDone: () => void }) {
  const { addEntry, updateEntry } = useSession();
  const [medId, setMedId] = useState<string>(existing?.medId ?? "");
  const [medName, setMedName] = useState<string>(existing?.medName ?? "");
  const [doseTaken, setDoseTaken] = useState<string>(existing?.doseTaken ?? "");
  const [instructions, setInstructions] = useState<string>(existing?.instructions ?? "");
  const [timeDue, setTimeDue] = useState<string>(existing?.timeDue ?? "");
  const [timeTaken, setTimeTaken] = useState<string>(existing?.timeTaken ?? "");
  const [status, setStatus] = useState<DoseStatus | "">(existing?.status ?? "");
  const [whyPrn, setWhyPrn] = useState<string>(existing?.whyPrn ?? "");
  const [reasonMissed, setReasonMissed] = useState<string>(existing?.reasonMissed ?? "");
  const [helped, setHelped] = useState<DoseHelpedRating | "">(existing?.helped ?? "");
  const [whatChanged, setWhatChanged] = useState<string>(existing?.whatChanged ?? "");
  const [reactionAfter, setReactionAfter] = useState<string>(existing?.reactionAfter ?? "");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [linkedTripwire, setLinkedTripwire] = useState<boolean>(!!existing?.linkedTripwire);
  // Snapshot of source-med dose + instructions for change detection.
  const [sourceDose, setSourceDose] = useState<string>("");
  const [sourceInstructions, setSourceInstructions] = useState<string>("");

  const pickMed = (m: MedEntry) => {
    setMedId(m.id);
    setMedName(m.name);
    setDoseTaken(m.dose ?? "");
    setInstructions(m.instructions ?? "");
    setSourceDose(m.dose ?? "");
    setSourceInstructions(m.instructions ?? "");
  };

  /** Auto-note about dose / instructions drift from the source Med Deck
   *  row, prepended to the user's free-text notes on save. */
  const changeNote = (): string | undefined => {
    if (!medId) return undefined;
    const changes: string[] = [];
    if (sourceDose && doseTaken && doseTaken !== sourceDose) {
      changes.push(`Dose changed from "${sourceDose}" to "${doseTaken}"`);
    }
    if (sourceInstructions && instructions && instructions !== sourceInstructions) {
      changes.push(`Instructions changed from "${sourceInstructions}" to "${instructions}"`);
    }
    return changes.length ? changes.join("\n") : undefined;
  };

  const showPrnField = status === "taken" || status === "late";
  const showReasonField = status === "missed" || status === "withheld" || status === "refused" || status === "vomited-after";

  const save = async () => {
    if (!medName) return;
    // Prepend a change note to the user's notes when dose / instructions
    // differ from the picked Med Deck source.
    const note = changeNote();
    const finalNotes = [note, notes.trim()].filter(Boolean).join("\n\n") || undefined;
    const payload: Partial<DoseEntry> = {
      medId: medId || undefined,
      medName,
      doseTaken: doseTaken || undefined,
      instructions: instructions || undefined,
      timeDue: timeDue || undefined,
      timeTaken: timeTaken || undefined,
      status: status || undefined,
      whyPrn: whyPrn || undefined,
      reasonMissed: reasonMissed || undefined,
      helped: helped || undefined,
      whatChanged: whatChanged || undefined,
      reactionAfter: reactionAfter || undefined,
      notes: finalNotes,
      linkedTripwire: linkedTripwire || undefined,
    };
    if (existing) {
      await updateEntry(existing.id, payload);
    } else {
      await addEntry({ kind: "dose", ...payload } as unknown as Omit<DoseEntry, "id" | "createdAt">);
    }
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      {meds.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">Pick from Med Deck</div>
          <div className="flex flex-wrap gap-1.5">
            {meds.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pickMed(m)}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  medId === m.id
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {m.name}{m.dose && <span className="opacity-80"> · {m.dose}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Medicine">
          <TextInput value={medName} onChange={(e) => { setMedName(e.target.value); setMedId(""); }} placeholder="Name" />
        </Field>
        <Field label="Dose taken">
          <TextInput value={doseTaken} onChange={(e) => setDoseTaken(e.target.value)} placeholder="e.g. 1g" />
        </Field>
      </div>
      <Field label="Instructions" hint="Prescriber's directions as written">
        <TextInput
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. take 1 tablet 4 times daily"
        />
      </Field>
      {medId && ((sourceDose && doseTaken && doseTaken !== sourceDose) || (sourceInstructions && instructions && instructions !== sourceInstructions)) && (
        <div className="text-xs text-[var(--alert)] -mt-1">
          Differs from Med Deck — change will be auto-noted in the Notes below
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Time due">
          <div className="flex gap-1">
            <TextInput type="time" value={timeDue} onChange={(e) => setTimeDue(e.target.value)} />
            <button
              type="button"
              onClick={() => setTimeDue(format(new Date(), "HH:mm"))}
              className="shrink-0 rounded-xl border border-[var(--border)] px-2 text-xs font-medium active:bg-[var(--surface-soft)]"
            >
              Now
            </button>
          </div>
        </Field>
        <Field label="Time taken">
          <div className="flex gap-1">
            <TextInput type="time" value={timeTaken} onChange={(e) => setTimeTaken(e.target.value)} />
            <button
              type="button"
              onClick={() => setTimeTaken(format(new Date(), "HH:mm"))}
              className="shrink-0 rounded-xl border border-[var(--border)] px-2 text-xs font-medium active:bg-[var(--surface-soft)]"
            >
              Now
            </button>
          </div>
        </Field>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Status</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(STATUS_LABEL) as DoseStatus[]).map((s) => {
            const on = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(on ? "" : s)}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  on
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>

      {showPrnField && (
        <Field label="Why taken (PRN)" hint="What symptom or trigger prompted this dose">
          <TextInput value={whyPrn} onChange={(e) => setWhyPrn(e.target.value)} placeholder="e.g. nausea after lunch" />
        </Field>
      )}

      {showReasonField && (
        <Field label="Reason" hint="Why missed / vomited / withheld / refused">
          <TextInput value={reasonMissed} onChange={(e) => setReasonMissed(e.target.value)} placeholder="e.g. couldn't keep it down, asleep when due" />
        </Field>
      )}

      <div>
        <div className="text-sm font-medium mb-2">Did it help?</div>
        <div className="flex gap-2">
          {HELPED_OPTIONS.map((opt) => {
            const on = helped === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setHelped(on ? "" : opt)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs border ${
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

      <Field label="What changed after"><TextArea value={whatChanged} onChange={(e) => setWhatChanged(e.target.value)} placeholder="e.g. nausea settled in 30 min, drowsy for 2 hours" /></Field>
      <Field label="Any side effects / reaction after"><TextArea value={reactionAfter} onChange={(e) => setReactionAfter(e.target.value)} placeholder="e.g. rash on chest, racing heart" /></Field>

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
          <span className="block text-xs opacity-80">{linkedTripwire ? "Flagged — will surface on Tripwires + cycle view" : "Tap if this dose lined up with a Tripwire flag"}</span>
        </span>
      </button>

      <Field label="Notes"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!medName}>Save</Submit>
      </div>
    </Card>
  );
}
