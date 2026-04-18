import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { pendingConfirmations } from "../confirm-patient/route";

// In-memory store for verification codes (in production, use Redis or DB)
const codes = new Map<string, { code: string; expires: number; patientName: string; supportUserId: string }>();

export async function POST(req: NextRequest) {
  const { action, phone, patientEmail, patientName, supportUserId, code, method } = await req.json();

  // Use phone or email as the key
  const key = patientEmail || phone || "";

  if (action === "send") {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    codes.set(key, { code: verificationCode, expires, patientName, supportUserId });

    // Try to send via the chosen method
    if (method === "email" && patientEmail) {
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hairy-but-handled.vercel.app";

      if (gmailUser && gmailPass) {
        try {
          // Generate a confirmation token and store it
          const confirmToken = crypto.randomUUID();
          pendingConfirmations.set(confirmToken, {
            patientName,
            supportUserId,
            patientEmail,
            confirmed: false,
          });

          // Also store the token against the email key so we can poll for it
          codes.set(key, { code: confirmToken, expires, patientName, supportUserId });

          const confirmUrl = `${appUrl}/api/confirm-patient?token=${confirmToken}`;

          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: gmailUser, pass: gmailPass },
          });

          await transporter.sendMail({
            from: `"Hairy but Handled" <${gmailUser}>`,
            to: patientEmail,
            subject: "Confirm your Hairy but Handled account",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                <div style="background: #0d1117; color: #fff; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <h1 style="margin: 0; font-size: 20px;">Hairy but Handled</h1>
                  <p style="margin: 8px 0 0; opacity: 0.7; font-size: 12px;">Patient account confirmation</p>
                </div>
                <p style="font-size: 15px; color: #444; line-height: 1.6;">
                  Someone is setting up a <b>Hairy but Handled</b> account for <b>${patientName || "you"}</b> as a patient.
                </p>
                <p style="font-size: 15px; color: #444; line-height: 1.6;">
                  Hairy but Handled is a cancer care tracking app. By confirming, you consent to this person
                  managing your health information in the app on your behalf.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${confirmUrl}" style="display: inline-block; background: #00c9bd; color: #0d1117; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 18px;">
                    Yes, I confirm
                  </a>
                </div>
                <p style="font-size: 14px; color: #888; line-height: 1.5;">
                  This link expires in 10 minutes. If you did not request this, you can ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="font-size: 12px; color: #aaa; text-align: center;">
                  Hairy but Handled — Notice the Shifts. Act on the Flags.
                </p>
              </div>
            `,
          });

          return NextResponse.json({ ok: true, sent: true, method: "email", token: confirmToken });
        } catch (err) {
          console.error("Email send failed:", err);
          return NextResponse.json({ ok: true, sent: false, code: verificationCode, fallback: true });
        }
      }
    }

    if (method === "sms" && phone) {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

      if (twilioSid && twilioToken && twilioFrom) {
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const body = new URLSearchParams({
            To: phone,
            From: twilioFrom,
            Body: `Your Hairy but Handled verification code is: ${verificationCode}. ${patientName || "Someone"} is being set up as a patient. Share this code to confirm.`,
          });

          await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          });

          return NextResponse.json({ ok: true, sent: true, method: "sms" });
        } catch (err) {
          console.error("Twilio send failed:", err);
          return NextResponse.json({ ok: true, sent: false, code: verificationCode, fallback: true });
        }
      }
    }

    // Fallback — show code on screen for in-person verification
    return NextResponse.json({ ok: true, sent: false, code: verificationCode, fallback: true });
  }

  if (action === "verify") {
    const stored = codes.get(key);
    if (!stored) {
      return NextResponse.json({ error: "No code found. Please request a new one." }, { status: 400 });
    }
    if (Date.now() > stored.expires) {
      codes.delete(key);
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

    // Create a patient user account
    const patientIdentifier = key.includes("@") ? key : `patient_${key.replace(/[^0-9]/g, "")}@hairy-but-handled.local`;

    // Check if patient user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingPatient = existingUsers?.users?.find(
      (u) => u.email === patientIdentifier || u.phone === key || u.email === key
    );

    let patientUserId: string;

    if (existingPatient) {
      patientUserId = existingPatient.id;
    } else {
      // Create the patient user — use email if provided, phone otherwise
      const createParams = key.includes("@")
        ? { email: key, email_confirm: true, user_metadata: { name: stored.patientName, created_by_support: true } }
        : { phone: key, phone_confirm: true, user_metadata: { name: stored.patientName, created_by_support: true } };

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser(createParams);

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

    codes.delete(key);

    return NextResponse.json({ ok: true, patientId: patientUserId });
  }

  if (action === "check") {
    // Poll to see if patient has clicked the confirm link
    const token = code; // reuse the code field for the token
    if (!token) return NextResponse.json({ confirmed: false });
    const entry = pendingConfirmations.get(token);
    if (entry?.confirmed) {
      return NextResponse.json({ confirmed: true });
    }
    return NextResponse.json({ confirmed: false });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
