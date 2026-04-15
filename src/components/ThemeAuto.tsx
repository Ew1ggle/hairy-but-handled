"use client";
import { useEffect } from "react";

/**
 * Applies a palette based on time of day (and the user's saved override).
 * Morning: 5am–10am · Day: 10am–6pm · Night: 6pm–5am
 */
export default function ThemeAuto() {
  useEffect(() => {
    const apply = () => {
      const override = localStorage.getItem("hbh:theme");
      const html = document.documentElement;
      html.classList.remove("theme-morning", "theme-night");
      if (override === "day") return;
      if (override === "morning") { html.classList.add("theme-morning"); return; }
      if (override === "night") { html.classList.add("theme-night"); return; }
      const h = new Date().getHours();
      if (h >= 5 && h < 10) html.classList.add("theme-morning");
      else if (h >= 18 || h < 5) html.classList.add("theme-night");
    };
    apply();
    const id = setInterval(apply, 60 * 1000); // recheck every minute
    const onStorage = () => apply();
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, []);
  return null;
}
