import { MediaCard } from "@/components/media-card";
import { SiteHeader } from "@/components/site-header";
import { getMovies } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const movies = await getMovies();

  return (
    <main className="cinema-shell min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#050506]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-teal-200/70">YotoKi</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Кино</h1>
          </div>
          <p className="text-sm text-slate-400">{movies.length} кино</p>
        </div>

        {movies.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
            {movies.map((title) => (
              <MediaCard key={title.id} title={title} />
            ))}
          </div>
        ) : (
          <div className="soft-border rounded-lg bg-white/[0.035] p-8 text-center text-slate-400">
            Одоогоор кино нэмэгдээгүй байна.
          </div>
        )}
      </div>
    </main>
  );
}
