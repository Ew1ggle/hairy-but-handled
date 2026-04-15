"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type QuestionEntry } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Check } from "lucide-react";
import { useState } from "react";

export default function Questions() {
  const entries = useEntries("question").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <PageTitle sub="Park questions here. Answers are filled in at the appointment.">
        Questions for the team
      </PageTitle>

      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5">
          <Plus size={18} /> Add question
        </button>
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
  const [question, setQuestion] = useState("");
  const { addEntry } = useSession();
  const save = async () => {
    if (!question.trim()) return;
    await addEntry({ kind: "question", question: question.trim() } as Omit<QuestionEntry, "id" | "createdAt">);
    onDone();
  };
  return (
    <Card className="space-y-3 mb-5">
      <Field label="Question">
        <TextArea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. When can I exercise again?" autoFocus />
      </Field>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!question.trim()}>Save</Submit>
      </div>
    </Card>
  );
}
