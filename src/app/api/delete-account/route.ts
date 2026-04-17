import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server not configured for account deletion" }, { status: 500 });
  }

  // Use service role client to bypass RLS and delete the auth user
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the request is from the user themselves by checking the auth header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

  if (authError || !user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete all data first (using service role to bypass RLS)
  const patientId = userId; // patient_id = user_id for patient role

  await adminClient.from("entries").delete().eq("patient_id", patientId);
  await adminClient.from("invites").delete().eq("patient_id", patientId);
  await adminClient.from("members").delete().eq("patient_id", patientId);
  await adminClient.from("patient_profiles").delete().eq("patient_id", patientId);
  await adminClient.from("consent_records").delete().eq("user_id", userId);

  // Delete storage files
  const { data: files } = await adminClient.storage.from("attachments").list(patientId);
  if (files && files.length > 0) {
    await adminClient.storage.from("attachments").remove(files.map((f) => `${patientId}/${f.name}`));
  }

  // Delete the auth user
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("Failed to delete auth user:", deleteError);
    return NextResponse.json({ error: "Failed to delete auth user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
