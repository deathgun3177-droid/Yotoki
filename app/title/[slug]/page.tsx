import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Star } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { findTitleBySlug } from "@/lib/content";

type DetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function DetailPage({ params }: DetailPageProps) {
  const { slug } = await params;
  const title = await findTitleBySlug(slug);

  if (!title) {
    notFound();
  }

  const firstEpisode = title.episodes[0];

  return (
    <main className="min-h-screen bg-[#050506]">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={title.banner} alt="" fill priority className="object-cover opacity-34" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-[#050506]/72 to-[#050506]/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050506] via-[#050506]/52 to-transparent" />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[230px_1fr] lg:px-8 lg:pb-14">
          <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-lg shadow-2xl shadow-black/50 sm:w-56 lg:w-full">
            <Image src={title.poster} alt={title.title} fill priority className="object-cover" sizes="(max-width: 1024px) 14rem, 230px" />
          </div>

          <div className="flex max-w-3xl flex-col justify-end">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge>{title.kind === "anime" ? "Аниме" : "Кино"}</Badge>
              <Badge>{title.quality}</Badge>
              <Badge>MN</Badge>
              <Badge>{title.rating}</Badge>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">{title.title}</h1>
            <p className="mt-2 text-sm text-slate-400">{title.originalTitle} • {title.year}</p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">{title.synopsis}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {title.genres.map((genre) => (
                <span className="rounded-md bg-white/8 px-3 py-1.5 text-sm text-slate-300" key={genre}>
                  {genre}
                </span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {firstEpisode ? (
                <Link
                  className="yt-focus inline-flex items-center gap-2 rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-teal-200"
                  href={`/watch/${title.slug}/${firstEpisode.number}`}
                >
                  <Play size={18} fill="currentColor" />
                  Үзэх
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-semibold text-slate-300">
                  Анги нэмэгдээгүй
                </span>
              )}
              <div className="soft-border inline-flex items-center gap-2 rounded-md bg-black/30 px-4 py-3 text-sm text-slate-300">
                <Star size={17} className="text-amber-300" />
                {title.episodes.length} анги
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-white">Ангиуд</h2>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {title.status === "ongoing" ? "Үргэлжилж байна" : "Дууссан"}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {title.episodes.length ? (
            title.episodes.map((episode) => (
              <Link
                className="soft-border group grid min-h-[96px] grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-lg bg-white/[0.035] transition hover:border-teal-300/40 hover:bg-white/[0.06] sm:grid-cols-[140px_minmax(0,1fr)]"
                href={`/watch/${title.slug}/${episode.number}`}
                key={episode.id}
              >
                <div className="relative h-full min-h-[96px] w-full overflow-hidden bg-white/[0.04]">
                  <Image src={episode.thumbnail} alt="" fill className="object-cover" sizes="(max-width: 640px) 112px, 140px" />
                  <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                    <Play size={22} fill="white" className="text-white" />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col justify-center p-4">
                  <h3 className="truncate font-semibold text-white">{episode.number}-р анги</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                    <span className="rounded bg-white/8 px-2 py-1 text-slate-300">{episode.quality}</span>
                    {episode.subtitleUrl ? <span className="rounded bg-teal-300/14 px-2 py-1 text-teal-100">MN</span> : null}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="soft-border rounded-lg bg-white/[0.035] p-8 text-center text-slate-400 md:col-span-2">
              Одоогоор анги нэмэгдээгүй байна.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-100">{children}</span>;
}
