"use client";
import { AlertTriangle, CreditCard, Building2, Boxes, FileText, Droplet, TrendingUp, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

/** Secondary-nav strip shown at the top of interior pages.
 *  Intentionally kept slim — daily actions (Home/Signal/Trace/Appts/Meds/ED)
 *  live in the bottom tab bar, so this surface only needs the rest. */
const LINKS = [
  { href: "/trends", icon: TrendingUp, label: "Trends", color: "var(--primary)" },
  { href: "/care", icon: Users, label: "Care", color: "var(--pink)" },
  { href: "/medical-alerts", icon: AlertTriangle, label: "Med alerts", color: "var(--alert)" },
  { href: "/cards", icon: CreditCard, label: "Cards", color: "var(--purple)" },
  { href: "/bloods", icon: Droplet, label: "Bloods", color: "var(--blue)" },
  { href: "/admissions", icon: Building2, label: "Admits", color: "var(--accent)" },
  { href: "/home", icon: Boxes, label: "Home Ops", color: "var(--blue)" },
  { href: "/export", icon: FileText, label: "Export", color: "var(--primary)" },
];

export default function QuickNav() {
  const path = usePathname();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent, href: string) => {
    const formDirty = document.querySelector("[data-dirty='true']");
    if (formDirty) {
      e.preventDefault();
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        router.push(href);
      }
    }
  };

  const visible = LINKS.filter((l) => l.href !== path);

  return (
    <div className="sticky top-9 z-30 -mx-4 px-4 py-2 mb-4 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-sm">
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {visible.map(({ href, icon: Icon, label, color }) => (
          <a
            key={href}
            href={href}
            onClick={(e) => handleClick(e, href)}
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 border border-[var(--border)] bg-[var(--surface)] active:scale-95 transition"
          >
            <Icon size={18} style={{ color }} />
            <span className="text-[10px] text-[var(--ink-soft)] text-center leading-tight">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
