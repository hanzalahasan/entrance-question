// Profile updates (name + photo). Reads happen in the auth context; this handles
// writes. Photos go to the public `avatars` Storage bucket.

import { supabase } from "@/lib/supabase";

export async function updateProfileName(
  userId: string,
  fullName: string
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", userId);
}

/** Upload an avatar image, store its public URL on the profile, return the URL. */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  if (!supabase) throw new Error("Not configured.");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  // Stable path per user so re-uploads overwrite; cache-bust on read.
  const path = `${userId}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw new Error(upErr.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  await supabase
    .from("profiles")
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return url;
}
