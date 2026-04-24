"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { getInviteStatus, type InviteStatus } from "@/lib/supportStatus";
import { InviteStatusPill } from "@/components/InviteStatusPill";
import { Mail, Send, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Member = { patient_id: string; user_id: string; role: string; display_name?: string | null };
type Invite = { id: string; patient_id: string; email: string; role: string };
type SupportPerson = { id: string; name?: string; phone?: string; email?: string; relationship?: string; isEPOA?: boolean; invited?: boolean };
type ProfileData = { name?: string; supportPeople?: SupportPerson[] };

const ROLE_LABEL: Record<string, string> = { patient: "Patient", support: "Support", doctor: "Doctor" };

export default function Care() {
  const { role, activePatientId } = useSession();
  const sb = supabase();
  const [profile, setProfile] = useState<ProfileData>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [directEmail, setDirectEmail] = useState("");
  const [directRole, setDirectRole] = useState<"support" | "doctor">("support");

  const load = useCallback(async () => {
    if (!sb || !activePatientId) return;
    const [p, m, i] = await Promise.all([
      sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle(),
      sb.from("members").select("*").eq("patient_id", activePatientId),
      sb.from("invites").select("*").eq("patient_id", activePatientId),
    ]);
    setProfile((p.data?.data as ProfileData) ?? {});
    setMembers((m.data as Member[]) ?? []);
    setInvites((i.data as Invite[]) ?? []);
  }, [sb, activePatientId]);

  useEffect(() => { load(); }, [load]);

  const supportPeople = profile.supportPeople ?? [];
  const canInvite = role === "patient" || role === "support";

  const setSupportInvitedFlag = async (id: string, invited: boolean) => {
    if (!sb || !activePatientId) return;
    const next = {
      ...profile,
      supportPeople: supportPeople.map((s) => (s.id === id ? { ...s, invited } : s)),
    };
    setProfile(next);
    await sb.from("patient_profiles").upsert({
      patient_id: activePatientId, data: next, updated_at: new Date().toISOString(),
    });
  };

  const sendInvite = async (opts: { email: string; role: "support" | "doctor"; supportId?: string }) => {
    if (!sb || !activePatientId || !opts.email) return;
    setBusyEmail(opts.email); setMsg(null);
    const email = opts.email.trim().toLowerCase();

    const { error } = await sb.from("invites")
      .upsert({ patient_id: activePatientId, email, role: opts.role }, { onConflict: "patient_id,email" });
    if (error) { setMsg(error.message); setBusyEmail(null); return; }

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, patientName: profile.name ?? "", role: opts.role }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Invite sent to ${email}.`);
      } else {
        setMsg(`Invite saved but email didn't go through: ${data.error}. They can still sign in with ${email} to join.`);
      }
    } catch {
      setMsg(`Invite saved. They can sign in with ${email} to join.`);
    }

    if (opts.supportId) {
      await setSupportInvitedFlag(opts.supportId, true);
    }
    setDirectEmail("");
    setBusyEmail(null);
    load();
  };

  const cancelInvite = async (inv: Invite) => {
    if (!sb) return;
    await sb.from("invites").delete().eq("id", inv.id);
    const match = supportPeople.find((s) => (s.email ?? "").toLowerCase() === inv.email.toLowerCase());
    if (match) await setSupportInvitedFlag(match.id, false);
    load();
  };

  const removeMember = async (uid: string) => {
    if (!sb || !activePatientId) return;
    if (!confirm("Remove this person from the care circle? They'll lose access immediately.")) return;
    await sb.from("members").delete().eq("patient_id", activePatientId).eq("user_id", uid);
    load();
  };

  // Group joined members by role, skip the patient themselves
  const joinedByRole = useMemo(() => {
    const byRole: Record<string, Member[]> = {};
    for (const m of members) {
      if (m.role === "patient") continue;
      byRole[m.role] ??= [];
      byRole[m.role].push(m);
    }
    return byRole;
  }, [members]);

  // Invites without a matching profile supportPerson (direct/legacy invites)
  const orphanInvites = useMemo(
    () => invites.filter((i) => !supportPeople.some((s) => (s.email ?? "").toLowerCase() === i.email.toLowerCase())),
    [invites, supportPeople],
  );

  return (
    <AppShell>
      <PageTitle sub="Invite support people and doctors, track who's joined, and manage the care circle.">
        Care
      </PageTitle>

      {msg && (
        <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-4 py-3 text-sm mb-4">
          {msg}
        </div>
      )}

      {/* Support people — driven off the profile list */}
      <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mt-2 mb-2">
        Support people
      </h2>

      {supportPeople.length === 0 ? (
        <Card className="mb-4">
          <p className="text-sm text-[var(--ink-soft)]">
            Add the people who help you first — carers, family, close friends.
          </p>
          <Link
            href="/profile#supports"
            className="inline-flex items-center gap-2 mt-3 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 text-sm font-medium"
          >
            <UserPlus size={14} /> Add in profile
          </Link>
        </Card>
      ) : (
        <div className="space-y-2 mb-4">
          {supportPeople.map((s) => {
            const status: InviteStatus = getInviteStatus(s, invites);
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {s.name || s.email || "Unnamed"}
                      {s.isEPOA && <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--purple)]">EPOA</span>}
                    </div>
                    <div className="text-xs text-[var(--ink-soft)] truncate">
                      {s.relationship || "—"}
                      {s.email ? ` · ${s.email}` : ""}
                    </div>
                    <div className="mt-2">
                      <InviteStatusPill status={status} />
                    </div>
                  </div>
                </div>
                {canInvite && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {status === "not-invited" && (
                      <button
                        type="button"
                        disabled={!s.email || busyEmail === s.email}
                        onClick={() => sendInvite({ email: s.email!, role: "support", supportId: s.id })}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        <Send size={14} /> {busyEmail === s.email ? "Sending…" : s.email ? "Send invite" : "Add email first"}
                      </button>
                    )}
                    {status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={busyEmail === s.email}
                          onClick={() => sendInvite({ email: s.email!, role: "support", supportId: s.id })}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium"
                        >
                          <Mail size={14} /> {busyEmail === s.email ? "Sending…" : "Resend"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const inv = invites.find((i) => i.email.toLowerCase() === s.email!.toLowerCase());
                            if (inv) cancelInvite(inv);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                        >
                          <Trash2 size={14} /> Cancel
                        </button>
                      </>
                    )}
                    {status === "accepted" && (
                      <span className="text-xs text-[var(--ink-soft)]">
                        They can see your info. Manage access under Care circle below.
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Link
        href="/profile#supports"
        className="block text-sm text-[var(--primary)] font-medium mb-6"
      >
        Edit support people in profile →
      </Link>

      {/* Direct invite (doctor or someone not on the support list yet) */}
      {canInvite && (
        <Card className="mb-6">
          <h3 className="font-semibold mb-1">Invite by email</h3>
          <p className="text-xs text-[var(--ink-soft)] mb-3">
            Use this for doctors, or to pull someone in quickly without editing the profile list first.
          </p>
          <Field label="Email">
            <TextInput type="email" value={directEmail} onChange={(e) => setDirectEmail(e.target.value)} placeholder="friend@example.com" />
          </Field>
          <div className="flex gap-2 my-3">
            {(["support", "doctor"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDirectRole(r)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm border ${directRole === r ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}
              >
                {r === "support" ? "Support (can log)" : "Doctor (read-only)"}
              </button>
            ))}
          </div>
          <Submit
            onClick={() => sendInvite({ email: directEmail, role: directRole })}
            disabled={!directEmail || busyEmail === directEmail}
          >
            {busyEmail === directEmail ? "Sending…" : "Send invite"}
          </Submit>
        </Card>
      )}

      {/* Orphan invites — sent by email but not tied to a profile support person */}
      {orphanInvites.length > 0 && (
        <>
          <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mt-2 mb-2">
            Other pending invites
          </h2>
          <div className="space-y-2 mb-6">
            {orphanInvites.map((i) => (
              <Card key={i.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm truncate">{i.email}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{ROLE_LABEL[i.role] ?? i.role} · waiting for sign-in</div>
                </div>
                {canInvite && (
                  <button onClick={() => cancelInvite(i)} aria-label="Cancel invite" className="text-[var(--ink-soft)] p-1">
                    <Trash2 size={18} />
                  </button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Joined care circle — everyone with access right now */}
      <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mt-2 mb-2">
        Care circle
      </h2>
      {Object.keys(joinedByRole).length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--ink-soft)]">
            No one else has joined yet. Invites appear here once they sign in with the invited email.
          </p>
        </Card>
      ) : (
        <div className="space-y-2 mb-6">
          {(["support", "doctor"] as const).map((r) =>
            (joinedByRole[r] ?? []).map((m) => (
              <Card key={m.user_id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.display_name || m.user_id.slice(0, 8) + "…"}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)]">{ROLE_LABEL[m.role] ?? m.role}</div>
                </div>
                {role === "patient" && (
                  <button onClick={() => removeMember(m.user_id)} aria-label="Remove" className="text-[var(--ink-soft)] p-1">
                    <Trash2 size={18} />
                  </button>
                )}
              </Card>
            )),
          )}
        </div>
      )}
    </AppShell>
  );
}

