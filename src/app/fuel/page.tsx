"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Slider0to10, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type FuelAmount, type FuelEntry } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangle, Plus, Trash2, Utensils } from "lucide-react";
import { useMemo, useState } from "react";

const AMOUNT_LABEL: Record<FuelAmount, string> = {
  none: "None",
  "few-bites": "A few bites",
  half: "Half portion",
  most: "Most",
  full: "Full meal",
};

export default function FuelCheckPage() {
  const { deleteEntry } = useSession();
  const entries = useEntries("fuel");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FuelEntry | null>(null);

  const sorted = useMemo(
    () => entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );
  const todays = useMemo(() => sorted.filter((e) => isToday(parseISO(e.createdAt))), [sorted]);
  const earlier = useMemo(() => sorted.filter((e) => !isToday(parseISO(e.createdAt))), [sorted]);

  return (
    <AppShell>
      <PageTitle sub="What went in, what held, what helped">Fuel Check</PageTitle>

      <p className="text-sm text-[var(--ink-soft)] mb-3">
        One entry per food / fluid event, with nausea before and after so the team can see what's actually landing.
      </p>

      {editing ? (
        <FuelForm existing={editing} onDone={() => setEditing(null)} />
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5"
        >
          <Plus size={18} /> Log a fuel check
        </button>
      ) : (
        <FuelForm onDone={() => setOpen(false)} />
      )}

      {sorted.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">No fuel checks logged yet.</Card>
      )}

      {todays.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Today</h2>
          <div className="space-y-2 mb-4">
            {todays.map((e) => (
              <FuelCard
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
              <FuelCard
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

function FuelCard({ e, onEdit, onDelete }: { e: FuelEntry; onEdit: () => void; onDelete: () => void }) {
  const stayedDownTone = e.stayedDown === false ? "alert" : e.stayedDown === true ? "ok" : "neutral";
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex-1 text-left active:opacity-70 transition">
          <div className="flex items-center gap-2 flex-wrap">
            <Utensils size={14} className="text-[var(--ink-soft)] shrink-0" />
            <div className="font-semibold">
              {e.food || (e.fluids ? "Fluids" : "Fuel check")}
              {e.amount && <span className="text-[var(--ink-soft)] font-normal"> · {AMOUNT_LABEL[e.amount]}</span>}
            </div>
            {stayedDownTone === "alert" && (
              <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 font-semibold">
                Did not stay down
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-1">
            {[
              e.time ?? format(parseISO(e.createdAt), "HH:mm"),
              format(parseISO(e.createdAt), "d MMM"),
              e.fluids,
              e.nauseaBefore != null ? `nausea before ${e.nauseaBefore}/10` : undefined,
              e.nauseaAfter != null ? `nausea after ${e.nauseaAfter}/10` : undefined,
            ].filter(Boolean).join(" · ")}
          </div>
          {e.vomitedAfter && (
            <div className="text-sm mt-1 rounded-lg bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-1.5">
              <span className="font-semibold">Vomited after: </span>{e.vomitedAfter}
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

function FuelForm({ existing, onDone }: { existing?: FuelEntry; onDone: () => void }) {
  const { addEntry, updateEntry } = useSession();
  const [time, setTime] = useState<string>(existing?.time ?? "");
  const [food, setFood] = useState<string>(existing?.food ?? "");
  const [amount, setAmount] = useState<FuelAmount | "">(existing?.amount ?? "");
  const [fluids, setFluids] = useState<string>(existing?.fluids ?? "");
  const [nauseaBefore, setNauseaBefore] = useState<number | null>(existing?.nauseaBefore ?? null);
  const [nauseaAfter, setNauseaAfter] = useState<number | null>(existing?.nauseaAfter ?? null);
  const [stayedDown, setStayedDown] = useState<boolean | null>(existing?.stayedDown ?? null);
  const [vomitedAfter, setVomitedAfter] = useState<string>(existing?.vomitedAfter ?? "");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [linkedTripwire, setLinkedTripwire] = useState<boolean>(!!existing?.linkedTripwire);

  const save = async () => {
    const payload: Partial<FuelEntry> = {
      time: time || undefined,
      food: food || undefined,
      amount: amount || undefined,
      fluids: fluids || undefined,
      nauseaBefore,
      nauseaAfter,
      stayedDown,
      vomitedAfter: vomitedAfter || undefined,
      notes: notes || undefined,
      linkedTripwire: linkedTripwire || undefined,
    };
    if (existing) {
      await updateEntry(existing.id, payload);
    } else {
      await addEntry({ kind: "fuel", ...payload } as unknown as Omit<FuelEntry, "id" | "createdAt">);
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

      <Field label="Food taken">
        <TextInput value={food} onChange={(e) => setFood(e.target.value)} placeholder="e.g. dry toast, half a banana" />
      </Field>

      <div>
        <div className="text-sm font-medium mb-2">How much</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(AMOUNT_LABEL) as FuelAmount[]).map((opt) => {
            const on = amount === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setAmount(on ? "" : opt)}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  on
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {AMOUNT_LABEL[opt]}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Fluids taken">
        <TextInput value={fluids} onChange={(e) => setFluids(e.target.value)} placeholder="e.g. 200 mL water, half a tea, sips" />
      </Field>

      <div>
        <div className="text-sm font-medium mb-1">Nausea before (10 = worst)</div>
        <Slider0to10 label="" value={nauseaBefore} onChange={setNauseaBefore} />
      </div>

      <div>
        <div className="text-sm font-medium mb-1">Nausea after (10 = worst)</div>
        <Slider0to10 label="" value={nauseaAfter} onChange={setNauseaAfter} />
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Did it stay down?</div>
        <div className="flex gap-2">
          {([
            [true, "Yes"],
            [false, "No"],
          ] as const).map(([val, label]) => {
            const on = stayedDown === val;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStayedDown(on ? null : val)}
                className={`flex-1 rounded-lg px-2 py-2 text-sm border ${
                  on
                    ? val
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "bg-[var(--alert)] text-white border-[var(--alert)]"
                    : "border-[var(--border)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {stayedDown === false && (
        <Field label="Vomited after — what came up, how soon">
          <TextInput value={vomitedAfter} onChange={(e) => setVomitedAfter(e.target.value)} placeholder="e.g. 20 min after, mostly fluid" />
        </Field>
      )}

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
          <span className="block text-xs opacity-80">{linkedTripwire ? "Will create a Tripwire flag on save" : "Tap if intake is failing badly enough to flag"}</span>
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
