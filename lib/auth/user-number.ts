import type { SupabaseClient, User } from "@supabase/supabase-js";

export const minUserNumber = 1;
export const maxUserNumber = 10000;

export const profileTableName = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_TABLE || "profiles";

export function formatPublicUserId(userNumber: number) {
  return `#${userNumber}`;
}

export function isValidUserNumber(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= minUserNumber && Number(value) <= maxUserNumber;
}

export function getUserNumberFromMetadata(user: User) {
  const metadataValue = user.user_metadata?.user_number;
  const appMetadataValue = user.app_metadata?.user_number;

  if (isValidUserNumber(metadataValue)) return metadataValue;
  if (typeof metadataValue === "string" && isValidUserNumber(Number(metadataValue))) return Number(metadataValue);
  if (isValidUserNumber(appMetadataValue)) return appMetadataValue;
  if (typeof appMetadataValue === "string" && isValidUserNumber(Number(appMetadataValue))) return Number(appMetadataValue);

  return null;
}

export async function ensureSupabaseUserNumber(supabase: SupabaseClient, user: User) {
  const existing = await supabase
    .from(profileTableName)
    .select("user_number")
    .eq("id", user.id)
    .maybeSingle();

  if (existing.data && isValidUserNumber(existing.data.user_number)) {
    return existing.data.user_number;
  }

  if (existing.error && existing.error.code !== "PGRST116") {
    const metadataNumber = getUserNumberFromMetadata(user);
    if (metadataNumber) return metadataNumber;
  }

  const displayName = getDisplayName(user);

  for (const candidate of createCandidateNumbers()) {
    const insert = await supabase
      .from(profileTableName)
      .insert({
        id: user.id,
        email: user.email,
        display_name: displayName,
        user_number: candidate
      })
      .select("user_number")
      .single();

    if (!insert.error && insert.data && isValidUserNumber(insert.data.user_number)) {
      await supabase.auth.updateUser({
        data: {
          user_number: insert.data.user_number
        }
      });
      return insert.data.user_number;
    }

    if (insert.error?.code === "23505") {
      continue;
    }

    const metadataNumber = getUserNumberFromMetadata(user);
    if (metadataNumber) return metadataNumber;
    throw insert.error ?? new Error("Could not reserve a unique user number.");
  }

  throw new Error("All Lumi+ user IDs from #1 to #10000 are already taken.");
}

function createCandidateNumbers() {
  const candidates = new Set<number>();

  while (candidates.size < 40) {
    candidates.add(randomUserNumber());
  }

  for (let value = minUserNumber; value <= maxUserNumber; value += 1) {
    candidates.add(value);
  }

  return candidates;
}

function randomUserNumber() {
  const range = maxUserNumber - minUserNumber + 1;
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return minUserNumber + (buffer[0] % range);
  }

  return minUserNumber + Math.floor(Math.random() * range);
}

function getDisplayName(user: User) {
  const value = user.user_metadata?.display_name ?? user.user_metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
