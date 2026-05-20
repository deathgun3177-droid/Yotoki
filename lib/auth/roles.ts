import type { User } from "@supabase/supabase-js";

const demoAdminEmails = ["admin@yotoki.local"];

export function getUserRole(email?: string | null, metadataRole?: unknown): "user" | "admin" {
  if (metadataRole === "admin") {
    return "admin";
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return "user";
  }

  return getAdminEmails().has(normalizedEmail) ? "admin" : "user";
}

export function getSupabaseUserRole(user: User) {
  return getUserRole(user.email, user.app_metadata?.role);
}

function getAdminEmails() {
  const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...demoAdminEmails, ...envEmails]);
}
