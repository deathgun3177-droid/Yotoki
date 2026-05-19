import { ContinueWatching } from "@/components/continue-watching";
import { FeaturedHero } from "@/components/featured-hero";
import { LatestEpisodeRow } from "@/components/latest-episode-row";
import { MediaCard } from "@/components/media-card";
import { SiteHeader } from "@/components/site-header";
import { getFeaturedTitle, getLatestEpisodes, getRecentlyAdded } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featured, recentlyAdded, latestEpisodes] = await Promise.all([
    getFeaturedTitle(),
    getRecentlyAdded(),
    getLatestEpisodes()
  ]);

  return (
    <main className="cinema-shell min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#050506]">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-4 sm:gap-10 sm:px-6 sm:pb-16 lg:px-8">
        <FeaturedHero title={featured} />

        <section id="recently" className="space-y-4">
          <SectionHeader title="Шинээр нэмэгдсэн" meta={`${recentlyAdded.length} гарчиг`} />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            {recentlyAdded.map((title) => (
              <MediaCard key={title.id} title={title} />
            ))}
          </div>
        </section>

        <section id="latest" className="space-y-4">
          <SectionHeader title="Сүүлд гарсан ангиуд" meta="Монгол хадмал" />
          <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
            {latestEpisodes.map((episode) => (
              <LatestEpisodeRow episode={episode} key={`${episode.mediaSlug}-${episode.id}`} />
            ))}
          </div>
        </section>

        <section id="continue" className="space-y-4">
          <SectionHeader title="Үргэлжлүүлэн үзэх" meta="Таны төхөөрөмж дээр" />
          <ContinueWatching />
        </section>
      </div>
    </main>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
      <span className="shrink-0 text-sm font-medium uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">{meta}</span>
    </div>
  );
}
