"use client";
import { DEMO_FLAG_KEY } from "@/lib/session";
import { useEffect } from "react";

export default function EnterDemo() {
  useEffect(() => {
    try { window.localStorage.setItem(DEMO_FLAG_KEY, "1"); } catch {}
    window.location.replace("/");
  }, []);
  return (
    <div className="min-h-dvh flex items-center justify-center text-[var(--ink-soft)]">
      Loading demo…
    </div>
  );
}
