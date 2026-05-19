import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { WatchAccessGate } from "@/components/watch-access-gate";
import { WatchExperience } from "@/components/watch-experience";
import { findTitleBySlug } from "@/lib/content";

type WatchPageProps = {
  params: Promise<{
    slug: string;
    episode: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function WatchPage({ params }: WatchPageProps) {
  const { slug, episode } = await params;
  const title = await findTitleBySlug(slug);

  if (!title) {
    notFound();
  }

  const episodeNumber = Number(episode);
  const currentEpisode = title.episodes.find((item) => item.number === episodeNumber);

  if (!currentEpisode) {
    notFound();
  }

  const nextEpisode = title.episodes.find((item) => item.number === currentEpisode.number + 1);

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#050506]">
      <SiteHeader compact />
      <WatchAccessGate freePreview={Boolean(currentEpisode.isFree)}>
        <WatchExperience episode={currentEpisode} media={title} nextEpisode={nextEpisode} />
      </WatchAccessGate>
    </main>
  );
}
