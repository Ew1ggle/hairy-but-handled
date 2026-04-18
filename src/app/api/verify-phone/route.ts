import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// In-memory store for verification codes (in production, use Redis or DB)
const codes = new Map<string, { code: string; expires: number; patientName: string; supportUserId: string }>();

export async function POST(req: NextRequest) {
  const { action, phone, patientName, supportUserId, code } = await req.json();

  if (action === "send") {
    // Generate a 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store the code
    codes.set(phone, { code: verificationCode, expires, patientName, supportUserId });

    // Send SMS via the configured provider
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      // Send via Twilio
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const body = new URLSearchParams({
          To: phone,
          From: twilioFrom,
          Body: `Your Hairy but Handled verification code is: ${verificationCode}. ${patientName || "Someone"} is being set up as a patient by a support person. Enter this code to confirm.`,
        });

        await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        return NextResponse.json({ ok: true, sent: true });
      } catch (err) {
        console.error("Twilio send failed:", err);
        return NextResponse.json({ ok: true, sent: false, code: verificationCode, fallback: true });
      }
    } else {
      // No Twilio configured — return the code for manual verification
      // In production this should always use SMS
      return NextResponse.json({ ok: true, sent: false, code: verificationCode, fallback: true });
    }
  }

  if (action === "verify") {
    const stored = codes.get(phone);
    if (!stored) {
      return NextResponse.json({ error: "No code found. Please request a new one." }, { status: 400 });
    }
    if (Date.now() > stored.expires) {
      codes.delete(phone);
      return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
    }
    if (stored.code !== code) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
    }

    // Code is correct — create the patient account
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create a patient user account linked to the phone number
    // We use the phone as a unique identifier and create an email-like address
    const patientEmail = `patient_${phone.replace(/[^0-9]/g, "")}@hairy-but-handled.local`;

    // Check if patient user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingPatient = existingUsers?.users?.find(
      (u) => u.phone === phone || u.email === patientEmail
    );

    let patientUserId: string;

    if (existingPatient) {
      patientUserId = existingPatient.id;
    } else {
      // Create the patient user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        phone,
        phone_confirm: true,
        user_metadata: { name: stored.patientName, created_by_support: true },
      });

      if (createError) {
        console.error("Failed to create patient user:", createError);
        return NextResponse.json({ error: "Failed to create patient account" }, { status: 500 });
      }
      patientUserId = newUser.user.id;
    }

    // Add patient as a member (patient role)
    await adminClient.from("members").upsert(
      { patient_id: patientUserId, user_id: patientUserId, role: "patient" },
      { onConflict: "patient_id,user_id" }
    );

    // Add support person as a member
    await adminClient.from("members").upsert(
      { patient_id: patientUserId, user_id: stored.supportUserId, role: "support" },
      { onConflict: "patient_id,user_id" }
    );

    // Create initial patient profile with the name
    await adminClient.from("patient_profiles").upsert(
      { patient_id: patientUserId, data: { name: stored.patientName }, updated_at: new Date().toISOString() },
      { onConflict: "patient_id" }
    );

    // Clean up the code
    codes.delete(phone);

    return NextResponse.json({ ok: true, patientId: patientUserId });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
