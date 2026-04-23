/** POST /api/push/send
 *
 *  Body: { patient_id: string, title: string, body: string, url?: string, tag?: string }
 *
 *  Authenticated via the Supabase access token forwarded in the Authorization
 *  header. The server verifies the caller is a member of the given patient,
 *  then fans out Web Push + email to every other member of the support circle.
 *
 *  Requires env vars:
 *    NEXT_PUBLIC_SUPABASE_URL
 *    SUPABASE_SERVICE_ROLE_KEY           (server-only, bypasses RLS)
 *    VAPID_PUBLIC_KEY                    (must match NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 *    VAPID_PRIVATE_KEY                   (keep secret)
 *    VAPID_SUBJECT                       (e.g. "mailto:hairybuthandled@gmail.com")
 *    GMAIL_USER, GMAIL_APP_PASSWORD      (already configured for invites)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import webpush from "web-push";

type SendBody = {
  patient_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  let payload: SendBody;
  try {
    payload = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { patient_id, title, body, url, tag } = payload;
  if (!patient_id || !title) {
    return NextResponse.json({ error: "patient_id and title required" }, { status: 400 });
  }

  // Authenticate the caller via their forwarded access token.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const sb = admin();
  const { data: callerData, error: callerErr } = await sb.auth.getUser(token);
  if (callerErr || !callerData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const callerId = callerData.user.id;

  // Confirm the caller is a member of this patient.
  const { data: callerMembership } = await sb
    .from("members")
    .select("patient_id,user_id,role")
    .eq("patient_id", patient_id)
    .eq("user_id", callerId)
    .maybeSingle();
  if (!callerMembership) {
    return NextResponse.json({ error: "Not a member of that patient" }, { status: 403 });
  }

  // All OTHER members of the circle — the caller doesn't need to be notified.
  const { data: members } = await sb
    .from("members")
    .select("user_id,role")
    .eq("patient_id", patient_id);
  const recipients = (members ?? []).filter((m) => m.user_id !== callerId);
  if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const recipientIds = recipients.map((r) => r.user_id);

  // Pull push subs + auth emails for all recipients in parallel.
  const [subsRes, usersRes] = await Promise.all([
    sb.from("push_subscriptions").select("user_id,endpoint,p256dh,auth").in("user_id", recipientIds),
    sb.auth.admin.listUsers(),
  ]);

  const subscriptions = subsRes.data ?? [];
  const usersById = new Map<string, { email: string | null }>();
  for (const u of usersRes.data?.users ?? []) {
    usersById.set(u.id, { email: u.email ?? null });
  }

  // Configure web-push
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hairybuthandled@gmail.com";
  if (pub && priv) webpush.setVapidDetails(subject, pub, priv);

  const pushPayload = JSON.stringify({
    title,
    body,
    url: url ?? "/",
    tag: tag ?? "hbh-flag",
    requireInteraction: true,
  });

  let pushOk = 0;
  let pushFail = 0;
  const usersWithPush = new Set<string>();

  // Fan out pushes in parallel. Clean up expired subscriptions (410/404) as we go.
  await Promise.all(
    subscriptions.map(async (s) => {
      usersWithPush.add(s.user_id);
      if (!pub || !priv) { pushFail += 1; return; }
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          pushPayload,
        );
        pushOk += 1;
      } catch (err) {
        pushFail += 1;
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          // Subscription is gone — forget it.
          await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }),
  );

  // Email fallback: any recipient who has no push subscription gets an email.
  const emailRecipients: string[] = [];
  for (const r of recipients) {
    if (usersWithPush.has(r.user_id)) continue;
    const email = usersById.get(r.user_id)?.email;
    if (email) emailRecipients.push(email);
  }

  let emailOk = 0;
  if (emailRecipients.length > 0) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailUser && gmailPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });
      const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://hairybuthandled.com"}${url ?? "/"}`;
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <div style="background:#b91c1c;color:#fff;border-radius:12px;padding:16px;text-align:center;margin-bottom:16px;">
            <div style="font-size:12px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.8;">Hairy but Handled</div>
            <div style="font-size:18px;font-weight:700;margin-top:4px;">${escapeHtml(title)}</div>
          </div>
          <p style="font-size:15px;color:#222;line-height:1.55;">${escapeHtml(body)}</p>
          <p style="margin-top:18px;">
            <a href="${link}" style="display:inline-block;padding:10px 18px;background:#00c9bd;color:#0d1117;text-decoration:none;border-radius:10px;font-weight:600;">Open the app</a>
          </p>
          <p style="font-size:11px;color:#888;margin-top:22px;">
            You're receiving this because you're in the care circle for a Hairy but Handled patient.
            Enable push notifications on your phone in Settings → Notifications to get these on your
            lock screen instead.
          </p>
        </div>
      `;
      await Promise.all(
        emailRecipients.map(async (to) => {
          try {
            await transporter.sendMail({
              from: `Hairy but Handled <${gmailUser}>`,
              to,
              subject: title,
              text: body,
              html,
            });
            emailOk += 1;
          } catch {
            // swallow — don't block response
          }
        }),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    pushOk,
    pushFail,
    emailOk,
    emailRecipients: emailRecipients.length,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
