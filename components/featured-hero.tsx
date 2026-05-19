"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import type { MediaTitle } from "@/lib/types";

export function FeaturedHero({ title }: { title: MediaTitle }) {
  const firstEpisode = title.episodes[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="yotoki-hero relative min-h-80 overflow-hidden rounded-2xl border border-white/10 bg-[#08090d] shadow-2xl shadow-black/30 sm:min-h-[430px] sm:rounded-lg"
    >
      <Image src={title.banner} alt="" fill priority className="object-cover opacity-46" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050506] via-[#050506]/78 to-[#050506]/12" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-transparent to-transparent" />

      <div className="yotoki-hero-content relative z-10 flex min-h-80 max-w-3xl flex-col justify-end p-4 sm:min-h-[430px] sm:p-8 lg:p-10">
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-200 sm:mb-4 sm:gap-2 sm:text-xs sm:tracking-[0.18em]">
          <span className="inline-flex items-center gap-1 rounded-md bg-teal-300/14 px-2 py-1 sm:px-2.5">
            <Sparkles size={12} className="sm:h-3.5 sm:w-3.5" />
            Онцлох
          </span>
          <span className="rounded-md bg-white/10 px-2 py-1 sm:px-2.5">{title.quality}</span>
          <span className="rounded-md bg-amber-300/14 px-2 py-1 text-amber-100 sm:px-2.5">MN хадмал</span>
        </div>

        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-6xl">{title.title}</h1>
        <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-4 sm:line-clamp-none sm:text-base">{title.synopsis}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-3">
          {firstEpisode ? (
            <Link
              href={`/watch/${title.slug}/${firstEpisode.number}`}
              className="yt-focus inline-flex items-center gap-2 rounded-md bg-teal-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-teal-200 sm:px-5 sm:py-3"
            >
              <Play size={17} fill="currentColor" />
              Үзэх
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.055] px-4 py-2.5 text-sm font-semibold text-slate-300 sm:px-5 sm:py-3">
              Анги удахгүй
            </span>
          )}
          <Link
            href={`/title/${title.slug}`}
            className="yt-focus rounded-md border border-white/12 bg-white/[0.055] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-violet-300/50 hover:bg-white/[0.085] sm:px-5 sm:py-3"
          >
            Дэлгэрэнгүй
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
