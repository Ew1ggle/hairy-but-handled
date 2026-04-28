"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type HydrationDrink, type HydrationEntry } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangle, Coffee, Droplets, GlassWater, Minus, Plus, Trash2, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const DRINK_LABEL: Record<HydrationDrink, string> = {
  water: "Water",
  softdrink: "Soft drink",
  energy: "Energy",
  coffee: "Coffee",
  tea: "Tea",
  other: "Other",
};

const DRINK_ICON: Record<HydrationDrink, React.ComponentType<{ size?: number; className?: string }>> = {
  water: GlassWater,
  softdrink: GlassWater,
  energy: Zap,
  coffee: Coffee,
  tea: Coffee,
  other: GlassWater,
};

const DRINK_TONE: Record<HydrationDrink, string> = {
  water: "var(--blue)",
  softdrink: "var(--pink)",
  energy: "var(--alert)",
  coffee: "var(--ink-soft)",
  tea: "var(--accent)",
  other: "var(--ink-soft)",
};

const DRINK_ORDER: HydrationDrink[] = ["water", "softdrink", "energy", "coffee", "tea", "other"];

function totalGlasses(drinks?: Partial<Record<HydrationDrink, number>>): number {
  if (!drinks) return 0;
  return Object.values(drinks).reduce((a, n) => a + (n ?? 0), 0);
}

function summariseDrinks(d: HydrationEntry): string {
  const parts: string[] = [];
  for (const k of DRINK_ORDER) {
    const n = d.drinks?.[k];
    if (n && n > 0) {
      const label = k === "other" && d.otherDrinkLabel ? d.otherDrinkLabel : DRINK_LABEL[k];
      parts.push(`${n} ${label.toLowerCase()}`);
    }
  }
  return parts.join(" · ");
}

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
        Tap a drink to add a glass. Out-signals (urine colour, dry mouth, dizziness) now live on Signal Sweep so they sit alongside the rest of the day's readings.
      </p>

      <Link
        href="/signal-sweep"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] font-medium underline-offset-2 hover:underline mb-3"
      >
        <Droplets size={13} /> Log urine / dry mouth / dizziness on Signal Sweep
      </Link>

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
  const total = totalGlasses(e.drinks);
  const summary = summariseDrinks(e);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex-1 text-left active:opacity-70 transition">
          <div className="flex items-center gap-2 flex-wrap">
            <Droplets size={14} className="text-[var(--ink-soft)] shrink-0" />
            <div className="font-semibold">
              {total > 0 ? `${total} glass${total === 1 ? "" : "es"}` : (e.fluidsSinceLast || "Hydration check")}
            </div>
            {e.linkedTripwire && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 text-[10px] font-semibold">
                <AlertTriangle size={10} /> Watch
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-1">
            {[
              e.time ?? format(parseISO(e.createdAt), "HH:mm"),
              format(parseISO(e.createdAt), "d MMM"),
              summary,
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
  const [drinks, setDrinks] = useState<Partial<Record<HydrationDrink, number>>>(existing?.drinks ?? {});
  const [otherDrinkLabel, setOtherDrinkLabel] = useState<string>(existing?.otherDrinkLabel ?? "");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [linkedTripwire, setLinkedTripwire] = useState<boolean>(!!existing?.linkedTripwire);

  const inc = (k: HydrationDrink) => setDrinks((d) => ({ ...d, [k]: (d[k] ?? 0) + 1 }));
  const dec = (k: HydrationDrink) => setDrinks((d) => {
    const n = (d[k] ?? 0) - 1;
    if (n <= 0) {
      const { [k]: _, ...rest } = d;
      return rest;
    }
    return { ...d, [k]: n };
  });

  const total = totalGlasses(drinks);

  const save = async () => {
    const payload: Partial<HydrationEntry> = {
      time: time || undefined,
      drinks: total > 0 ? drinks : undefined,
      otherDrinkLabel: drinks.other && drinks.other > 0 ? (otherDrinkLabel || undefined) : undefined,
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

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-sm font-medium">Drinks</div>
          <div className="text-xs text-[var(--ink-soft)]">{total} total</div>
        </div>
        <div className="space-y-1.5">
          {DRINK_ORDER.map((k) => {
            const Icon = DRINK_ICON[k];
            const count = drinks[k] ?? 0;
            return (
              <div
                key={k}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                  count > 0 ? "border-[var(--primary)] bg-[var(--surface-soft)]" : "border-[var(--border)]"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: count > 0 ? DRINK_TONE[k] : "var(--surface-soft)", color: count > 0 ? "white" : "var(--ink-soft)" }}
                >
                  <Icon size={14} />
                </div>
                <div className="flex-1 font-medium text-sm">{DRINK_LABEL[k]}</div>
                <button
                  type="button"
                  onClick={() => dec(k)}
                  disabled={count === 0}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center disabled:opacity-30 active:bg-[var(--surface-soft)]"
                  aria-label={`Decrease ${DRINK_LABEL[k]}`}
                >
                  <Minus size={14} />
                </button>
                <div className="w-7 text-center font-bold tabular-nums">{count}</div>
                <button
                  type="button"
                  onClick={() => inc(k)}
                  className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center active:scale-95"
                  aria-label={`Add ${DRINK_LABEL[k]}`}
                >
                  <Plus size={14} />
                </button>
              </div>
            );
          })}
        </div>
        {drinks.other != null && drinks.other > 0 && (
          <div className="mt-2">
            <TextInput
              value={otherDrinkLabel}
              onChange={(e) => setOtherDrinkLabel(e.target.value)}
              placeholder="What's the 'other' drink? e.g. juice, electrolyte mix"
            />
          </div>
        )}
      </div>

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
          <span className="block text-xs opacity-80">{linkedTripwire ? "Flagged" : "Tap if intake dropped low enough to flag"}</span>
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
