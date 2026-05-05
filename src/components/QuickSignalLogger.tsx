"use client";
import { Activity, Stethoscope } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/session";
import { type FlagEvent, type Signal } from "@/lib/store";
import { SIGNAL_BY_ID, evaluateRedFlag } from "@/lib/signals";
import { format } from "date-fns";
import Link from "next/link";

/** The vitals the user logs over and over during a stay. Each must be
 *  a kind="number" signal in src/lib/signals.ts so we can render a
 *  single number input. Anything more complex (pain location, sleep,
 *  exposure, multi-pick side effects) stays on the full /signal-sweep
 *  page reachable via the Open Signal Sweep link below. */
const QUICK_SIGNAL_IDS = ["temp", "spo2", "pulse", "bloodSugar"] as const;

/** Inline signal logger embeds on /emergency, /admissions, and on
 *  Daily Trace's past-day view for retrospective logging. Tap a chip,
 *  type the value, save — the signal lands at the right time stamp
 *  with auto-flag handled the same way the full SignalSheet does.
 *  Less-common signals (mood, sleep, exposure, multi-pick side
 *  effects) fall back to the Open Signal Sweep link. */
export function QuickSignalLogger({
  edVisitId,
  returnTo,
  onLaunchUnsaved,
  forDate,
}: {
  /** Admission row id signals get attached to. When unset (Daily
   *  Trace usage) signals stand alone with no admission link. */
  edVisitId?: string | null;
  /** Path Signal Sweep should return to after a full-flow visit. */
  returnTo: string;
  /** When edVisitId is null and the user taps a quick chip, called
   *  to stub-create the admission row and return its id. Optional —
   *  Daily Trace doesn't need an admission link, so signals just
   *  save without one. */
  onLaunchUnsaved?: () => Promise<string | null>;
  /** Anchor saved signals to a specific date (yyyy-MM-dd) instead
   *  of "now" — used by Daily Trace's past-day view so the carer
   *  can retrospectively log readings they forgot to capture on
   *  the day. The saved signal's createdAt becomes [date]T12:00.
   *  Today's date or undefined → live "now" timestamp. */
  forDate?: string;
}) {
  const { addEntry } = useSession();
  const [openId, setOpenId] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");
  const [justLogged, setJustLogged] = useState<{ id: string; label: string; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpenId(null);
    setValue("");
  };

  const open = (id: string) => {
    setOpenId(id);
    setValue("");
    setJustLogged(null);
  };

  const handleSave = async () => {
    if (!openId) return;
    const def = SIGNAL_BY_ID[openId];
    if (!def || def.input.kind !== "number") return;
    const numeric = value.trim() ? Number(value) : null;
    if (numeric == null || !Number.isFinite(numeric)) return;
    setSaving(true);
    let admissionId: string | null = edVisitId ?? null;
    if (!admissionId && onLaunchUnsaved) {
      admissionId = await onLaunchUnsaved();
    }
    const reading: Partial<Signal> = {
      value: numeric,
      unit: def.input.unit,
    };
    const flagMsg = evaluateRedFlag(def, reading);
    // Backdate the createdAt when forDate is set and isn't today —
    // anchor to noon so a retrospective vital lands on the right day
    // in the daily timeline regardless of when the carer actually
    // typed it in. Today's logs use the live "now" stamp.
    const todayIso = format(new Date(), "yyyy-MM-dd");
    const backdate = forDate && forDate !== todayIso
      ? new Date(`${forDate}T12:00:00`).toISOString()
      : undefined;
    const created = await addEntry({
      kind: "signal",
      signalType: def.id,
      ...reading,
      autoFlag: !!flagMsg,
      ...(admissionId ? { loggedDuringEd: true, edVisitId: admissionId } : {}),
      ...(backdate ? { createdAt: backdate } : {}),
    } as Omit<Signal, "id" | "createdAt">);
    if (flagMsg) {
      await addEntry({
        kind: "flag",
        triggerLabel: `${def.label}: ${flagMsg}`,
      } as Omit<FlagEvent, "id" | "createdAt">);
    }
    if (created) {
      setJustLogged({
        id: created.id,
        label: def.label,
        value: `${numeric}${def.input.unit ? ` ${def.input.unit}` : ""}`,
      });
    }
    setSaving(false);
    close();
  };

  return (
    <div className="rounded-2xl border-2 border-[var(--primary)] bg-[var(--surface)] p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={18} className="text-[var(--primary)]" />
        <div className="text-sm font-bold text-[var(--primary)] uppercase tracking-wide flex-1">
          Quick log
        </div>
        <Link
          href={(() => {
            const params = new URLSearchParams();
            if (edVisitId) params.set("edVisitId", edVisitId);
            if (returnTo) params.set("returnTo", returnTo);
            const todayIso = format(new Date(), "yyyy-MM-dd");
            if (forDate && forDate !== todayIso) params.set("date", forDate);
            const qs = params.toString();
            return `/signal-sweep${qs ? `?${qs}` : ""}`;
          })()}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]"
        >
          <Stethoscope size={12} /> Full Signal Sweep
        </Link>
      </div>
      <p className="text-[11px] text-[var(--ink-soft)]">
        {forDate && forDate !== format(new Date(), "yyyy-MM-dd")
          ? `Backfill a vital you forgot on ${format(new Date(`${forDate}T00:00:00`), "EEE d MMM")}. Saves anchored to that day.`
          : "Tap a vital to log without leaving this page. Red-flag threshold fires a Tripwire automatically."}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_SIGNAL_IDS.map((id) => {
          const def = SIGNAL_BY_ID[id];
          if (!def) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => open(id)}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold active:scale-95 hover:bg-[var(--surface-soft)]"
            >
              + {def.label}
            </button>
          );
        })}
      </div>
      {justLogged && (
        <div className="rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)] px-3 py-1.5 text-xs">
          <span className="font-semibold text-[var(--primary)]">Logged ✓</span>
          <span className="ml-1 text-[var(--ink)]">
            {justLogged.label} {justLogged.value}
          </span>
        </div>
      )}
      {openId && (() => {
        const def = SIGNAL_BY_ID[openId];
        if (!def || def.input.kind !== "number") return null;
        return (
          <div className="rounded-xl border border-[var(--primary)] bg-[var(--surface-soft)] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{def.label}</div>
              <button
                type="button"
                onClick={close}
                className="text-xs text-[var(--ink-soft)]"
              >
                Cancel
              </button>
            </div>
            {def.hint && (
              <div className="text-[11px] text-[var(--ink-soft)]">{def.hint}</div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step={def.input.step}
                min={def.input.min}
                max={def.input.max}
                placeholder={def.input.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base font-medium focus:outline-none focus:border-[var(--primary)]"
              />
              {def.input.unit && (
                <span className="text-sm text-[var(--ink-soft)] font-medium">
                  {def.input.unit}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={saving || !value.trim()}
              onClick={handleSave}
              className="w-full rounded-lg bg-[var(--primary)] text-white font-semibold py-2.5 text-sm disabled:opacity-50 active:scale-[0.99]"
            >
              {saving ? "Saving…" : "Log"}
            </button>
          </div>
        );
      })()}
    </div>
  );
}
