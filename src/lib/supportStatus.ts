export type InviteStatus = "not-invited" | "pending" | "accepted";

type SupportLike = { email?: string; invited?: boolean };

/** Derive a support person's invite state from the pending-invites table plus
 *  the profile's own `invited` flag. The invites row is deleted by the
 *  accept_invites() RPC on sign-in, so: invited=true with no row = accepted;
 *  invited=true with a row = still pending; invited=false = never sent. */
export function getInviteStatus(
  support: SupportLike,
  pendingInvites: readonly { email: string }[],
): InviteStatus {
  if (!support.invited || !support.email) return "not-invited";
  const target = support.email.trim().toLowerCase();
  const stillPending = pendingInvites.some((i) => i.email.toLowerCase() === target);
  return stillPending ? "pending" : "accepted";
}

export const STATUS_LABEL: Record<InviteStatus, string> = {
  "not-invited": "Not invited",
  "pending": "Invited · waiting",
  "accepted": "Joined · can view",
};
