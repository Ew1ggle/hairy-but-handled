"use client";
import { TextInput } from "@/components/ui";
import { format } from "date-fns";
import { useState } from "react";

/** Shared "Time of event" control for entry forms where recording is
 *  often delayed (doses, relief, meals, drinks). Mirrors the signal
 *  sheet pattern: a labelled time strip with the current value, a
 *  "Change" button that reveals a datetime-local input + "Reset to
 *  now" link. The parent owns the value (ISO string) and gets a
 *  callback on change.
 *
 *  Use the value as the entry's createdAt when calling addEntry /
 *  updateEntry — session.tsx already accepts an optional createdAt
 *  on those calls. */
export function EntryTimestampField({
  label = "Time of event",
  hint = "Defaults to now — change if you're catching up",
  value,
  onChange,
}: {
  label?: string;
  hint?: string;
  /** ISO timestamp. */
  value: string;
  /** New ISO timestamp. */
  onChange: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  // datetime-local format is yyyy-MM-dd'T'HH:mm — convert to/from
  // the parent's ISO string so the input renders correctly.
  const local = (() => {
    try {
      return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
    } catch {
      return format(new Date(), "yyyy-MM-dd'T'HH:mm");
    }
  })();
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs">
          <div className="text-[var(--ink-soft)]">{label}</div>
          <div className="font-semibold">
            {format(new Date(value), "d MMM yyyy · HH:mm")}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-xs font-semibold text-[var(--primary)]"
        >
          {editing ? "Done" : "Change"}
        </button>
      </div>
      {editing && (
        <div className="mt-2 space-y-2">
          <div className="text-[11px] text-[var(--ink-soft)]">{hint}</div>
          <TextInput
            type="datetime-local"
            value={local}
            onChange={(e) => {
              try {
                onChange(new Date(e.target.value).toISOString());
              } catch {
                /* ignore invalid intermediate states */
              }
            }}
          />
          <button
            type="button"
            onClick={() => onChange(new Date().toISOString())}
            className="text-xs font-medium text-[var(--ink-soft)] underline"
          >
            Reset to now
          </button>
        </div>
      )}
    </div>
  );
}
