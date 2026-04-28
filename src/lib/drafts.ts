"use client";
import { useEffect, useRef } from "react";

const INDEX_KEY = "hbh:drafts:index";

export type DraftMeta = {
  key: string;
  href: string;
  title: string;
  patientId: string;
  updatedAt: string;
};

type StoredDraft<T> = {
  meta: DraftMeta;
  data: T;
};

function storageKey(key: string, patientId: string): string {
  return `hbh:draft:${patientId}:${key}`;
}

function readJson<T>(k: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(k: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, JSON.stringify(value));
  } catch {
    // quota full or JSON error — silently drop
  }
}

function readIndex(): DraftMeta[] {
  return readJson<DraftMeta[]>(INDEX_KEY) ?? [];
}

function writeIndex(list: DraftMeta[]): void {
  writeJson(INDEX_KEY, list);
}

export function saveDraft<T>(params: {
  key: string;
  href: string;
  title: string;
  patientId: string;
  data: T;
}): void {
  const meta: DraftMeta = {
    key: params.key,
    href: params.href,
    title: params.title,
    patientId: params.patientId,
    updatedAt: new Date().toISOString(),
  };
  const stored: StoredDraft<T> = { meta, data: params.data };
  writeJson(storageKey(params.key, params.patientId), stored);
  const index = readIndex().filter((m) => !(m.key === params.key && m.patientId === params.patientId));
  index.push(meta);
  writeIndex(index);
}

export function loadDraft<T>(key: string, patientId: string): StoredDraft<T> | null {
  return readJson<StoredDraft<T>>(storageKey(key, patientId));
}

export function clearDraft(key: string, patientId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(key, patientId));
  } catch {}
  const index = readIndex().filter((m) => !(m.key === key && m.patientId === patientId));
  writeIndex(index);
}

export function listDrafts(patientId: string): DraftMeta[] {
  return readIndex().filter((m) => m.patientId === patientId);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function isValueEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    // Treat arrays of empties (e.g. [""], [{}, ""]) as empty too — forms
    // often initialise array fields with one empty placeholder row, and
    // the difference matters for draft auto-save: if the user discards,
    // we don't want isEmptyState to keep returning false just because
    // doctors=[""] still has length 1.
    return v.every(isValueEmpty);
  }
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    return Object.values(obj).every(isValueEmpty);
  }
  return false;
}

function isEmptyState(state: Record<string, unknown>): boolean {
  return Object.values(state).every(isValueEmpty);
}

/**
 * useDraft — persists an in-progress form to localStorage.
 *
 * On mount, if a saved draft exists for this (key, patientId), calls onRestore once.
 * Whenever `state` changes, debounce-writes it to localStorage.
 * Caller must invoke the returned `clear()` on successful submit.
 *
 * `enabled` should be false when editing an existing DB row — autosave to DB handles that.
 */
export function useDraft<T extends Record<string, unknown>>(opts: {
  key: string;
  href: string;
  title: string;
  patientId: string | null;
  state: T;
  onRestore: (data: T) => void;
  enabled?: boolean;
  debounceMs?: number;
}): { clear: () => void } {
  const { key, href, title, patientId, state, onRestore, enabled = true, debounceMs = 1500 } = opts;
  const restored = useRef(false);
  const lastSaved = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore once per mount
  useEffect(() => {
    if (!enabled || !patientId || restored.current) return;
    const existing = loadDraft<T>(key, patientId);
    restored.current = true;
    if (existing && !isEmptyState(existing.data as Record<string, unknown>)) {
      lastSaved.current = existing.data;
      onRestore(existing.data);
    }
  }, [key, patientId, enabled, onRestore]);

  // Debounced save on state change
  useEffect(() => {
    if (!enabled || !patientId) return;
    if (!restored.current) return; // wait for restore pass to run first
    if (isEmptyState(state)) return;
    if (deepEqual(state, lastSaved.current)) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveDraft({ key, href, title, patientId, data: state });
      lastSaved.current = state;
    }, debounceMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [state, key, href, title, patientId, enabled, debounceMs]);

  const clear = () => {
    if (!patientId) return;
    clearDraft(key, patientId);
    lastSaved.current = null;
  };

  return { clear };
}
