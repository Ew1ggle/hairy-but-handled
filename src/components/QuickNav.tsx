"use client";
import { Pill, Search, Droplet, Siren, Building2, CreditCard, MessagesSquare, Calendar, FileText, HeartPulse, Home, Beaker, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", icon: Home, label: "Home", color: "var(--ink-soft)" },
  { href: "/log", icon: HeartPulse, label: "Log", color: "var(--primary)" },
  { href: "/treatment", icon: Beaker, label: "Treatment", color: "var(--accent)" },
  { href: "/meds", icon: Pill, label: "Meds", color: "var(--purple)" },
  { href: "/side-effects", icon: Search, label: "Side effects", color: "var(--pink)" },
  { href: "/bloods", icon: Droplet, label: "Bloods", color: "var(--blue)" },
  { href: "/emergency", icon: Siren, label: "ED", color: "var(--alert)" },
  { href: "/admissions", icon: Building2, label: "Admits", color: "var(--accent)" },
  { href: "/appointments", icon: Calendar, label: "Appts", color: "var(--primary)" },
  { href: "/questions", icon: MessagesSquare, label: "Questions", color: "var(--blue)" },
  { href: "/cards", icon: CreditCard, label: "Cards", color: "var(--purple)" },
  { href: "/export", icon: FileText, label: "Export", color: "var(--primary)" },
  { href: "/settings", icon: Settings, label: "Settings", color: "var(--ink-soft)" },
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

  const visible = LINKS.filter((l) => l.href !== path);

  return (
    <div className="mb-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
      {visible.map(({ href, icon: Icon, label, color }) => (
        <a
          key={href}
          href={href}
          onClick={(e) => handleClick(e, href)}
          className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 border border-[var(--border)] active:scale-95 transition"
        >
          <Icon size={20} style={{ color }} />
          <span className="text-[10px] text-[var(--ink-soft)] text-center leading-tight">{label}</span>
        </a>
      ))}
    </div>
  );
}
