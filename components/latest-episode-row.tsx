"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { LatestEpisode } from "@/lib/types";

export function LatestEpisodeRow({ episode }: { episode: LatestEpisode }) {
  return (
    <motion.article whileHover={{ x: 3 }} transition={{ duration: 0.16 }}>
      <Link
        href={`/watch/${episode.mediaSlug}/${episode.number}`}
        className="soft-border group relative grid grid-cols-[104px_minmax(0,1fr)] overflow-hidden rounded-lg bg-white/[0.035] transition hover:border-teal-300/35 hover:bg-white/[0.06] sm:grid-cols-[150px_1fr]"
      >
        {episode.isFree ? (
          <span className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-amber-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black shadow-lg shadow-amber-300/20">
            ҮНЭГҮЙ
          </span>
        ) : null}
        <div className="relative aspect-video bg-black/30">
          <Image
            src={episode.thumbnail || episode.poster}
            alt=""
            fill
            className="object-cover"
            sizes="150px"
            style={{ objectPosition: "center 62%" }}
          />
          <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-black">
              <Play size={17} fill="currentColor" />
            </span>
          </div>
        </div>
        <div className="min-w-0 p-2.5 sm:p-4">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200 sm:text-xs sm:tracking-[0.16em]">{episode.mediaTitle}</p>
          <h3 className="mt-1 truncate text-sm font-medium text-white sm:text-base">{episode.title}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">{episode.runtime}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] sm:mt-3 sm:gap-2 sm:text-[11px] sm:tracking-[0.12em]">
            <span className="rounded bg-white/8 px-2 py-1 text-slate-300">EP {episode.number}</span>
            <span className="rounded bg-white/8 px-2 py-1 text-slate-300">{episode.quality}</span>
            <span className="rounded bg-amber-300/14 px-2 py-1 text-amber-100">SUB</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
