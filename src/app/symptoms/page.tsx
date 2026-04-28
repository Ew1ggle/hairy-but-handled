"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type ReliefEntry, type ReliefRating, type SymptomCard, type SymptomCardPattern, type SymptomCardSeverity } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, parseISO } from "date-fns";
import { AlertTriangle, ChevronRight, Plus, Sparkles, Stethoscope, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const COMMON_SYMPTOMS = [
  "Infection signs",
  "Fainting / dizziness",
  "Nausea / vomiting",
  "Diarrhoea",
  "Constipation",
  "Pain",
  "Bleeding / bruising",
  "Mouth / throat",
  "Skin / rash",
  "Breathing",
  "Fatigue / weakness",
  "Spleen / tummy fullness",
  "Lymph nodes / lumps",
];

const PATTERN_LABEL: Record<SymptomCardPattern, string> = {
  steady: "Steady",
  improving: "Improving",
  worsening: "Worsening",
  "comes-and-goes": "Comes and goes",
};

const SEVERITY_LABEL: Record<SymptomCardSeverity, string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

const PATTERN_TONE: Record<SymptomCardPattern, "ok" | "warn" | "alert"> = {
  steady: "warn",
  improving: "ok",
  worsening: "alert",
  "comes-and-goes": "warn",
};

const SEVERITY_TONE: Record<SymptomCardSeverity, "ok" | "warn" | "alert"> = {
  mild: "ok",
  moderate: "warn",
  severe: "alert",
};

export default function SymptomDeckPage() {
  const { deleteEntry } = useSession();
  const entries = useEntries("symptom");
  const reliefEntries = useEntries("relief");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SymptomCard | null>(null);
  const [seedName, setSeedName] = useState<string>("");

  // Deep-link from /trends — when ?addName=<label> is present, auto-open
  // the form with that name pre-filled so a recurring signal can be
  // promoted to a Symptom Deck card in one tap.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const name = params.get("addName");
    if (name) {
      setSeedName(name);
      setOpen(true);
    }
  }, []);

  const sorted = useMemo(
    () => entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );
  const active = useMemo(() => sorted.filter((s) => s.stillActive !== false), [sorted]);
  const past = useMemo(() => sorted.filter((s) => s.stillActive === false), [sorted]);

  // Relief attempts per symptom name for inline display on each card.
  const reliefBySymptom = useMemo(() => {
    const map = new Map<string, ReliefEntry[]>();
    for (const r of reliefEntries) {
      const key = r.symptom.toLowerCase().trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return map;
  }, [reliefEntries]);

  return (
    <AppShell>
      <PageTitle sub="The full symptom picture in one place">Symptom Deck</PageTitle>

      <p className="text-sm text-[var(--ink-soft)] mb-3">
        Master list of ongoing symptoms — first noticed, still active, what makes it better or worse, severity, pattern. Separate from the quick-tap Signal Sweep readings.
      </p>

      {editing ? (
        <SymptomForm existing={editing} onDone={() => setEditing(null)} />
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5"
        >
          <Plus size={18} /> Add a symptom card
        </button>
      ) : (
        <SymptomForm seedName={seedName} onDone={() => { setOpen(false); setSeedName(""); }} />
      )}

      {sorted.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">No symptom cards yet — add one when something shows up that matters.</Card>
      )}

      {active.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Active</h2>
          <div className="space-y-2 mb-4">
            {active.map((s) => (
              <SymptomCardView
                key={s.id}
                s={s}
                relief={reliefBySymptom.get(s.name.toLowerCase().trim()) ?? []}
                onEdit={() => { setEditing(s); setOpen(false); }}
                onDelete={() => deleteEntry(s.id)}
              />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Resolved</h2>
          <div className="space-y-2">
            {past.map((s) => (
              <SymptomCardView
                key={s.id}
                s={s}
                relief={reliefBySymptom.get(s.name.toLowerCase().trim()) ?? []}
                onEdit={() => { setEditing(s); setOpen(false); }}
                onDelete={() => deleteEntry(s.id)}
              />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function SymptomCardView({ s, relief, onEdit, onDelete }: { s: SymptomCard; relief: ReliefEntry[]; onEdit: () => void; onDelete: () => void }) {
  const [reliefFormOpen, setReliefFormOpen] = useState(false);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex-1 text-left active:opacity-70 transition">
          <div className="flex items-center gap-2 flex-wrap">
            <Stethoscope size={14} className="text-[var(--ink-soft)] shrink-0" />
            <div className="font-semibold">{s.name}</div>
            {s.severity && (
              <span
                className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold"
                style={SEVERITY_TONE[s.severity] === "alert"
                  ? { backgroundColor: "var(--alert-soft)", color: "var(--alert)" }
                  : { backgroundColor: "var(--surface-soft)", color: "var(--ink)" }
                }
              >
                {SEVERITY_LABEL[s.severity]}
              </span>
            )}
            {s.pattern && (
              <span
                className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold"
                style={PATTERN_TONE[s.pattern] === "alert"
                  ? { backgroundColor: "var(--alert-soft)", color: "var(--alert)" }
                  : { backgroundColor: "var(--surface-soft)", color: "var(--ink)" }
                }
              >
                {PATTERN_LABEL[s.pattern]}
              </span>
            )}
            {s.linkedTripwire && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 text-[10px] font-semibold">
                <AlertTriangle size={10} /> Tripwire
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-1">
            {[
              s.firstNoticed && `first noticed ${s.firstNoticed}`,
              `added ${format(parseISO(s.createdAt), "d MMM")}`,
            ].filter(Boolean).join(" · ")}
          </div>
          {s.triggers && (
            <div className="text-sm mt-1">
              <span className="font-semibold">Triggers: </span>{s.triggers}
            </div>
          )}
          {s.relievers && (
            <div className="text-sm mt-1">
              <span className="font-semibold">Helps: </span>{s.relievers}
            </div>
          )}
          {s.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{s.notes}</div>}
        </button>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <ChevronRight size={14} className="text-[var(--ink-soft)] mt-1" />
          <button onClick={onDelete} className="text-[var(--ink-soft)] p-1" aria-label="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Inline relief log — fold the standalone /relief page's flow into
           the symptom card so logging 'I tried X, helped' doesn't need a
           separate trip. Existing relief attempts for this symptom show
           as a compact list above the add-relief button. */}
      {(relief.length > 0 || reliefFormOpen) && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]">
          {relief.length > 0 && (
            <ul className="text-xs space-y-0.5 mb-2">
              {relief.slice(0, 4).map((r) => (
                <li key={r.id} className="flex gap-1.5 text-[var(--ink-soft)]">
                  <Sparkles size={11} className="shrink-0 mt-0.5 text-[var(--primary)]" />
                  <span>
                    <b className="text-[var(--ink)]">{r.triedWhat}</b>
                    {r.helped && <span className="text-[var(--ink-soft)]"> · helped: {r.helped}</span>}
                    {r.howQuickly && <span className="text-[var(--ink-soft)]"> · {r.howQuickly}</span>}
                  </span>
                </li>
              ))}
              {relief.length > 4 && (
                <li className="text-[11px]"><Link href="/relief" className="text-[var(--primary)] font-medium">+ {relief.length - 4} more on Relief Log →</Link></li>
              )}
            </ul>
          )}
          {reliefFormOpen ? (
            <InlineReliefForm
              symptomName={s.name}
              onDone={() => setReliefFormOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setReliefFormOpen(true)}
              className="w-full text-left text-xs font-medium text-[var(--primary)] flex items-center gap-1 px-1 py-1"
            >
              <Sparkles size={12} /> Log a relief attempt for this
            </button>
          )}
        </div>
      )}

      {relief.length === 0 && !reliefFormOpen && (
        <button
          type="button"
          onClick={() => setReliefFormOpen(true)}
          className="mt-2 w-full text-left text-xs font-medium text-[var(--primary)] flex items-center gap-1 pt-2 border-t border-[var(--border)]"
        >
          <Sparkles size={12} /> Log a relief attempt for this
        </button>
      )}
    </Card>
  );
}

const HELPED_OPTIONS: ReliefRating[] = ["Yes", "A bit", "No"];

function InlineReliefForm({ symptomName, onDone }: { symptomName: string; onDone: () => void }) {
  const { addEntry } = useSession();
  const [triedWhat, setTriedWhat] = useState("");
  const [helped, setHelped] = useState<ReliefRating | "">("");
  const [howQuickly, setHowQuickly] = useState("");
  const [downside, setDownside] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!triedWhat.trim()) return;
    setBusy(true);
    await addEntry({
      kind: "relief",
      symptom: symptomName,
      triedWhat: triedWhat.trim(),
      time: format(new Date(), "HH:mm"),
      helped: helped || undefined,
      howQuickly: howQuickly || undefined,
      downside: downside || undefined,
    } as unknown as Omit<ReliefEntry, "id" | "createdAt">);
    setBusy(false);
    onDone();
  };

  return (
    <div className="rounded-xl bg-[var(--surface-soft)] p-2.5 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
        Log relief — for {symptomName}
      </div>
      <TextInput
        value={triedWhat}
        onChange={(e) => setTriedWhat(e.target.value)}
        placeholder="What was tried (e.g. paracetamol 1g, lying flat)"
        autoFocus
      />
      <div className="flex gap-1.5">
        {HELPED_OPTIONS.map((opt) => {
          const on = helped === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setHelped(on ? "" : opt)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs border ${
                on
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <TextInput
          value={howQuickly}
          onChange={(e) => setHowQuickly(e.target.value)}
          placeholder="How quickly (5 min, 1 h)"
        />
        <TextInput
          value={downside}
          onChange={(e) => setDownside(e.target.value)}
          placeholder="Downside (drowsy, etc)"
        />
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy || !triedWhat.trim()}
          className="flex-1 rounded-lg bg-[var(--primary)] text-white px-2 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save relief"}
        </button>
      </div>
    </div>
  );
}

function SymptomForm({ existing, seedName, onDone }: { existing?: SymptomCard; seedName?: string; onDone: () => void }) {
  const { addEntry, updateEntry } = useSession();
  const [name, setName] = useState<string>(existing?.name ?? seedName ?? "");
  const [firstNoticed, setFirstNoticed] = useState<string>(existing?.firstNoticed ?? "");
  const [stillActive, setStillActive] = useState<boolean | null>(existing?.stillActive ?? true);
  const [pattern, setPattern] = useState<SymptomCardPattern | "">(existing?.pattern ?? "");
  const [severity, setSeverity] = useState<SymptomCardSeverity | "">(existing?.severity ?? "");
  const [triggers, setTriggers] = useState<string>(existing?.triggers ?? "");
  const [relievers, setRelievers] = useState<string>(existing?.relievers ?? "");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [linkedTripwire, setLinkedTripwire] = useState<boolean>(!!existing?.linkedTripwire);

  const save = async () => {
    if (!name.trim()) return;
    const payload: Partial<SymptomCard> = {
      name: name.trim(),
      firstNoticed: firstNoticed || undefined,
      stillActive,
      pattern: pattern || undefined,
      severity: severity || undefined,
      triggers: triggers || undefined,
      relievers: relievers || undefined,
      notes: notes || undefined,
      linkedTripwire: linkedTripwire || undefined,
    };
    if (existing) {
      await updateEntry(existing.id, payload);
    } else {
      await addEntry({ kind: "symptom", ...payload } as unknown as Omit<SymptomCard, "id" | "createdAt">);
    }
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      {!existing && (
        <div>
          <div className="text-sm font-medium mb-2">Common symptoms — tap to pre-fill</div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SYMPTOMS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setName(sym)}
                className="rounded-full px-3 py-1.5 text-xs border border-[var(--border)] active:bg-[var(--surface-soft)]"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field label="Symptom"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Persistent headache" /></Field>

      <Field label="First noticed" hint="Free text — date or 'about a week ago'">
        <TextInput value={firstNoticed} onChange={(e) => setFirstNoticed(e.target.value)} placeholder="e.g. last Tuesday, about a week ago" />
      </Field>

      <div>
        <div className="text-sm font-medium mb-2">Still active?</div>
        <div className="flex gap-2">
          {([
            [true, "Yes, ongoing"],
            [false, "No, resolved"],
          ] as const).map(([val, label]) => {
            const on = stillActive === val;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStillActive(on ? null : val)}
                className={`flex-1 rounded-lg px-2 py-2 text-sm border ${
                  on
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Severity</div>
        <div className="flex gap-2">
          {(Object.keys(SEVERITY_LABEL) as SymptomCardSeverity[]).map((s) => {
            const on = severity === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(on ? "" : s)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs border ${
                  on
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {SEVERITY_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Pattern</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PATTERN_LABEL) as SymptomCardPattern[]).map((p) => {
            const on = pattern === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPattern(on ? "" : p)}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  on
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {PATTERN_LABEL[p]}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="What seems to trigger it">
        <TextArea value={triggers} onChange={(e) => setTriggers(e.target.value)} placeholder="e.g. worse after meals, comes on with heat, started after starting drug X" />
      </Field>

      <Field label="What seems to help">
        <TextArea value={relievers} onChange={(e) => setRelievers(e.target.value)} placeholder="e.g. rest, paracetamol, lying flat, eating something" />
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
          <span className="block text-xs opacity-80">{linkedTripwire ? "Flagged" : "Tap if this symptom raised a Tripwire"}</span>
        </span>
      </button>

      <Field label="Notes"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!name.trim()}>Save</Submit>
      </div>
    </Card>
  );
}
