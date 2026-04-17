"use client";
import { Pill, Search, Droplet, Siren, Building2, CreditCard, MessagesSquare, Calendar, FileText, HeartPulse, Home } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", icon: Home, label: "Home", color: "var(--ink-soft)" },
  { href: "/log", icon: HeartPulse, label: "Log", color: "var(--primary)" },
  { href: "/meds", icon: Pill, label: "Meds", color: "var(--purple)" },
  { href: "/side-effects", icon: Search, label: "Side effects", color: "var(--pink)" },
  { href: "/bloods", icon: Droplet, label: "Bloods", color: "var(--blue)" },
  { href: "/emergency", icon: Siren, label: "ED", color: "var(--alert)" },
  { href: "/admissions", icon: Building2, label: "Admits", color: "var(--accent)" },
  { href: "/appointments", icon: Calendar, label: "Appts", color: "var(--primary)" },
  { href: "/questions", icon: MessagesSquare, label: "Questions", color: "var(--blue)" },
  { href: "/cards", icon: CreditCard, label: "Cards", color: "var(--purple)" },
  { href: "/export", icon: FileText, label: "Export", color: "var(--primary)" },
];

export default function QuickNav() {
  const path = usePathname();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent, href: string) => {
    // Check if there's an unsaved form on the page
    const formDirty = document.querySelector("[data-dirty='true']");
    if (formDirty) {
      e.preventDefault();
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        router.push(href);
      }
    }
  };

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {LINKS.filter((l) => l.href !== path).map(({ href, icon: Icon, label, color }) => (
        <a
          key={href}
          href={href}
          onClick={(e) => handleClick(e, href)}
          className="flex flex-col items-center gap-1 shrink-0 rounded-xl px-3 py-2 border border-[var(--border)] active:scale-95 transition"
          style={{ minWidth: 64 }}
        >
          <Icon size={20} style={{ color }} />
          <span className="text-[10px] text-[var(--ink-soft)]">{label}</span>
        </a>
      ))}
    </div>
  );
}
