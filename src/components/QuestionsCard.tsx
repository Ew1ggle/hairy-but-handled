"use client";
import { Card, TextInput } from "@/components/ui";
import { useEntries, type QuestionEntry } from "@/lib/store";
import { useSession } from "@/lib/session";
import { addDays, format, isAfter, isBefore, parseISO } from "date-fns";
import { MessagesSquare, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Compact "questions for the care team" card — lives inside Daily Trace.
 *  Lists unanswered questions across all days, lets you add one inline,
 *  and auto-generates questions from:
 *   - new blood results     → "Discuss blood results from <date>"
 *   - "Other" signals       → "Discuss side effect: <label>"
 *   - upcoming appointments → "Got questions for <type> on <date>?"
 *  Dedup via autoFrom = source entry id. */
export function QuestionsCard() {
  const { addEntry, updateEntry, deleteEntry } = useSession();
  const questions = useEntries("question");
  const bloods = useEntries("bloods");
  const signals = useEntries("signal");
  const appointments = useEntries("appointment");

  const unanswered = questions.filter((q) => !q.answer);
  const [draft, setDraft] = useState("");

  // Track which source ids we've already fired addEntry for in this session,
  // so rapid re-renders before the insert settles don't double-seed.
  const firedRef = useRef<Set<string>>(new Set());

  // Auto-seed questions from untracked bloods / Other signals / upcoming appointments.
  // Re-checks on every render so new entries get seeded without a page reload.
  useEffect(() => {
    const seen = new Set<string>();
    for (const q of questions) {
      if (q.autoFrom) seen.add(q.autoFrom);
    }

    const toSeed: { text: string; autoFrom: string; autoKind: string }[] = [];

    for (const b of bloods) {
      if (seen.has(b.id) || firedRef.current.has(b.id)) continue;
      const datePart = b.takenAt ? format(parseISO(b.takenAt), "d MMM") : "recent";
      toSeed.push({
        text: `Discuss blood results from ${datePart}`,
        autoFrom: b.id,
        autoKind: "bloods",
      });
    }

    for (const s of signals) {
      if (s.signalType !== "other") continue;
      if (seen.has(s.id) || firedRef.current.has(s.id)) continue;
      if (!s.customLabel && !(s.choices && s.choices.length)) continue;
      const label = s.customLabel || (s.choices ?? []).join(", ");
      toSeed.push({
        text: `Discuss side effect: ${label}`,
        autoFrom: s.id,
        autoKind: "side-effect",
      });
    }

    // Upcoming appointments in the next 14 days
    const now = new Date();
    const horizon = addDays(now, 14);
    for (const a of appointments) {
      if (!a.date) continue;
      const d = parseISO(a.date);
      if (isBefore(d, now) || isAfter(d, horizon)) continue;
      if (seen.has(a.id) || firedRef.current.has(a.id)) continue;
      const typeLabel = a.type || "appointment";
      const when = format(d, "EEE d MMM");
      toSeed.push({
        text: `Got questions for ${typeLabel} on ${when}?`,
        autoFrom: a.id,
        autoKind: "appointment",
      });
    }

    if (toSeed.length === 0) return;
    for (const q of toSeed) firedRef.current.add(q.autoFrom);
    (async () => {
      for (const q of toSeed) {
        await addEntry({
          kind: "question",
          question: q.text,
          autoFrom: q.autoFrom,
          autoKind: q.autoKind,
        } as Omit<QuestionEntry, "id" | "createdAt">);
      }
    })();
  }, [questions, bloods, signals, appointments, addEntry]);

  const addQuestion = async () => {
    const text = draft.trim();
    if (!text) return;
    await addEntry({ kind: "question", question: text } as Omit<QuestionEntry, "id" | "createdAt">);
    setDraft("");
  };

  const markAnswered = async (id: string) => {
    await updateEntry(id, { answer: "answered" } as Partial<QuestionEntry>);
  };

  return (
    <Card className="space-y-3 mb-4">
      <div>
        <h2 className="font-semibold flex items-center gap-1.5">
          <MessagesSquare size={16} /> Questions for the care team
        </h2>
        <p className="text-xs text-[var(--ink-soft)]">
          Blood results, side effects, and upcoming appointments auto-appear here. Add anything else you want to raise.
        </p>
      </div>

      {unanswered.length > 0 && (
        <ul className="space-y-1.5">
          {unanswered.map((q) => (
            <li
              key={q.id}
              className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2"
            >
              <span className="flex-1 min-w-0 text-sm break-words">
                {q.autoFrom && (
                  <Sparkles
                    size={11}
                    className="inline text-[var(--primary)] mr-1 -mt-0.5"
                    aria-label="Auto-generated"
                  />
                )}
                {q.question}
              </span>
              <button
                type="button"
                onClick={() => markAnswered(q.id)}
                className="shrink-0 text-[11px] font-medium text-[var(--primary)] px-2 py-1 rounded-lg"
                title="Mark as answered"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => deleteEntry(q.id)}
                className="shrink-0 text-[var(--ink-soft)] p-1"
                aria-label="Remove question"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <TextInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a question to ask the team"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } }}
        />
        <button
          type="button"
          onClick={addQuestion}
          disabled={!draft.trim()}
          className="shrink-0 rounded-xl bg-[var(--primary)] text-[var(--primary-ink)] px-3 py-2 text-sm font-medium disabled:opacity-50"
          aria-label="Add question"
        >
          <Plus size={16} />
        </button>
      </div>
      {unanswered.length === 0 && (
        <p className="text-[11px] text-[var(--ink-soft)]">
          No open questions. Add any that come up during the day.
        </p>
      )}
    </Card>
  );
}
