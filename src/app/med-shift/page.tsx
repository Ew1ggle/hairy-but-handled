"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import { useEntries, type DoseEntry, type MedEntry } from "@/lib/store";
import { isMedEffectivelyStopped } from "@/lib/meds";
import { format, parseISO } from "date-fns";
import { AlertTriangle, ChevronRight, Pause, Pill, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

/** Why a dose entry surfaces on Med Shift. Drives the colour and the
 *  one-line "what happened" tag at the top of each card. */
type ShiftReason =
  | "missed"
  | "late"
  | "vomited-after"
  | "withheld"
  | "refused"
  | "reaction"
  | "drift"
  | "tripwire";

const REASON_LABEL: Record<ShiftReason, string> = {
  missed: "Missed",
  late: "Late",
  "vomited-after": "Vomited after",
  withheld: "Withheld",
  refused: "Refused",
  reaction: "Reaction after dose",
  drift: "Dose / instructions changed",
  tripwire: "Linked to a Tripwire",
};

const REASON_TONE: Record<ShiftReason, "warn" | "alert"> = {
  missed: "alert",
  late: "warn",
  "vomited-after": "alert",
  withheld: "warn",
  refused: "alert",
  reaction: "alert",
  drift: "warn",
  tripwire: "alert",
};

/** A dose with one or more reasons it surfaced. A single dose can have
 *  multiple shift reasons (e.g. "vomited-after" + "reaction"); we show
 *  the most-alert one as the primary tag and list the rest beneath. */
type ShiftEntry = { dose: DoseEntry; reasons: ShiftReason[] };

function reasonsFor(d: DoseEntry): ShiftReason[] {
  const out: ShiftReason[] = [];
  if (d.status && d.status !== "taken") {
    // status maps directly to a reason for everything except "taken".
    out.push(d.status as ShiftReason);
  }
  if (d.reactionAfter) out.push("reaction");
  if (d.linkedTripwire) out.push("tripwire");
  if (d.notes && (d.notes.includes("Dose changed") || d.notes.includes("Instructions changed"))) {
    out.push("drift");
  }
  return out;
}

export default function MedShiftPage() {
  const doses = useEntries("dose");
  const meds = useEntries("med");

  const shifts = useMemo<ShiftEntry[]>(() => {
    return doses
      .map((d) => ({ dose: d, reasons: reasonsFor(d) }))
      .filter((e) => e.reasons.length > 0)
      .sort((a, b) => b.dose.createdAt.localeCompare(a.dose.createdAt));
  }, [doses]);

  /** Currently paused or stopped Med Deck rows — these are also things
   *  the team should notice when scanning what's shifted. */
  const pausedOrStopped = useMemo(
    () => meds
      .filter((m) => m.status === "paused" || isMedEffectivelyStopped(m))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [meds],
  );

  return (
    <AppShell>
      <PageTitle sub="Misses, changes, and reactions that matter">Med Shift</PageTitle>

      <p className="text-sm text-[var(--ink-soft)] mb-3">
        Surfaces the dose events that need a closer look — missed, late, vomited after, reactions, dose / instructions changes, anything linked to a Tripwire — plus meds currently on pause or stopped.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href="/doses"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium active:bg-[var(--surface-soft)]"
        >
          <Pill size={13} /> Dose Trace
        </Link>
        <Link
          href="/meds"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium active:bg-[var(--surface-soft)]"
        >
          <Pill size={13} /> Med Deck
        </Link>
      </div>

      {shifts.length === 0 && pausedOrStopped.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">
          Nothing to flag right now — no missed / changed / reaction doses, and no paused or stopped meds.
        </Card>
      )}

      {shifts.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">
            Dose events
          </h2>
          <div className="space-y-2 mb-5">
            {shifts.map((s) => (
              <ShiftCard key={s.dose.id} entry={s} />
            ))}
          </div>
        </>
      )}

      {pausedOrStopped.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">
            Paused or stopped meds
          </h2>
          <div className="space-y-2">
            {pausedOrStopped.map((m) => (
              <PausedStoppedCard key={m.id} m={m} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function ShiftCard({ entry }: { entry: ShiftEntry }) {
  const { dose: d, reasons } = entry;
  // Show alert-toned reasons first so the most urgent one is the primary tag.
  const sortedReasons = [...reasons].sort((a, b) => {
    const ta = REASON_TONE[a] === "alert" ? 0 : 1;
    const tb = REASON_TONE[b] === "alert" ? 0 : 1;
    return ta - tb;
  });
  const primary = sortedReasons[0];
  const primaryTone = REASON_TONE[primary];

  return (
    <Link href="/doses" className="block">
      <Card className="active:scale-[0.99] transition">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              primaryTone === "alert"
                ? "bg-[var(--alert)] text-white"
                : "bg-[var(--surface-soft)] text-[var(--ink)]"
            }`}
          >
            <AlertTriangle size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-semibold">
                {d.medName}
                {d.doseTaken && <span className="text-[var(--ink-soft)] font-normal"> · {d.doseTaken}</span>}
              </div>
              {sortedReasons.map((r) => (
                <span
                  key={r}
                  className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold ${
                    REASON_TONE[r] === "alert"
                      ? "bg-[var(--alert-soft)] text-[var(--alert)]"
                      : "bg-[var(--surface-soft)] text-[var(--ink)]"
                  }`}
                >
                  {REASON_LABEL[r]}
                </span>
              ))}
            </div>
            <div className="text-xs text-[var(--ink-soft)] mt-1">
              {[
                format(parseISO(d.createdAt), "d MMM"),
                d.timeDue && `due ${d.timeDue}`,
                d.timeTaken && `taken ${d.timeTaken}`,
              ].filter(Boolean).join(" · ")}
            </div>
            {d.reasonMissed && <div className="text-sm mt-1"><span className="font-semibold">Reason: </span>{d.reasonMissed}</div>}
            {d.whyPrn && <div className="text-sm mt-1"><span className="font-semibold">For: </span>{d.whyPrn}</div>}
            {d.reactionAfter && (
              <div className="text-sm mt-1 rounded-lg bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-1.5">
                <span className="font-semibold">Reaction: </span>{d.reactionAfter}
              </div>
            )}
            {d.notes && (
              <div className="text-xs text-[var(--ink-soft)] mt-1 whitespace-pre-line">
                {d.notes}
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-[var(--ink-soft)] shrink-0 mt-1.5" />
        </div>
      </Card>
    </Link>
  );
}

function PausedStoppedCard({ m }: { m: MedEntry }) {
  const isPaused = m.status === "paused";
  const Icon = isPaused ? Pause : X;
  return (
    <Link href="/meds" className="block">
      <Card className="active:scale-[0.99] transition">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--surface-soft)] text-[var(--ink)] flex items-center justify-center shrink-0">
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-semibold">
                {m.name}
                {m.dose && <span className="text-[var(--ink-soft)] font-normal"> · {m.dose}</span>}
              </div>
              <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] text-[var(--ink)] px-2 py-0.5 font-semibold">
                {isPaused ? "Paused" : "Stopped"}
              </span>
            </div>
            <div className="text-xs text-[var(--ink-soft)] mt-1">
              {[
                m.reason,
                m.stopDate ? `stopped ${m.stopDate}` : undefined,
              ].filter(Boolean).join(" · ")}
            </div>
            {m.importantNotes && (
              <div className="text-sm mt-1 rounded-lg bg-[var(--surface-soft)] px-2 py-1.5">
                <span className="font-semibold">Important: </span>{m.importantNotes}
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-[var(--ink-soft)] shrink-0 mt-1.5" />
        </div>
      </Card>
    </Link>
  );
}
