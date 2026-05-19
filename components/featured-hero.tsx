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
      className="relative min-h-[430px] overflow-hidden rounded-lg border border-white/10 bg-[#08090d] shadow-2xl shadow-black/30"
    >
      <Image src={title.banner} alt="" fill priority className="object-cover opacity-46" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050506] via-[#050506]/78 to-[#050506]/12" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-transparent to-transparent" />

      <div className="relative z-10 flex min-h-[430px] max-w-3xl flex-col justify-end p-5 sm:p-8 lg:p-10">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">
          <span className="inline-flex items-center gap-1 rounded-md bg-teal-300/14 px-2.5 py-1">
            <Sparkles size={14} />
            Онцлох
          </span>
          <span className="rounded-md bg-white/10 px-2.5 py-1">{title.quality}</span>
          <span className="rounded-md bg-amber-300/14 px-2.5 py-1 text-amber-100">MN хадмал</span>
        </div>

        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">{title.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{title.synopsis}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {firstEpisode ? (
            <Link
              href={`/watch/${title.slug}/${firstEpisode.number}`}
              className="yt-focus inline-flex items-center gap-2 rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-teal-200"
            >
              <Play size={18} fill="currentColor" />
              Үзэх
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-semibold text-slate-300">
              Анги удахгүй
            </span>
          )}
          <Link
            href={`/title/${title.slug}`}
            className="yt-focus rounded-md border border-white/12 bg-white/[0.055] px-5 py-3 text-sm font-semibold text-white transition hover:border-violet-300/50 hover:bg-white/[0.085]"
          >
            Дэлгэрэнгүй
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
