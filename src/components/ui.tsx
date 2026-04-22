"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

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
  tone?: "primary" | "accent" | "alert" | "soft" | "pink" | "blue" | "purple";
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
      : tone === "blue"
      ? "bg-[var(--blue)] text-[var(--blue-ink)]"
      : tone === "purple"
      ? "bg-[var(--purple)] text-[var(--purple-ink)]"
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
      spellCheck
      autoCorrect="on"
      {...props}
      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px] focus:border-[var(--primary)] focus:outline-none ${props.className ?? ""}`}
    />
  );
}

/**
 * DateInput — type-the-digits experience for dates.
 *
 * Accepts ISO (yyyy-mm-dd) as the source-of-truth `value` and emits ISO back
 * via `onChange`. Display format is DD/MM/YYYY (Australian).
 *
 * Typing digits auto-inserts "/" separators after day and month.
 * On blur, any missing parts default to today's values (e.g. "15" → "15/04/2026"
 * if today is 15 April 2026; "15/06" → "15/06/2026"). Empty stays empty.
 */
type DateChangeLike = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

export function DateInput({ value, onChange, placeholder = "DD/MM/YYYY", className = "", ...rest }: {
  value?: string; // yyyy-mm-dd (ISO) or "" — same API as <input type="date">
  onChange: (e: DateChangeLike) => void;
  placeholder?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [display, setDisplay] = useState(isoToDdmmyyyy(value));

  // Sync when value prop changes from outside (e.g. restored draft)
  useEffect(() => {
    setDisplay((prev) => {
      const incoming = isoToDdmmyyyy(value);
      // Don't clobber the user's in-progress typing if it already matches the incoming ISO
      const prevIso = ddmmyyyyToIso(prev);
      if (prevIso && prevIso === (value ?? "")) return prev;
      return incoming;
    });
  }, [value]);

  const emit = (iso: string) => {
    // Callers typed with ChangeEvent<HTMLInputElement> (or wider) only read e.target.value.
    onChange({ target: { value: iso } } as unknown as DateChangeLike);
  };

  const handleChange = (raw: string) => {
    // Keep only digits and slashes, re-format
    const digits = raw.replace(/[^\d]/g, "").slice(0, 8);
    let out = digits;
    if (digits.length >= 3) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    if (digits.length >= 5) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    setDisplay(out);

    // Emit ISO only when we have a complete valid date
    const iso = ddmmyyyyToIso(out);
    if (iso) emit(iso);
    else if (!out) emit("");
  };

  const handleBlur = () => {
    if (!display.trim()) {
      emit("");
      return;
    }
    const filled = fillMissingWithToday(display);
    setDisplay(filled);
    const iso = ddmmyyyyToIso(filled);
    if (iso) emit(iso);
  };

  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    // Sync the native picker's value so it opens on the currently-typed date (or today).
    const iso = ddmmyyyyToIso(display);
    el.value = iso ?? "";
    // Modern browsers: programmatic open. Fallback to focus+click for older ones.
    const withPicker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof withPicker.showPicker === "function") {
      try { withPicker.showPicker(); return; } catch {}
    }
    el.focus();
    el.click();
  };

  const onPickerChange = (iso: string) => {
    if (!iso) return;
    setDisplay(isoToDdmmyyyy(iso));
    emit(iso);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={10}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-3.5 pr-11 py-3 text-[16px] focus:border-[var(--primary)] focus:outline-none"
        {...rest}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Open calendar picker"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[var(--ink-soft)] hover:text-[var(--ink)] active:bg-[var(--surface-soft)]"
        tabIndex={-1}
      >
        <CalendarIcon size={18} />
      </button>
      {/* Hidden native date input used only to surface the OS calendar picker. */}
      <input
        ref={pickerRef}
        type="date"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => onPickerChange(e.target.value)}
        className="sr-only absolute right-0 top-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}

function isoToDdmmyyyy(iso?: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso; // let through non-ISO input unchanged
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function ddmmyyyyToIso(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const day = Number(m[1]); const mon = Number(m[2]); const year = Number(m[3]);
  if (mon < 1 || mon > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2200) return null;
  const d = new Date(Date.UTC(year, mon - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== mon - 1 || d.getUTCDate() !== day) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function fillMissingWithToday(display: string): string {
  const today = new Date();
  const tD = String(today.getDate()).padStart(2, "0");
  const tM = String(today.getMonth() + 1).padStart(2, "0");
  const tY = String(today.getFullYear());
  const parts = display.split("/");
  let d = (parts[0] ?? "").padStart(2, "0").slice(0, 2);
  let mo = (parts[1] ?? "").padStart(2, "0").slice(0, 2);
  let y = parts[2] ?? "";
  if (!d || d === "00") d = tD;
  if (!mo || mo === "00") mo = tM;
  if (!y) y = tY;
  if (y.length === 2) y = tY.slice(0, 2) + y;
  if (y.length === 1) y = tY.slice(0, 3) + y;
  return `${d}/${mo}/${y}`;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      spellCheck
      autoCorrect="on"
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
