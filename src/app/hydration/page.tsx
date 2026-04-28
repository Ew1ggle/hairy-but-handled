"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type HydrationEntry, type UrineAmount, type UrineColour } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangle, Droplets, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const COLOUR_LABEL: Record<UrineColour, string> = {
  clear: "Clear",
  pale: "Pale",
  medium: "Medium",
  dark: "Dark",
};

/** Visual swatch shown next to each urine-colour pick so the user can
 *  match what they're seeing rather than guess between similar words. */
const COLOUR_SWATCH: Record<UrineColour, string> = {
  clear: "#f5f5f0",
  pale: "#f5e7a3",
  medium: "#e0b94e",
  dark: "#8a5b1c",
};

const AMOUNT_LABEL: Record<UrineAmount, string> = {
  normal: "Normal",
  less: "Less than usual",
  "very-little": "Very little",
};

const COLOUR_TONE: Record<UrineColour, "ok" | "warn" | "alert"> = {
  clear: "ok",
  pale: "ok",
  medium: "warn",
  dark: "alert",
};

const AMOUNT_TONE: Record<UrineAmount, "ok" | "warn" | "alert"> = {
  normal: "ok",
  less: "warn",
  "very-little": "alert",
};

export default function HydrationLinePage() {
  const { deleteEntry } = useSession();
  const entries = useEntries("hydration");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HydrationEntry | null>(null);

  const sorted = useMemo(
    () => entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );
  const todays = useMemo(() => sorted.filter((e) => isToday(parseISO(e.createdAt))), [sorted]);
  const earlier = useMemo(() => sorted.filter((e) => !isToday(parseISO(e.createdAt))), [sorted]);

  return (
    <AppShell>
      <PageTitle sub="Track the drift before it hits">Hydration Line</PageTitle>

      <p className="text-sm text-[var(--ink-soft)] mb-3">
        Catch dehydration before it tips into a Tripwire — fluids in vs urine out, plus the early signs (dry mouth, dizziness, GI losses).
      </p>

      {editing ? (
        <HydrationForm existing={editing} onDone={() => setEditing(null)} />
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5"
        >
          <Plus size={18} /> Log a hydration check
        </button>
      ) : (
        <HydrationForm onDone={() => setOpen(false)} />
      )}

      {sorted.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">No hydration checks logged yet.</Card>
      )}

      {todays.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Today</h2>
          <div className="space-y-2 mb-4">
            {todays.map((e) => (
              <HydrationCard
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
              <HydrationCard
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

function HydrationCard({ e, onEdit, onDelete }: { e: HydrationEntry; onEdit: () => void; onDelete: () => void }) {
  const dehydrationFlag = (e.urineColour && COLOUR_TONE[e.urineColour] === "alert")
    || (e.urineAmount && AMOUNT_TONE[e.urineAmount] === "alert")
    || e.linkedTripwire;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex-1 text-left active:opacity-70 transition">
          <div className="flex items-center gap-2 flex-wrap">
            <Droplets size={14} className="text-[var(--ink-soft)] shrink-0" />
            <div className="font-semibold">
              {e.fluidsSinceLast || "Hydration check"}
            </div>
            {e.urineColour && (
              <span
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold"
                style={{
                  backgroundColor: COLOUR_TONE[e.urineColour] === "alert"
                    ? "var(--alert-soft)"
                    : "var(--surface-soft)",
                  color: COLOUR_TONE[e.urineColour] === "alert"
                    ? "var(--alert)"
                    : "var(--ink)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full border border-[var(--border)]"
                  style={{ backgroundColor: COLOUR_SWATCH[e.urineColour] }}
                />
                {COLOUR_LABEL[e.urineColour]}
              </span>
            )}
            {dehydrationFlag && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 text-[10px] font-semibold">
                <AlertTriangle size={10} /> Watch
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-1">
            {[
              e.time ?? format(parseISO(e.createdAt), "HH:mm"),
              format(parseISO(e.createdAt), "d MMM"),
              e.urineAmount && AMOUNT_LABEL[e.urineAmount].toLowerCase(),
              e.dryMouth ? "dry mouth" : undefined,
              e.dizziness ? "dizzy" : undefined,
              e.intakeStrugglingDueToGiSymptoms ? "GI losses" : undefined,
            ].filter(Boolean).join(" · ")}
          </div>
          {e.notes && <div className="text-sm text-[var(--ink-soft)] mt-1">{e.notes}</div>}
        </button>
        <button onClick={onDelete} className="text-[var(--ink-soft)] p-1 shrink-0" aria-label="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </Card>
  );
}

function HydrationForm({ existing, onDone }: { existing?: HydrationEntry; onDone: () => void }) {
  const { addEntry, updateEntry } = useSession();
  const [time, setTime] = useState<string>(existing?.time ?? "");
  const [fluidsSinceLast, setFluids] = useState<string>(existing?.fluidsSinceLast ?? "");
  const [urineColour, setUrineColour] = useState<UrineColour | "">(existing?.urineColour ?? "");
  const [urineAmount, setUrineAmount] = useState<UrineAmount | "">(existing?.urineAmount ?? "");
  const [dryMouth, setDryMouth] = useState<boolean | null>(existing?.dryMouth ?? null);
  const [dizziness, setDizziness] = useState<boolean | null>(existing?.dizziness ?? null);
  const [giStruggle, setGiStruggle] = useState<boolean | null>(existing?.intakeStrugglingDueToGiSymptoms ?? null);
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [linkedTripwire, setLinkedTripwire] = useState<boolean>(!!existing?.linkedTripwire);

  const save = async () => {
    const payload: Partial<HydrationEntry> = {
      time: time || undefined,
      fluidsSinceLast: fluidsSinceLast || undefined,
      urineColour: urineColour || undefined,
      urineAmount: urineAmount || undefined,
      dryMouth,
      dizziness,
      intakeStrugglingDueToGiSymptoms: giStruggle,
      notes: notes || undefined,
      linkedTripwire: linkedTripwire || undefined,
    };
    if (existing) {
      await updateEntry(existing.id, payload);
    } else {
      await addEntry({ kind: "hydration", ...payload } as unknown as Omit<HydrationEntry, "id" | "createdAt">);
    }
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      <Field label="Time">
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

      <Field label="Fluids since last check" hint="Free text — total or examples">
        <TextInput value={fluidsSinceLast} onChange={(e) => setFluids(e.target.value)} placeholder="e.g. 500 mL water + half a cup of tea" />
      </Field>

      <div>
        <div className="text-sm font-medium mb-2">Urine colour</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(COLOUR_LABEL) as UrineColour[]).map((c) => {
            const on = urineColour === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setUrineColour(on ? "" : c)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border ${
                  on
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-[var(--border)]"
                  style={{ backgroundColor: COLOUR_SWATCH[c] }}
                />
                {COLOUR_LABEL[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Urine amount</div>
        <div className="flex gap-2">
          {(Object.keys(AMOUNT_LABEL) as UrineAmount[]).map((a) => {
            const on = urineAmount === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setUrineAmount(on ? "" : a)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs border ${
                  on
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {AMOUNT_LABEL[a]}
              </button>
            );
          })}
        </div>
      </div>

      <YesNoToggle label="Dry mouth?" value={dryMouth} onChange={setDryMouth} />
      <YesNoToggle label="Dizziness?" value={dizziness} onChange={setDizziness} />
      <YesNoToggle
        label="Vomiting / diarrhoea making fluids hard?"
        value={giStruggle}
        onChange={setGiStruggle}
      />

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
          <span className="block text-xs opacity-80">{linkedTripwire ? "Flagged" : "Tap if this check lined up with a Tripwire flag"}</span>
        </span>
      </button>

      <Field label="Notes"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save}>Save</Submit>
      </div>
    </Card>
  );
}

function YesNoToggle({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <div className="text-sm font-medium mb-2">{label}</div>
      <div className="flex gap-2">
        {([
          [true, "Yes"],
          [false, "No"],
        ] as const).map(([val, lab]) => {
          const on = value === val;
          return (
            <button
              key={lab}
              type="button"
              onClick={() => onChange(on ? null : val)}
              className={`flex-1 rounded-lg px-2 py-2 text-sm border ${
                on
                  ? val
                    ? "bg-[var(--alert)] text-white border-[var(--alert)]"
                    : "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "border-[var(--border)]"
              }`}
            >
              {lab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
