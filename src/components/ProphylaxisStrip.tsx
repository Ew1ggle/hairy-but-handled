"use client";
import { useEntries } from "@/lib/store";
import { isMedEffectivelyStopped } from "@/lib/meds";
import { format, parseISO } from "date-fns";
import { Pill, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const PURPOSE_LABEL: Record<string, string> = {
  "prophylaxis-pjp": "PJP cover",
  "prophylaxis-antiviral": "Antiviral cover",
  "prophylaxis-antifungal": "Antifungal cover",
  "hbv-suppression": "HBV suppression",
};

/** Compact strip showing each active prophylaxis med + when it was
 *  last taken. Cladribine causes prolonged CD4 lymphopenia (12-54
 *  months); missing a Bactrim dose for a fortnight is the single
 *  highest-value thing a carer can catch. The strip surfaces last-
 *  dose recency at a glance so a missed week is visible.
 *
 *  Renders nothing when no prophylaxis-tagged meds are active —
 *  doesn't add noise for users who haven't tagged yet. */
export function ProphylaxisStrip() {
  const meds = useEntries("med");
  const doses = useEntries("dose");

  const rows = useMemo(() => {
    const active = meds.filter((m) =>
      !isMedEffectivelyStopped(m) &&
      m.purpose && m.purpose !== "treatment" && m.purpose !== "supportive",
    );
    return active.map((m) => {
      // Last dose taken (status="taken") for this med, by createdAt.
      const last = doses
        .filter((d) => d.medId === m.id && d.status === "taken")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const hoursSinceLast = last
        ? (Date.now() - parseISO(last.createdAt).getTime()) / (1000 * 60 * 60)
        : null;
      // "Stale" heuristic: prophylaxis meds typically dose daily or
      // alternate days. >36h since last dose is suspicious.
      const stale = hoursSinceLast == null || hoursSinceLast > 36;
      return {
        med: m,
        last,
        hoursSinceLast,
        stale,
      };
    });
  }, [meds, doses]);

  if (rows.length === 0) return null;
  const anyStale = rows.some((r) => r.stale);

  return (
    <Link
      href="/doses"
      className="block mb-3 rounded-2xl border-2 px-4 py-3 transition active:scale-[0.99]"
      style={{
        borderColor: anyStale ? "var(--alert)" : "var(--primary)",
        backgroundColor: anyStale ? "var(--alert-soft)" : "var(--surface)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {anyStale ? (
          <AlertTriangle size={16} className="text-[var(--alert)] shrink-0" />
        ) : (
          <Pill size={16} className="text-[var(--primary)] shrink-0" />
        )}
        <div
          className="text-xs uppercase tracking-widest font-bold"
          style={{ color: anyStale ? "var(--alert)" : "var(--primary)" }}
        >
          Prophylaxis status
        </div>
      </div>
      <ul className="space-y-1">
        {rows.map(({ med, last, hoursSinceLast, stale }) => (
          <li key={med.id} className="text-xs flex items-center justify-between gap-2">
            <span>
              <b>{med.name}</b>
              {med.purpose && (
                <span className="text-[var(--ink-soft)]"> · {PURPOSE_LABEL[med.purpose] ?? med.purpose}</span>
              )}
            </span>
            <span
              className={stale ? "font-semibold text-[var(--alert)]" : "text-[var(--ink-soft)]"}
            >
              {last
                ? `${format(parseISO(last.createdAt), "EEE HH:mm")}${
                    hoursSinceLast != null
                      ? ` · ${hoursSinceLast < 1 ? "<1h" : hoursSinceLast < 48 ? `${Math.round(hoursSinceLast)}h` : `${Math.round(hoursSinceLast / 24)}d`} ago`
                      : ""
                  }`
                : "no doses logged"}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
