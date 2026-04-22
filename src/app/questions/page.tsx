"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea } from "@/components/ui";
import { useEntries, type QuestionEntry } from "@/lib/store";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Check, Copy } from "lucide-react";
import Dictate from "@/components/Dictate";
import { useState } from "react";

const STARTER_QUESTIONS = [
  "Are today's bloods okay for me to proceed with treatment?",
  "What symptoms tonight mean I should go to ED?",
  "Is what I'm feeling an expected treatment effect, or worse than expected?",
  "Do my numbers mean transfusion, admission, antibiotics, or treatment delay?",
  "When can I exercise / work / travel again?",
  "When is my next scan / review / bloods?",
  "Which side effects should I call about vs push through?",
  "Is there anything I should stop eating / taking while on this?",
  "What's the plan for the next cycle?",
];

export default function Questions() {
  const entries = useEntries("question").slice().sort((a, b) => {
    const au = !a.answer ? 0 : 1;
    const bu = !b.answer ? 0 : 1;
    if (au !== bu) return au - bu;
    return b.createdAt.localeCompare(a.createdAt);
  });
  const unanswered = entries.filter((q) => !q.answer);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyUnanswered = async () => {
    if (unanswered.length === 0) return;
    const text = unanswered.map((q, i) => `${i + 1}. ${q.question}`).join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <AppShell>
      <PageTitle sub={`${unanswered.length} unanswered · ${entries.length - unanswered.length} answered`}>
        Questions for the team
      </PageTitle>

      {!open ? (
        <div className="grid gap-2 mb-5">
          <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5">
            <Plus size={18} /> Add question
          </button>
          {unanswered.length > 0 && (
            <button onClick={copyUnanswered} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] py-3 text-sm">
              {copied ? <><Check size={14} /> Copied — paste into the team's chat or notes</> : <><Copy size={14} /> Copy unanswered questions</>}
            </button>
          )}
        </div>
      ) : (
        <NewQuestionForm onDone={() => setOpen(false)} />
      )}

      {entries.length === 0 && <Card className="text-center text-[var(--ink-soft)]">No questions yet.</Card>}

      <div className="space-y-2">
        {entries.map((q) => <QuestionRow key={q.id} q={q} />)}
      </div>
    </AppShell>
  );
}

function QuestionRow({ q }: { q: QuestionEntry }) {
  const [answer, setAnswer] = useState(q.answer ?? "");
  const [editing, setEditing] = useState(false);
  const { updateEntry, deleteEntry } = useSession();

  const saveAnswer = async () => {
    await updateEntry(q.id, { answer, askedAt: q.askedAt ?? new Date().toISOString() });
    setEditing(false);
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium">{q.question}</p>
          <div className="text-xs text-[var(--ink-soft)] mt-0.5">Added {format(parseISO(q.createdAt), "d MMM")}</div>
          {q.answer && !editing && (
            <div className="mt-2 rounded-lg bg-[var(--surface-soft)] p-2.5 text-sm">
              <div className="flex items-center gap-1 text-[var(--good)] text-xs mb-1"><Check size={12} /> Answered</div>
              {q.answer}
            </div>
          )}
          {editing && (
            <div className="mt-2 space-y-2">
              <TextArea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="What did the team say?" />
              <div className="flex justify-end">
                <Dictate value={answer} onAppend={setAnswer} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-[var(--border)] py-2 text-sm">Cancel</button>
                <button onClick={saveAnswer} className="flex-1 rounded-xl bg-[var(--primary)] text-white py-2 text-sm font-medium">Save answer</button>
              </div>
            </div>
          )}
          {!editing && !q.answer && (
            <button onClick={() => setEditing(true)} className="mt-2 text-sm text-[var(--primary)] font-medium">+ Add answer</button>
          )}
          {!editing && q.answer && (
            <button onClick={() => setEditing(true)} className="mt-2 text-xs text-[var(--ink-soft)]">Edit answer</button>
          )}
        </div>
        <button onClick={() => deleteEntry(q.id)} className="text-[var(--ink-soft)] p-1" aria-label="Delete">
          <Trash2 size={18} />
        </button>
      </div>
    </Card>
  );
}

function NewQuestionForm({ onDone }: { onDone: () => void }) {
  const { addEntry, activePatientId } = useSession();
  const [question, setQuestion] = useState("");
  const { clear: clearDraft } = useDraft<{ question: string }>({
    key: "/questions/new",
    href: "/questions",
    title: "Question",
    patientId: activePatientId,
    state: { question },
    onRestore: (d) => { if (d.question) setQuestion(d.question); },
  });
  const save = async (text?: string) => {
    const q = (text ?? question).trim();
    if (!q) return;
    await addEntry({ kind: "question", question: q } as Omit<QuestionEntry, "id" | "createdAt">);
    clearDraft();
    if (!text) onDone();
    setQuestion("");
  };
  return (
    <Card className="space-y-3 mb-5">
      <Field label="Your question">
        <TextArea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Type anything you want to ask…" autoFocus />
      </Field>
      <div className="flex justify-end">
        <Dictate value={question} onAppend={setQuestion} />
      </div>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Done</button>
        <Submit onClick={() => save()} disabled={!question.trim()}>Add</Submit>
      </div>
      <div className="pt-2">
        <div className="text-sm font-medium mb-2">Or pick a common one</div>
        <div className="space-y-1.5">
          {STARTER_QUESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => save(s)}
              className="w-full text-left rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
              + {s}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
