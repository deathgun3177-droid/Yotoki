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
        className="soft-border group grid grid-cols-[120px_1fr] overflow-hidden rounded-lg bg-white/[0.035] transition hover:border-teal-300/35 hover:bg-white/[0.06] sm:grid-cols-[150px_1fr]"
      >
        <div className="relative aspect-video">
          <Image src={episode.thumbnail || episode.poster} alt="" fill className="object-cover" sizes="150px" />
          <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-black">
              <Play size={17} fill="currentColor" />
            </span>
          </div>
        </div>
        <div className="min-w-0 p-3 sm:p-4">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">{episode.mediaTitle}</p>
          <h3 className="mt-1 truncate font-medium text-white">{episode.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
            <span className="rounded bg-white/8 px-2 py-1 text-slate-300">EP {episode.number}</span>
            <span className="rounded bg-white/8 px-2 py-1 text-slate-300">{episode.quality}</span>
            <span className="rounded bg-amber-300/14 px-2 py-1 text-amber-100">SUB</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
