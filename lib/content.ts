import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { isR2StoragePath } from "@/lib/r2-paths";
import type { LatestEpisode, MediaKind, MediaTitle } from "@/lib/types";

const demoVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const mediaTitlesTable = process.env.NEXT_PUBLIC_SUPABASE_TITLES_TABLE || "media_titles";
const mediaEpisodesTable = process.env.NEXT_PUBLIC_SUPABASE_EPISODES_TABLE || "media_episodes";
const videoBucket = process.env.NEXT_PUBLIC_SUPABASE_VIDEO_BUCKET || "videos";
const subtitleBucket = process.env.NEXT_PUBLIC_SUPABASE_SUBTITLE_BUCKET || "subtitles";
const imageBucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET || "images";

export const mediaTitles: MediaTitle[] = [
  {
    id: "bleach-tybw",
    slug: "bleach-tybw",
    title: "Bleach: Thousand-Year Blood War",
    originalTitle: "BLEACH 千年血戦篇",
    kind: "anime",
    year: 2024,
    rating: "16+",
    quality: "1080p",
    poster: "/images/bleach.jpg",
    banner: "/images/night-city.jpg",
    synopsis:
      "Сүнсний нийгэмлэгт дахин хар сүүдэр бууж, Ичиго болон холбоотнууд нь удаан мартагдсан дайны үнэнийг нүүр тулна.",
    genres: ["Action", "Supernatural", "Shounen"],
    status: "ongoing",
    featured: true,
    addedAt: "2026-05-17",
    episodes: [
      {
        id: "bleach-01",
        number: 1,
        title: "The Blood Warfare",
        runtime: "24 мин",
        quality: "1080p",
        videoUrl: demoVideo,
        subtitleUrl: "/subtitles/bleach-01.srt",
        thumbnail: "/images/bleach.jpg",
        releasedAt: "2026-05-17"
      },
      {
        id: "bleach-02",
        number: 2,
        title: "Foundation Stones",
        runtime: "24 мин",
        quality: "1080p",
        videoUrl: demoVideo,
        subtitleUrl: "/subtitles/bleach-02.ass",
        thumbnail: "/images/night-city.jpg",
        releasedAt: "2026-05-16"
      },
      {
        id: "bleach-03",
        number: 3,
        title: "March of the Star Cross",
        runtime: "24 мин",
        quality: "1080p",
        videoUrl: demoVideo,
        subtitleUrl: "/subtitles/bleach-03.srt",
        thumbnail: "/images/berserk.jpg",
        releasedAt: "2026-05-15"
      }
    ]
  },
  {
    id: "sakamoto-days",
    slug: "sakamoto-days",
    title: "Sakamoto Days",
    originalTitle: "SAKAMOTO DAYS",
    kind: "anime",
    year: 2025,
    rating: "13+",
    quality: "1080p",
    poster: "/images/sakamoto.jpg",
    banner: "/images/sakamoto.jpg",
    synopsis:
      "Тайван амьдрал сонгосон хуучин алуурчин жижиг дэлгүүрээ хамгаалахын тулд дахин хөдөлгөөнд орно.",
    genres: ["Action", "Comedy", "Slice of Life"],
    status: "ongoing",
    addedAt: "2026-05-15",
    episodes: [
      {
        id: "sakamoto-01",
        number: 1,
        title: "Legendary Hitman",
        runtime: "23 мин",
        quality: "1080p",
        videoUrl: demoVideo,
        subtitleUrl: "/subtitles/sakamoto-01.srt",
        thumbnail: "/images/sakamoto.jpg",
        releasedAt: "2026-05-15"
      },
      {
        id: "sakamoto-02",
        number: 2,
        title: "Vs. Son Hee",
        runtime: "23 мин",
        quality: "1080p",
        videoUrl: demoVideo,
        thumbnail: "/images/sakamoto.jpg",
        releasedAt: "2026-05-12"
      }
    ]
  },
  {
    id: "maquia",
    slug: "maquia",
    title: "Maquia",
    originalTitle: "Sayonara no Asa ni Yakusoku no Hana wo Kazarou",
    kind: "movie",
    year: 2018,
    rating: "13+",
    quality: "1080p",
    poster: "/images/maquia.jpg",
    banner: "/images/maquia.jpg",
    synopsis:
      "Цаг хугацаанаас удаан амьдрах нэгэн охин хүний богинохон амьдрал, гэр бүл, хагацлын утгыг олж мэднэ.",
    genres: ["Drama", "Fantasy", "Movie"],
    status: "completed",
    addedAt: "2026-05-12",
    episodes: [
      {
        id: "maquia-movie",
        number: 1,
        title: "Бүрэн кино",
        runtime: "115 мин",
        quality: "1080p",
        videoUrl: demoVideo,
        subtitleUrl: "/subtitles/maquia-01.srt",
        thumbnail: "/images/maquia.jpg",
        releasedAt: "2026-05-12"
      }
    ]
  },
  {
    id: "princess-mononoke",
    slug: "princess-mononoke",
    title: "Princess Mononoke",
    originalTitle: "もののけ姫",
    kind: "movie",
    year: 1997,
    rating: "13+",
    quality: "1080p",
    poster: "/images/mononoke.jpg",
    banner: "/images/mononoke.jpg",
    synopsis:
      "Ойн сүнс, төмрийн хот, хүн ба байгалийн тэнцвэрийн төлөөх мөргөлдөөн залуу дайчны хувь заяаг өөрчилнө.",
    genres: ["Adventure", "Fantasy", "Classic"],
    status: "completed",
    addedAt: "2026-05-10",
    episodes: [
      {
        id: "mononoke-movie",
        number: 1,
        title: "Бүрэн кино",
        runtime: "134 мин",
        quality: "1080p",
        videoUrl: demoVideo,
        subtitleUrl: "/subtitles/mononoke-01.srt",
        thumbnail: "/images/mononoke.jpg",
        releasedAt: "2026-05-10"
      }
    ]
  },
  {
    id: "berserk-golden-age",
    slug: "berserk-golden-age",
    title: "Berserk: Golden Age",
    originalTitle: "ベルセルク 黄金時代篇",
    kind: "anime",
    year: 2012,
    rating: "18+",
    quality: "720p",
    poster: "/images/berserk.jpg",
    banner: "/images/berserk.jpg",
    synopsis:
      "Хөлсний дайчны ганцаардал, амбиц, нөхөрлөл цуст хувь тавиланд хүргэх харанхуй фэнтези түүх.",
    genres: ["Dark Fantasy", "Action", "Drama"],
    status: "completed",
    addedAt: "2026-05-08",
    episodes: [
      {
        id: "berserk-01",
        number: 1,
        title: "The Egg of the King",
        runtime: "76 мин",
        quality: "720p",
        videoUrl: demoVideo,
        thumbnail: "/images/berserk.jpg",
        releasedAt: "2026-05-08"
      }
    ]
  },
  {
    id: "made-in-abyss",
    slug: "made-in-abyss",
    title: "Made in Abyss",
    originalTitle: "メイドインアビス",
    kind: "anime",
    year: 2022,
    rating: "16+",
    quality: "1080p",
    poster: "/images/abyss.jpg",
    banner: "/images/night-city.jpg",
    synopsis:
      "Үл мэдэгдэх ёроол руу буух аялал гайхамшиг, айдас, нууцлаг үнэнтэй зэрэгцэн үргэлжилнэ.",
    genres: ["Adventure", "Mystery", "Fantasy"],
    status: "ongoing",
    addedAt: "2026-05-05",
    episodes: [
      {
        id: "abyss-01",
        number: 1,
        title: "The Compass Pointed to Darkness",
        runtime: "24 мин",
        quality: "1080p",
        videoUrl: demoVideo,
        thumbnail: "/images/abyss.jpg",
        releasedAt: "2026-05-05"
      }
    ]
  }
];

export async function getAllTitles() {
  return getSupabaseTitles();
}

export async function getFeaturedTitle() {
  const titles = await getAllTitles();
  return titles.find((title) => title.featured && title.episodes.length) ?? titles.find((title) => title.episodes.length) ?? titles[0];
}

export async function getRecentlyAdded(limit = 6) {
  const titles = await getAllTitles();
  return [...titles]
    .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt))
    .slice(0, limit);
}

export async function getMovies(limit?: number) {
  const titles = await getAllTitles();
  const movies = titles
    .filter((title) => title.kind === "movie")
    .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));

  return typeof limit === "number" ? movies.slice(0, limit) : movies;
}

export async function getAnime(limit?: number) {
  const titles = await getAllTitles();
  const anime = titles
    .filter((title) => title.kind === "anime")
    .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));

  return typeof limit === "number" ? anime.slice(0, limit) : anime;
}

export async function getLatestEpisodes(limit = 8): Promise<LatestEpisode[]> {
  const titles = await getAllTitles();
  return titles
    .flatMap((media) =>
      media.episodes.map((episode) => ({
        ...episode,
        mediaSlug: media.slug,
        mediaTitle: media.title,
        poster: media.poster
      }))
    )
    .sort((a, b) => Date.parse(b.releasedAt) - Date.parse(a.releasedAt))
    .slice(0, limit);
}

export async function findTitleBySlug(slug: string) {
  const titles = await getAllTitles();
  return titles.find((title) => title.slug === slug);
}

export async function searchTitles(query: string) {
  const titles = await getAllTitles();
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return titles;
  }

  return titles.filter((title) => {
    const haystack = [
      title.title,
      title.originalTitle,
      title.synopsis,
      title.kind,
      title.genres.join(" ")
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export async function getNextEpisode(slug: string, episodeNumber: number) {
  const media = await findTitleBySlug(slug);
  if (!media) return undefined;
  return media.episodes.find((episode) => episode.number === episodeNumber + 1);
}

type DbTitleRow = {
  id: string;
  slug: string;
  title: string;
  original_title: string | null;
  kind: MediaKind | string | null;
  year: number | null;
  rating: string | null;
  quality: "720p" | "1080p" | string | null;
  poster_path: string | null;
  banner_path: string | null;
  synopsis: string | null;
  genres: string[] | string | null;
  status: "ongoing" | "completed" | string | null;
  featured: boolean | null;
  added_at: string | null;
};

type DbEpisodeRow = {
  id: string;
  media_id: string;
  number: number | null;
  title: string | null;
  runtime: string | null;
  quality: "720p" | "1080p" | string | null;
  video_path: string | null;
  subtitle_path: string | null;
  thumbnail_path: string | null;
  released_at: string | null;
};

async function getSupabaseTitles(): Promise<MediaTitle[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return mediaTitles;

  const [{ data: titleRows, error: titleError }, { data: episodeRows, error: episodeError }] = await Promise.all([
    supabase
      .from(mediaTitlesTable)
      .select(
        "id,slug,title,original_title,kind,year,rating,quality,poster_path,banner_path,synopsis,genres,status,featured,added_at"
      )
      .order("added_at", { ascending: false }),
    supabase
      .from(mediaEpisodesTable)
      .select("id,media_id,number,title,runtime,quality,video_path,subtitle_path,thumbnail_path,released_at")
      .order("number", { ascending: true })
  ]);

  if (titleError || episodeError || !Array.isArray(titleRows)) {
    return mediaTitles;
  }

  if (!titleRows.length) {
    return mediaTitles;
  }

  const episodesByMediaId = new Map<string, DbEpisodeRow[]>();
  for (const episode of (episodeRows ?? []) as DbEpisodeRow[]) {
    const existing = episodesByMediaId.get(episode.media_id) ?? [];
    existing.push(episode);
    episodesByMediaId.set(episode.media_id, existing);
  }

  return (titleRows as DbTitleRow[]).map((title) => {
    const poster = resolveStorageUrl(imageBucket, title.poster_path, "/images/night-city.jpg", supabase);
    const banner = resolveStorageUrl(imageBucket, title.banner_path, poster, supabase);

    return {
      id: String(title.id),
      slug: title.slug,
      title: title.title,
      originalTitle: title.original_title || title.title,
      kind: title.kind === "movie" ? "movie" : "anime",
      year: title.year ?? new Date().getFullYear(),
      rating: title.rating || "13+",
      quality: title.quality === "720p" ? "720p" : "1080p",
      poster,
      banner,
      synopsis: title.synopsis || "Дэлгэрэнгүй тайлбар удахгүй нэмэгдэнэ.",
      genres: normalizeGenres(title.genres),
      status: title.status === "completed" ? "completed" : "ongoing",
      featured: Boolean(title.featured),
      addedAt: title.added_at || new Date().toISOString(),
      episodes: (episodesByMediaId.get(title.id) ?? []).map((episode) => ({
        id: String(episode.id),
        number: episode.number ?? 1,
        title: episode.title || "Анги",
        runtime: episode.runtime || "24 мин",
        quality: episode.quality === "720p" ? "720p" : "1080p",
        videoUrl: resolveStorageUrl(videoBucket, episode.video_path, demoVideo, supabase),
        subtitleUrl: resolveOptionalStorageUrl(subtitleBucket, episode.subtitle_path, supabase),
        thumbnail: resolveStorageUrl(imageBucket, episode.thumbnail_path, poster, supabase),
        releasedAt: episode.released_at || title.added_at || new Date().toISOString()
      }))
    };
  });
}

function resolveStorageUrl(bucket: string, path: string | null, fallback: string, supabase: NonNullable<ReturnType<typeof createPublicSupabaseClient>>) {
  if (!path) return fallback;
  if (isR2StoragePath(path)) return path;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function resolveOptionalStorageUrl(bucket: string, path: string | null, supabase: NonNullable<ReturnType<typeof createPublicSupabaseClient>>) {
  if (!path) return undefined;
  return resolveStorageUrl(bucket, path, "", supabase) || undefined;
}

function normalizeGenres(value: DbTitleRow["genres"]) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean);
  }

  return ["Anime"];
}
