"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, HeartPulse, AlertTriangle, Siren, Activity, Calendar, Pill, Building2 } from "lucide-react";
import { isToday, parseISO } from "date-fns";
import { useEntries } from "@/lib/store";
import { useMemo } from "react";

// ED removed from the bottom tab bar — it sat next to other low-stakes
// daily-use buttons and was being tapped by accident. The persistent
// ED row directly under the Tripwires bar (below) keeps it within
// thumb reach when actually needed and visually grouped with the
// "when to call / go to ED" rail.
const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/signal-sweep", label: "Signal", icon: Activity },
  { href: "/log", label: "Trace", icon: HeartPulse },
  { href: "/appointments", label: "Appts", icon: Calendar },
  { href: "/meds", label: "Meds", icon: Pill },
];

export default function Nav() {
  const path = usePathname();
  const flags = useEntries("flag");
  const admissions = useEntries("admission");
  const todaysFlags = flags.filter((f) => isToday(parseISO(f.createdAt)));
  const hasFlags = todaysFlags.length > 0;

  // Active stay = any admission row not yet discharged. Drives the
  // ED row's copy + tap target so a second tap doesn't open a new
  // form / spawn a duplicate row when the patient's already in
  // hospital.
  const activeStay = useMemo(
    () => admissions
      .filter((a) => !a.dischargeDate)
      .sort((a, b) => (b.admissionDate ?? b.createdAt ?? "").localeCompare(a.admissionDate ?? a.createdAt ?? ""))[0],
    [admissions],
  );
  const isEdInProgress = activeStay
    && (activeStay.edVisit || activeStay.reason?.toLowerCase().startsWith("ed "))
    && activeStay.outcome !== "admitted";
  const isAdmitted = activeStay && !isEdInProgress;

  const edHref = activeStay
    ? (isEdInProgress ? `/emergency?edit=${activeStay.id}` : `/admissions?edit=${activeStay.id}`)
    : "/emergency";
  const edTitle = isEdInProgress
    ? "Currently at Emergency · tap to update"
    : isAdmitted
      ? `Currently admitted${activeStay.ward ? ` · ${activeStay.ward}` : ""} · tap to update`
      : "Go to Emergency · tap to log a visit";

  return (
    <>
      {/* Sticky top Tripwires bar — always visible, stronger when flags are active */}
      <Link
        href="/ed-triggers"
        className={`no-print sticky top-0 z-40 flex items-center justify-center gap-2 text-white tracking-wide shadow-lg ${
          hasFlags ? "py-3.5 px-4 text-base font-bold" : "py-2.5 px-4 text-sm font-semibold"
        }`}
        style={{
          backgroundColor: hasFlags ? "#b91c1c" : "var(--alert)",
          borderBottom: hasFlags ? "3px solid #7f1d1d" : undefined,
        }}
      >
        <AlertTriangle size={hasFlags ? 20 : 18} />
        <span>
          {hasFlags
            ? `TRIPWIRES — ${todaysFlags.length} red flag${todaysFlags.length === 1 ? "" : "s"} today · tap to review`
            : "TRIPWIRES — when to call / go to ED"}
        </span>
      </Link>

      {/* Persistent ED row — sits directly under Tripwires so the user
           always knows where the ED log is, but is far away from the
           bottom thumb-zone where accidental taps happened. Copy +
           target adapt to whether the patient is currently at ED, on
           a ward, or neither. */}
      <Link
        href={edHref}
        className="no-print sticky top-[36px] z-30 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide shadow-sm"
        style={{
          backgroundColor: activeStay ? "var(--alert)" : "var(--alert-soft)",
          color: activeStay ? "#fff" : "var(--alert)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {isAdmitted ? <Building2 size={14} /> : <Siren size={14} />}
        <span className="uppercase">{edTitle}</span>
      </Link>

      {/* Bottom nav — iOS-style tab bar (5 slots, ED moved up) */}
      <nav className="no-print fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
        <ul className="flex justify-around max-w-2xl mx-auto">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 text-[11px] ${
                    active ? "text-[var(--primary)]" : "text-[var(--ink-soft)]"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
