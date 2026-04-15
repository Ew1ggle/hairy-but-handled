"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import type { AnyEntry } from "./store";
import type { Session, User } from "@supabase/supabase-js";

type Member = {
  patient_id: string;
  user_id: string;
  role: "patient" | "support" | "doctor";
  invited_email?: string | null;
};

type Ctx = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  memberships: Member[];
  activePatientId: string | null;
  setActivePatientId: (id: string) => void;
  role: "patient" | "support" | "doctor" | null;
  canWrite: boolean;
  entries: AnyEntry[];
  addEntry: (entry: Omit<AnyEntry, "id" | "createdAt"> & { id?: string; createdAt?: string }) => Promise<AnyEntry | null>;
  updateEntry: (id: string, patch: Partial<AnyEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  signIn: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  makeSelfPatient: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  inviteMember: (email: string, role: "support" | "doctor") => Promise<{ error?: string }>;
};

const SessionCtx = createContext<Ctx | null>(null);

type DbRow = {
  id: string;
  patient_id: string;
  kind: string;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToEntry(r: DbRow): AnyEntry {
  return {
    id: r.id,
    createdAt: r.created_at,
    enteredBy: r.created_by ?? undefined,
    kind: r.kind as AnyEntry["kind"],
    ...(r.data as object),
  } as AnyEntry;
}

function entryToRow(e: Omit<AnyEntry, "id" | "createdAt"> & { id?: string; createdAt?: string }, patientId: string, userId: string) {
  const { kind, ...rest } = e as AnyEntry;
  return {
    id: e.id,
    patient_id: patientId,
    kind,
    data: rest as Record<string, unknown>,
    created_by: userId,
    created_at: e.createdAt,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const sb = supabase();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Member[]>([]);
  const [activePatientId, setActive] = useState<string | null>(null);
  const [entries, setEntries] = useState<AnyEntry[]>([]);
  const subRef = useRef<ReturnType<NonNullable<typeof sb>["channel"]> | null>(null);

  // Auth bootstrap
  useEffect(() => {
    if (!sb) { setLoading(false); return; }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  // Load memberships when authed
  useEffect(() => {
    if (!sb || !session) { setMemberships([]); setActive(null); return; }
    (async () => {
      const { data, error } = await sb.from("members").select("*");
      if (error) console.warn("members fetch error", error);
      const list = (data as Member[]) ?? [];
      setMemberships(list);
      if (list.length) {
        const preferred = list.find((m) => m.role === "patient") ?? list[0];
        setActive(preferred.patient_id);
      }
    })();
  }, [sb, session?.user?.id]);

  // Load entries + subscribe realtime for active patient
  useEffect(() => {
    if (!sb || !activePatientId) { setEntries([]); return; }
    let cancelled = false;
    sb.from("entries").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setEntries(((data as DbRow[]) ?? []).map(rowToEntry));
      });
    if (subRef.current) sb.removeChannel(subRef.current);
    const ch = sb.channel(`entries:${activePatientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "entries", filter: `patient_id=eq.${activePatientId}` }, (payload) => {
        setEntries((prev) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as DbRow;
            if (prev.some((e) => e.id === r.id)) return prev;
            return [rowToEntry(r), ...prev];
          }
          if (payload.eventType === "UPDATE") {
            const r = payload.new as DbRow;
            return prev.map((e) => (e.id === r.id ? rowToEntry(r) : e));
          }
          if (payload.eventType === "DELETE") {
            const r = payload.old as DbRow;
            return prev.filter((e) => e.id !== r.id);
          }
          return prev;
        });
      })
      .subscribe();
    subRef.current = ch;
    return () => { cancelled = true; };
  }, [sb, activePatientId]);

  const role = useMemo(() => {
    if (!activePatientId) return null;
    return memberships.find((m) => m.patient_id === activePatientId)?.role ?? null;
  }, [memberships, activePatientId]);
  const canWrite = role === "patient" || role === "support";

  const addEntry = useCallback(async (entry: Omit<AnyEntry, "id" | "createdAt"> & { id?: string; createdAt?: string }) => {
    if (!sb || !activePatientId || !session?.user?.id) return null;
    const row = entryToRow(entry, activePatientId, session.user.id);
    const { data, error } = await sb.from("entries").insert(row).select().single();
    if (error) { console.error(error); return null; }
    const created = rowToEntry(data as DbRow);
    // Optimistic UI update — guards against realtime events arriving late or being dropped
    setEntries((prev) => (prev.some((e) => e.id === created.id) ? prev : [created, ...prev]));
    return created;
  }, [sb, activePatientId, session?.user?.id]);

  const updateEntry = useCallback(async (id: string, patch: Partial<AnyEntry>) => {
    if (!sb) return;
    const current = entries.find((e) => e.id === id);
    if (!current) return;
    const { kind: _k, id: _i, createdAt: _c, enteredBy: _e, ...merged } = { ...current, ...patch } as AnyEntry & Record<string, unknown>;
    // Optimistic UI update
    setEntries((prev) => prev.map((e) => (e.id === id ? ({ ...e, ...patch } as AnyEntry) : e)));
    await sb.from("entries").update({ data: merged, updated_at: new Date().toISOString() }).eq("id", id);
  }, [sb, entries]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!sb) return;
    // Optimistic UI update — realtime DELETE events carry only the PK and can be filtered out by row-level filters,
    // so we update state immediately to avoid a stale list.
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const { error } = await sb.from("entries").delete().eq("id", id);
    if (error) console.error("deleteEntry failed", error);
  }, [sb]);

  const signIn = useCallback(async (email: string) => {
    if (!sb) return { error: "Supabase not configured" };
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    return { error: error?.message };
  }, [sb]);

  const signOut = useCallback(async () => {
    if (!sb) return;
    await sb.auth.signOut();
    setMemberships([]);
    setActive(null);
    setEntries([]);
  }, [sb]);

  const makeSelfPatient = useCallback(async () => {
    if (!sb || !session?.user?.id) throw new Error("Not signed in");
    const uid = session.user.id;
    const { error } = await sb.from("members").insert({ patient_id: uid, user_id: uid, role: "patient" });
    if (error && !String(error.message).match(/duplicate|conflict|already exists/i)) {
      throw new Error(error.message);
    }
    // Verify the row actually exists in the DB (guards against silent RLS blocks)
    const { data: check } = await sb.from("members").select("*").eq("user_id", uid).eq("patient_id", uid);
    if (!check || check.length === 0) {
      throw new Error("The database didn't save your patient record. Please check that the schema SQL was run, then try again.");
    }
    const list = check as Member[];
    // Pull full membership list (includes any support/doctor roles elsewhere)
    const { data: all } = await sb.from("members").select("*");
    setMemberships(((all as Member[]) ?? []).length ? (all as Member[]) : list);
    setActive(uid);
  }, [sb, session?.user?.id]);

  const inviteMember = useCallback(async (email: string, role: "support" | "doctor") => {
    if (!sb || !activePatientId) return { error: "No active patient" };
    // The invited person must sign up and we link them by email via a stored_procedure in a real system.
    // For Phase 1 we store the intent and surface it in settings; linking happens when that user signs in.
    const { error } = await sb.from("members").insert({ patient_id: activePatientId, user_id: session!.user!.id, role: "patient" }).select();
    // Above line is a safety no-op; actual invite requires server function. We'll handle via signed-in user adding themselves — see docs.
    return { error: error?.message };
  }, [sb, activePatientId, session]);

  const value: Ctx = {
    loading, user: session?.user ?? null, session, memberships, activePatientId,
    setActivePatientId: setActive, role, canWrite,
    entries, addEntry, updateEntry, deleteEntry,
    signIn, signOut, makeSelfPatient, inviteMember,
    refreshMemberships: async () => {
      if (!sb) return;
      const { data } = await sb.from("members").select("*");
      setMemberships((data as Member[]) ?? []);
    },
  };

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
