import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Shared pending confirmations store (same instance as verify-phone uses)
// In production, use a database table instead of in-memory
const pending = globalThis as unknown as { _pendingConfirmations?: Map<string, { patientName: string; supportUserId: string; patientEmail: string; confirmed: boolean }> };
if (!pending._pendingConfirmations) pending._pendingConfirmations = new Map();
export const pendingConfirmations = pending._pendingConfirmations;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(errorPage("Missing confirmation token."), { headers: { "Content-Type": "text/html" } });
  }

  const entry = pendingConfirmations.get(token);
  if (!entry) {
    return new NextResponse(errorPage("This confirmation link has expired or already been used."), { headers: { "Content-Type": "text/html" } });
  }

  // Mark as confirmed
  entry.confirmed = true;

  // Create the patient account
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new NextResponse(errorPage("Server configuration error."), { headers: { "Content-Type": "text/html" } });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if patient user already exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingPatient = existingUsers?.users?.find((u) => u.email === entry.patientEmail);

  let patientUserId: string;

  if (existingPatient) {
    patientUserId = existingPatient.id;
  } else {
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: entry.patientEmail,
      email_confirm: true,
      user_metadata: { name: entry.patientName, created_by_support: true },
    });

    if (createError) {
      return new NextResponse(errorPage("Failed to create your account. Please ask your support person to try again."), { headers: { "Content-Type": "text/html" } });
    }
    patientUserId = newUser.user.id;
  }

  // Add patient as member
  await adminClient.from("members").upsert(
    { patient_id: patientUserId, user_id: patientUserId, role: "patient" },
    { onConflict: "patient_id,user_id" }
  );

  // Add support person as member
  await adminClient.from("members").upsert(
    { patient_id: patientUserId, user_id: entry.supportUserId, role: "support" },
    { onConflict: "patient_id,user_id" }
  );

  // Create initial profile
  await adminClient.from("patient_profiles").upsert(
    { patient_id: patientUserId, data: { name: entry.patientName }, updated_at: new Date().toISOString() },
    { onConflict: "patient_id" }
  );

  // Clean up (leave it for a bit so the polling can detect it)
  setTimeout(() => pendingConfirmations.delete(token), 60000);

  return new NextResponse(successPage(entry.patientName), { headers: { "Content-Type": "text/html" } });
}

function successPage(name: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmed — Hairy but Handled</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f8fa;color:#0d1a2a}
.box{max-width:400px;text-align:center;padding:40px 24px}
h1{font-size:24px;color:#00c9bd;margin:0 0 12px}
p{font-size:15px;color:#4a5e6d;line-height:1.6}
.check{font-size:48px;margin-bottom:16px}</style></head>
<body><div class="box">
<div class="check">&#10003;</div>
<h1>Confirmed</h1>
<p><b>${name}</b>, your support person can now set up and manage your Hairy but Handled account on your behalf.</p>
<p style="margin-top:16px;font-size:13px;color:#8ba8b0">You can close this page. Your support person's screen will update automatically.</p>
</div></body></html>`;
}

function errorPage(message: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Error — Hairy but Handled</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f8fa;color:#0d1a2a}
.box{max-width:400px;text-align:center;padding:40px 24px}
h1{font-size:24px;color:#8b0000;margin:0 0 12px}
p{font-size:15px;color:#4a5e6d;line-height:1.6}</style></head>
<body><div class="box">
<h1>Something went wrong</h1>
<p>${message}</p>
</div></body></html>`;
}
