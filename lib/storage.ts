import type { WatchProgress } from "@/lib/types";

export const progressStorageKey = "yotoki:continue-watching";
const maxSavedItems = 8;
const emptyProgressList: WatchProgress[] = [];

let cachedRawProgress: string | null | undefined;
let cachedProgressList: WatchProgress[] = emptyProgressList;

export function readProgressList(): WatchProgress[] {
  return getProgressSnapshot();
}

export function getServerProgressSnapshot(): WatchProgress[] {
  return emptyProgressList;
}

export function getProgressSnapshot(): WatchProgress[] {
  if (typeof window === "undefined") return emptyProgressList;

  try {
    const raw = window.localStorage.getItem(progressStorageKey);
    if (raw === cachedRawProgress) return cachedProgressList;

    cachedRawProgress = raw;

    if (!raw) {
      cachedProgressList = emptyProgressList;
      return cachedProgressList;
    }

    const parsed = JSON.parse(raw) as WatchProgress[];

    cachedProgressList = Array.isArray(parsed) ? dedupeProgress(parsed) : emptyProgressList;
    return cachedProgressList;
  } catch {
    cachedProgressList = emptyProgressList;
    return cachedProgressList;
  }
}

export function upsertProgress(progress: WatchProgress) {
  if (typeof window === "undefined") return;

  const current = readProgressList().filter(
    (item) => item.mediaSlug !== progress.mediaSlug || item.episodeNumber !== progress.episodeNumber
  );
  const next = [progress, ...current]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, maxSavedItems);

  cachedProgressList = next;
  cachedRawProgress = JSON.stringify(next);
  window.localStorage.setItem(progressStorageKey, JSON.stringify(next));
  window.dispatchEvent(new Event(progressStorageKey));
}

export function findProgress(mediaSlug: string, episodeId: string, episodeNumber?: number) {
  return readProgressList().find(
    (item) =>
      item.mediaSlug === mediaSlug &&
      (item.episodeId === episodeId || (typeof episodeNumber === "number" && item.episodeNumber === episodeNumber))
  );
}

function dedupeProgress(items: WatchProgress[]) {
  const byEpisode = new Map<string, WatchProgress>();

  for (const item of items) {
    const key = `${item.mediaSlug}:${item.episodeNumber}`;
    const existing = byEpisode.get(key);

    if (!existing || Date.parse(item.updatedAt) > Date.parse(existing.updatedAt)) {
      byEpisode.set(key, item);
    }
  }

  return [...byEpisode.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, maxSavedItems);
}
