"use client";
import { AlertTriangle } from "lucide-react";

/** Short inline disclaimer for pages with clinical-looking content */
export function MedicalDisclaimerBanner() {
  return (
    <div className="mb-4 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-3 py-2.5 text-xs text-[var(--ink-soft)] flex items-start gap-2">
      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[var(--accent)]" />
      <span>
        This app is a tracking tool, not a source of medical advice. Red flags and recommendations are indicators only — always contact your care team if you are concerned. Do not delay seeking help because the app has not flagged something.
      </span>
    </div>
  );
}

/** Longer disclaimer for the ED triggers and side-effects pages */
export function MedicalDisclaimerFull() {
  return (
    <div className="mb-4 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-4 text-sm text-[var(--ink-soft)]">
      <div className="flex items-center gap-2 mb-2 font-semibold text-[var(--ink)]">
        <AlertTriangle size={16} className="text-[var(--accent)]" />
        Important
      </div>
      <p className="mb-2">
        This app helps you track symptoms and identify trends. It is <b>not</b> a source of medical advice, diagnosis, or treatment.
      </p>
      <p className="mb-2">
        The red flags, recommendations, and side-effect information shown here are <b>indicators only</b>. They are not exhaustive and may not cover your specific situation.
      </p>
      <p>
        <b>If you feel unwell, always contact your care team or call 000.</b> Do not wait for the app to flag something before seeking help. Your instinct matters — if something feels wrong, act on it.
      </p>
    </div>
  );
}
