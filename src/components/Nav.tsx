"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, HeartPulse, AlertTriangle, Siren, Activity, Calendar, Pill } from "lucide-react";
import { isToday, parseISO } from "date-fns";
import { useEntries } from "@/lib/store";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/signal-sweep", label: "Signal", icon: Activity },
  { href: "/log", label: "Trace", icon: HeartPulse },
  { href: "/appointments", label: "Appts", icon: Calendar },
  { href: "/meds", label: "Meds", icon: Pill },
  { href: "/emergency", label: "ED", icon: Siren, alert: true },
];

export default function Nav() {
  const path = usePathname();
  const flags = useEntries("flag");
  const todaysFlags = flags.filter((f) => isToday(parseISO(f.createdAt)));
  const hasFlags = todaysFlags.length > 0;

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

      {/* Bottom nav — iOS-style tab bar */}
      <nav className="no-print fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
        <ul className="flex justify-around max-w-2xl mx-auto">
          {items.map(({ href, label, icon: Icon, alert: isAlert }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 text-[11px] ${
                    isAlert ? "text-[var(--alert)]" : active ? "text-[var(--primary)]" : "text-[var(--ink-soft)]"
                  }`}
                >
                  <Icon size={22} strokeWidth={active || isAlert ? 2.4 : 1.8} />
                  <span className={isAlert ? "font-semibold" : ""}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
