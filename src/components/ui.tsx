"use client";
import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <header className="mb-5">
      <h1 className="display text-3xl text-[var(--ink)]">{children}</h1>
      {sub && <p className="text-[var(--ink-soft)] mt-1">{sub}</p>}
    </header>
  );
}

export function BigButton({
  href,
  onClick,
  tone = "primary",
  icon,
  title,
  sub,
}: {
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "accent" | "alert" | "soft" | "pink";
  icon?: ReactNode;
  title: string;
  sub?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-[var(--primary)] text-[var(--primary-ink)]"
      : tone === "accent"
      ? "bg-[var(--accent)] text-white"
      : tone === "alert"
      ? "bg-[var(--alert)] text-white"
      : tone === "pink"
      ? "bg-[var(--pink)] text-[var(--pink-ink)]"
      : "bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)]";
  const content = (
    <div className={`w-full rounded-2xl px-5 py-5 flex items-center gap-4 shadow-sm active:scale-[0.99] transition ${toneClass}`}>
      {icon && <div className="shrink-0 opacity-90">{icon}</div>}
      <div className="text-left">
        <div className="text-lg font-semibold leading-tight">{title}</div>
        {sub && <div className="text-sm opacity-80 leading-snug mt-0.5">{sub}</div>}
      </div>
    </div>
  );
  if (href) return <a href={href} className="block">{content}</a>;
  return <button type="button" onClick={onClick} className="block w-full text-left">{content}</button>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
        {hint && <span className="text-xs text-[var(--ink-soft)]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px] focus:border-[var(--primary)] focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px] min-h-[88px] focus:border-[var(--primary)] focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function Slider0to10({ value, onChange, label }: { value: number | null | undefined; onChange: (n: number | null) => void; label: string }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm tabular-nums text-[var(--ink-soft)]">
          {value == null ? "—" : `${v}/10`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <div className="flex justify-between text-[11px] text-[var(--ink-soft)] px-1">
        <span>none</span>
        <span>worst</span>
      </div>
    </div>
  );
}

export function TagToggles({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              onChange(on ? value.filter((v) => v !== opt) : [...value, opt])
            }
            className={`px-3 py-2 rounded-full text-sm border transition ${
              on
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)]"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function Submit({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-[var(--primary)] text-white font-semibold py-4 text-base disabled:opacity-60 active:scale-[0.99] transition"
    >
      {children}
    </button>
  );
}
