import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { email, patientName, role } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: "Email sending not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hairybuthandled.com";
  const roleLabel = role === "doctor" ? "doctor (read-only)" : "support person (can log)";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
      <div style="background: #000; color: #fff; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 22px; letter-spacing: 0.02em;">Hairy but Handled</h1>
        <p style="margin: 8px 0 0; opacity: 0.7; font-size: 13px;">Notice the Shifts. Act on the Flags.</p>
      </div>

      <h2 style="font-size: 20px; margin: 0 0 12px;">You've been invited</h2>
      <p style="font-size: 15px; color: #444; line-height: 1.6;">
        ${patientName ? `<b>${patientName}</b> has` : "Someone has"} invited you to join their care circle on <b>Hairy but Handled</b> as a <b>${roleLabel}</b>.
      </p>
      <p style="font-size: 15px; color: #444; line-height: 1.6;">
        Hairy but Handled is a cancer care tracking app that helps patients and their support team log symptoms, track treatments, and stay on top of red flags.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}" style="display: inline-block; background: #6366f1; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Open the app and sign in
        </a>
      </div>

      <p style="font-size: 14px; color: #888; line-height: 1.5;">
        Sign in with this email address (<b>${email}</b>) and you'll automatically be added to the care circle. No separate signup needed.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;" />
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        Hairy but Handled — Notice the Shifts. Act on the Flags.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Hairy but Handled" <${gmailUser}>`,
      to: email,
      subject: `${patientName ? patientName + " has" : "You've been"} invited you to their care circle`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
