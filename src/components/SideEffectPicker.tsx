"use client";
import { TextInput } from "@/components/ui";
import { PHASE_LABEL, searchSideEffects, type SideEffect } from "@/lib/sideEffects";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

/** Reusable type-to-search side-effect picker. Same shape used on
 *  Signal Sweep's Other sheet — tapping it on the infusion page,
 *  /emergency, or anywhere else gives the user the canonical library
 *  rather than a per-page hardcoded list.
 *
 *  Selected entries are stored as title strings (so the value type
 *  is string[], compatible with existing reactionSymptoms /
 *  presentations fields). Falls back to a free-text 'add custom' on
 *  no library match so the user is never blocked.
 *
 *  Optional whatToDo property: when true, surfaces the action-hint
 *  panel beneath the chips for any selected library effect — useful
 *  on the infusion page where reaction guidance is high-value. */
export function SideEffectPicker({
  selected,
  onChange,
  placeholder = "Type a symptom — e.g. rash, breathless, dizzy",
  showWhatToDo = false,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  showWhatToDo?: boolean;
}) {
  const [query, setQuery] = useState("");
  const matches = searchSideEffects(query, { limit: 6, minLength: 2 });

  const addTitle = (title: string) => {
    const t = title.trim();
    if (!t) return;
    if (selected.some((s) => s.toLowerCase() === t.toLowerCase())) return;
    onChange([...selected, t]);
    setQuery("");
  };

  const removeTitle = (title: string) => {
    onChange(selected.filter((s) => s !== title));
  };

  // Find SideEffect entries for any selected titles so the action-hint
  // panel can surface their whatToDo / urgent fields.
  const selectedEffects = (() => {
    if (!showWhatToDo) return [];
    return selected
      .map((t) => searchSideEffects(t, { limit: 1 })[0])
      .filter((s): s is SideEffect => !!s && s.title === selected.find((x) => x.toLowerCase() === s.title.toLowerCase()));
  })();

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((title) => (
            <span
              key={title}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] text-[var(--primary-ink)] px-2.5 py-1 text-xs font-medium"
            >
              {title}
              <button
                type="button"
                onClick={() => removeTitle(title)}
                aria-label={`Remove ${title}`}
                className="opacity-80 hover:opacity-100"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div>
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
        {matches.length > 0 && (
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-1.5 space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold px-2 pt-1 pb-0.5">
              Matches in side-effect library — tap to attach
            </div>
            {matches.map((s) => {
              const already = selected.some((x) => x.toLowerCase() === s.title.toLowerCase());
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => !already && addTitle(s.title)}
                  disabled={already}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${already ? "opacity-50" : "bg-[var(--surface)] active:bg-[var(--primary)] active:text-white"}`}
                >
                  <div className="font-medium">{s.title}{already ? " — added" : ""}</div>
                  <div className="text-xs text-[var(--ink-soft)]">
                    {PHASE_LABEL[s.phase]}
                    {s.urgentAction === "ed" ? " · Urgent" : ""}
                  </div>
                </button>
              );
            })}
            {query.trim().length >= 2 && matches.length > 0 && (
              <button
                type="button"
                onClick={() => addTitle(query)}
                className="w-full text-left rounded-lg px-3 py-2 text-xs text-[var(--ink-soft)] active:bg-[var(--surface-soft)]"
              >
                + Add &ldquo;{query}&rdquo; as free text
              </button>
            )}
          </div>
        )}
        {query.trim().length >= 2 && matches.length === 0 && (
          <button
            type="button"
            onClick={() => addTitle(query)}
            className="mt-2 w-full text-left rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm active:bg-[var(--surface-soft)]"
          >
            <span className="font-medium">+ Add &ldquo;{query}&rdquo;</span>
            <div className="text-xs text-[var(--ink-soft)]">No library match — saved as free text</div>
          </button>
        )}
      </div>

      {showWhatToDo && selectedEffects.some((s) => (s.whatToDo?.length ?? 0) > 0 || (s.urgent?.length ?? 0) > 0) && (
        <div className="space-y-2">
          {selectedEffects.map((s) => {
            const hasSteps = (s.whatToDo?.length ?? 0) > 0;
            const hasUrgent = (s.urgent?.length ?? 0) > 0;
            if (!hasSteps && !hasUrgent) return null;
            return (
              <div key={s.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="text-sm font-semibold mb-2">What to do — {s.title}</div>
                {hasSteps && (
                  <ul className="text-sm space-y-1">
                    {s.whatToDo!.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[var(--primary)] shrink-0">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {hasUrgent && (
                  <div className="rounded-lg bg-[var(--alert-soft)] p-2.5 mt-2.5">
                    <div className="text-xs font-semibold text-[var(--alert)] mb-1 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {s.urgentAction === "ed" ? "Go to ED if:" : "Call team now if:"}
                    </div>
                    <ul className="text-xs space-y-0.5 text-[var(--alert)]">
                      {s.urgent!.map((step, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
