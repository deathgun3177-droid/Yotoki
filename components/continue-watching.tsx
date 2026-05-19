"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getProgressSnapshot, getServerProgressSnapshot, progressStorageKey } from "@/lib/storage";

export function ContinueWatching() {
  const items = useSyncExternalStore(subscribeToProgress, getProgressSnapshot, getServerProgressSnapshot);

  if (!items.length) {
    return (
      <div className="soft-border rounded-lg bg-white/[0.035] p-6 text-sm text-slate-400">
        Одоогоор үзэж эхэлсэн анги алга.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {items.slice(0, 4).map((item) => {
        const percent = item.duration > 0 ? Math.min(100, Math.round((item.currentTime / item.duration) * 100)) : 0;

        return (
          <Link
            className="soft-border group overflow-hidden rounded-lg bg-white/[0.035] transition hover:border-teal-300/35 hover:bg-white/[0.06]"
            href={`/watch/${item.mediaSlug}/${item.episodeNumber}`}
            key={`${item.mediaSlug}-${item.episodeNumber}`}
          >
            <div className="relative aspect-video">
              <Image src={item.poster} alt="" fill className="object-cover transition duration-300 group-hover:scale-[1.03]" sizes="(max-width: 1024px) 50vw, 25vw" />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <div className="h-full bg-teal-300" style={{ width: `${percent}%` }} />
              </div>
            </div>
            <div className="p-2.5 sm:p-3">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200 sm:text-xs sm:tracking-[0.16em]">EP {item.episodeNumber}</p>
              <h3 className="mt-1 truncate text-sm font-medium text-white sm:text-base">{item.mediaTitle}</h3>
              <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">{item.episodeTitle}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function subscribeToProgress(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(progressStorageKey, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(progressStorageKey, callback);
  };
}
