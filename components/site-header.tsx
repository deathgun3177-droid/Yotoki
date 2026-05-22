"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn, Search, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type SiteHeaderProps = {
  initialQuery?: string;
  compact?: boolean;
};

export function SiteHeader({ initialQuery = "", compact = false }: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const authHref = user ? "/profile" : "/auth";
  const showBackButton = pathname !== "/";

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 max-w-[100vw] overflow-x-hidden border-b border-white/8 bg-[#050506]/86 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 overflow-hidden px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:flex-row lg:items-center lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {showBackButton ? (
              <button
                type="button"
                aria-label="Буцах"
                title="Буцах"
                onClick={handleBack}
                className="yt-focus grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-teal-300/40 hover:text-white sm:h-9 sm:w-9"
              >
                <ArrowLeft size={17} />
              </button>
            ) : null}
            <Link className="yt-focus flex items-center gap-3 rounded-md" href="/">
              <span className="relative h-9 w-9 overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_28px_rgba(168,85,247,0.32)] sm:h-10 sm:w-10">
                <Image src="/images/lumi-icon-192.png" alt="Lumi+ logo" fill priority className="object-cover" sizes="40px" />
              </span>
              <span className="text-lg font-black tracking-tight text-white sm:text-xl">Lumi+</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href={authHref}
              className="yt-focus inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-teal-300/40 hover:text-white sm:h-9 sm:w-9"
              aria-label={user ? "Profile" : "Sign in"}
            >
              {user ? <UserRound size={16} /> : <LogIn size={16} />}
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative min-w-0 flex-1 lg:mx-5 lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Аниме, кино хайх"
            className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-white/[0.055] pl-10 pr-3 text-sm text-white placeholder:text-slate-500 transition focus:border-teal-300/45 lg:h-10"
          />
        </form>

        <nav
          className={`w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 text-sm text-slate-300 [scrollbar-width:none] lg:w-auto lg:gap-2 lg:overflow-visible lg:pb-0 ${
            compact ? "hidden lg:flex" : "flex"
          }`}
        >
          <Link className="yt-focus rounded-md px-2.5 py-2 transition hover:bg-white/8 hover:text-white lg:px-3" href="/#recently">
            Шинэ
          </Link>
          <Link className="yt-focus rounded-md px-2.5 py-2 transition hover:bg-white/8 hover:text-white lg:px-3" href="/anime">
            Аниме
          </Link>
          <Link className="yt-focus rounded-md px-2.5 py-2 transition hover:bg-white/8 hover:text-white lg:px-3" href="/movies">
            Кино
          </Link>
          <Link className="yt-focus rounded-md px-2.5 py-2 transition hover:bg-white/8 hover:text-white lg:px-3" href="/info">
            Мэдээлэл
          </Link>
          <Link
            className="yt-focus hidden items-center gap-2 rounded-md px-2.5 py-2 transition hover:bg-white/8 hover:text-white lg:inline-flex lg:px-3"
            href={authHref}
          >
            {user ? <UserRound size={16} /> : <LogIn size={16} />}
            {loading ? "..." : user ? "Профайл" : "Нэвтрэх"}
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
