"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, HeartPulse, Droplet, Pill, FileText, AlertTriangle, Settings } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/log", label: "Log", icon: HeartPulse },
  { href: "/treatment", label: "Infusion", icon: Droplet },
  { href: "/bloods", label: "Bloods", icon: Pill },
  { href: "/export", label: "Export", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Nav() {
  const path = usePathname();
  return (
    <>
      {/* Sticky top ED triggers bar — always visible */}
      <Link
        href="/ed-triggers"
        className="no-print sticky top-0 z-40 flex items-center justify-center gap-2 bg-[var(--alert)] text-white py-2 px-4 text-sm font-semibold tracking-wide shadow-sm"
      >
        <AlertTriangle size={16} />
        <span>When to call / go to ED — tap here</span>
      </Link>

      {/* Bottom nav — iOS-style tab bar */}
      <nav className="no-print fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
        <ul className="flex justify-around max-w-2xl mx-auto">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] ${
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
