"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "./session";
import { supabase } from "./supabase";

export type UserProfile = {
  name?: string;
  preferredName?: string;
  phone?: string;
  relationshipDefault?: string;
  pronouns?: string;
  howToReach?: string;
  whatToTellMe?: string;
  notesForSupporters?: string;
};

/** User-scoped profile (distinct from the clinical patient_profiles).
 *  Used by support people to store their own name, contact, and preferences.
 *  Save() upserts a single row keyed by auth user id. */
export function useUserProfile() {
  const { user } = useSession();
  const sb = supabase();
  const [profile, setProfile] = useState<UserProfile>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!sb || !user?.id) return;
    sb.from("user_profiles").select("data").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        setProfile((data?.data as UserProfile) ?? {});
        setLoaded(true);
      });
  }, [sb, user?.id]);

  const save = useCallback(async (next: UserProfile) => {
    if (!sb || !user?.id) return false;
    setProfile(next);
    const { error } = await sb.from("user_profiles").upsert({
      user_id: user.id, data: next, updated_at: new Date().toISOString(),
    });
    return !error;
  }, [sb, user?.id]);

  return { profile, loaded, save };
}

/** Read-only hook for showing a greeting ("Welcome back, Sam") on any page.
 *  Falls back to email-derived first word when no name is set yet. */
export function useGreetingName(): string {
  const { user } = useSession();
  const { profile } = useUserProfile();
  if (profile.preferredName?.trim()) return profile.preferredName.trim();
  if (profile.name?.trim()) return profile.name.split(" ")[0];
  const email = user?.email ?? "";
  const local = email.split("@")[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
}
