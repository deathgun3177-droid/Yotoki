import type { YotokiUser } from "@/lib/types";

export const watchAccessDays = 30;

export function hasActiveWatchAccess(user: YotokiUser | null) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!user.watchAccessExpiresAt) return false;

  return Date.parse(user.watchAccessExpiresAt) > Date.now();
}

export function addWatchAccessDays(user: YotokiUser, days = watchAccessDays): YotokiUser {
  const currentExpiry = user.watchAccessExpiresAt ? Date.parse(user.watchAccessExpiresAt) : 0;
  const startsAt = Number.isFinite(currentExpiry) && currentExpiry > Date.now() ? currentExpiry : Date.now();
  const nextExpiry = new Date(startsAt + days * 24 * 60 * 60 * 1000).toISOString();

  return {
    ...user,
    watchAccessExpiresAt: nextExpiry
  };
}

export function removeWatchAccess(user: YotokiUser): YotokiUser {
  return {
    ...user,
    watchAccessExpiresAt: undefined
  };
}

export function formatAccessStatus(user: YotokiUser) {
  if (user.role === "admin") return "Admin";
  if (!user.watchAccessExpiresAt) return "Эрхгүй";

  const expiresAt = Date.parse(user.watchAccessExpiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return "Дууссан";

  const remainingDays = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
  return `${remainingDays} хоног үлдсэн`;
}
