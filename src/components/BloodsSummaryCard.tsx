"use client";
import { Card } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { format, parseISO } from "date-fns";
import { Droplet } from "lucide-react";
import Link from "next/link";

/** Compact summary of the latest blood result, embedded in Daily Trace.
 *  Links out to /bloods for the full entry form + history. */
export function BloodsSummaryCard() {
  const bloods = useEntries("bloods");
  const latest = bloods
    .slice()
    .sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""))[0];

  return (
    <Card className="mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-semibold flex items-center gap-1.5">
          <Droplet size={16} /> Test results
        </h2>
        <Link href="/bloods" className="text-xs font-medium text-[var(--primary)]">
          {latest ? "History →" : "Add result →"}
        </Link>
      </div>

      {!latest ? (
        <p className="text-sm text-[var(--ink-soft)]">
          No blood results logged yet. Tap <b>Add result</b> to capture Hb, WCC, neutrophils, platelets and more.
        </p>
      ) : (
        <>
          <div className="text-xs text-[var(--ink-soft)] mb-2">
            Latest: <b className="text-[var(--ink)]">{format(parseISO(latest.takenAt), "EEE d MMM yyyy")}</b>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <BloodStat label="Hb" value={latest.hb} />
            <BloodStat label="WCC" value={latest.wcc} />
            <BloodStat label="Neut" value={latest.neutrophils} />
            <BloodStat label="Plt" value={latest.platelets} />
          </div>
          {(latest.lymphocytes != null || latest.monocytes != null || latest.creatinine != null || latest.crp != null) && (
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              <BloodStat label="Lymph" value={latest.lymphocytes} />
              <BloodStat label="Mono" value={latest.monocytes} />
              <BloodStat label="Creat" value={latest.creatinine} />
              <BloodStat label="CRP" value={latest.crp} />
            </div>
          )}
          <Link
            href="/bloods"
            className="mt-3 block w-full text-center rounded-xl border border-[var(--border)] py-2 text-sm font-medium"
          >
            Add new result
          </Link>
        </>
      )}
    </Card>
  );
}

function BloodStat({ label, value }: { label: string; value?: number | null }) {
  const display = value == null ? "—" : String(value);
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] px-2 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{display}</div>
    </div>
  );
}
