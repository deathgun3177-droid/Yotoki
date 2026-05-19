export type MediaKind = "anime" | "movie";

export type Episode = {
  id: string;
  number: number;
  title: string;
  runtime: string;
  quality: "720p" | "1080p";
  videoUrl: string;
  subtitleUrl?: string;
  thumbnail: string;
  releasedAt: string;
};

export type MediaTitle = {
  id: string;
  slug: string;
  title: string;
  originalTitle: string;
  kind: MediaKind;
  year: number;
  rating: string;
  quality: "720p" | "1080p";
  poster: string;
  banner: string;
  synopsis: string;
  genres: string[];
  status: "ongoing" | "completed";
  featured?: boolean;
  addedAt: string;
  episodes: Episode[];
};

export type LatestEpisode = Episode & {
  mediaSlug: string;
  mediaTitle: string;
  poster: string;
};

export type WatchProgress = {
  mediaSlug: string;
  mediaTitle: string;
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  poster: string;
  currentTime: number;
  duration: number;
  updatedAt: string;
};

export type AdminUploadDraft = {
  type?: "title" | "episode";
  kind?: MediaKind;
  title: string;
  mediaSlug?: string;
  synopsis?: string;
  genres?: string;
  year?: number;
  runtime?: string;
  quality?: "720p" | "1080p";
  episodeNumber?: number;
  videoName?: string;
  subtitleName?: string;
  posterName?: string;
  createdAt: string;
};

export type PaymentSettings = {
  monthlyPrice: string;
  accessDays: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  updatedAt?: string;
};

export type YotokiUser = {
  id: string;
  userNumber: number;
  email: string;
  role: "user" | "admin";
  watchAccessExpiresAt?: string;
  displayName?: string;
  provider: "supabase" | "local";
  createdAt?: string;
};
