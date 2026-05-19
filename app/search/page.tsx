import { MediaCard } from "@/components/media-card";
import { SiteHeader } from "@/components/site-header";
import { searchTitles } from "@/lib/content";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const results = await searchTitles(q);

  return (
    <main className="cinema-shell min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#050506]">
      <SiteHeader initialQuery={q} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-teal-200/70">Хайлт</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {q ? `"${q}"` : "Бүх гарчиг"}
            </h1>
          </div>
          <p className="text-sm text-slate-400">{results.length} илэрц</p>
        </div>

        {results.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((title) => (
              <MediaCard key={title.id} title={title} />
            ))}
          </div>
        ) : (
          <div className="soft-border rounded-lg bg-white/[0.035] p-8 text-center text-slate-400">
            Илэрц олдсонгүй.
          </div>
        )}
      </div>
    </main>
  );
}
