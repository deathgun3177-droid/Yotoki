"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { MediaTitle } from "@/lib/types";

export function MediaCard({ title }: { title: MediaTitle }) {
  const latest = title.episodes.at(-1);

  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.18 }} className="group">
      <Link className="yt-focus block rounded-lg" href={`/title/${title.slug}`}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
          <Image
            src={title.poster}
            alt={title.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 180px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/12 to-transparent opacity-92" />
          <div className="absolute left-2 top-2 flex gap-1.5">
            <span className="rounded bg-black/66 px-1.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
              {title.quality}
            </span>
            <span className="rounded bg-teal-300/20 px-1.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-teal-100 backdrop-blur">
              MN
            </span>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <span className="rounded bg-violet-300/18 px-1.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-100 backdrop-blur">
              {latest ? `EP ${latest.number}` : title.kind}
            </span>
          </div>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white">{title.title}</h3>
        <p className="mt-1 truncate text-xs text-slate-500">{title.genres.slice(0, 2).join(" • ")}</p>
      </Link>
    </motion.article>
  );
}
