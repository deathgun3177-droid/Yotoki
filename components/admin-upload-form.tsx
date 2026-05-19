"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, FileText, ImageIcon, Library, UploadCloud, Video } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminUploadDraft, MediaKind } from "@/lib/types";
import { mediaTitles } from "@/lib/content";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { filenamesMatch } from "@/lib/subtitles";

type UploadState = "idle" | "uploading" | "done" | "error";

type AdminMediaOption = {
  id: string;
  slug: string;
  title: string;
  kind: MediaKind;
  quality: "720p" | "1080p";
  posterPath?: string | null;
  bannerPath?: string | null;
};

const titlesTable = process.env.NEXT_PUBLIC_SUPABASE_TITLES_TABLE || "media_titles";
const episodesTable = process.env.NEXT_PUBLIC_SUPABASE_EPISODES_TABLE || "media_episodes";
const imageBucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET || "images";

export function AdminUploadForm() {
  const [mediaKind, setMediaKind] = useState<MediaKind>("anime");
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genres, setGenres] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [quality, setQuality] = useState<"720p" | "1080p">("1080p");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [titleStatus, setTitleStatus] = useState<UploadState>("idle");
  const [titleMessage, setTitleMessage] = useState("");

  const [mediaOptions, setMediaOptions] = useState<AdminMediaOption[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [episodeStatus, setEpisodeStatus] = useState<UploadState>("idle");
  const [episodeMessage, setEpisodeMessage] = useState("");

  const configured = isSupabaseConfigured();
  const selectedMedia = useMemo(
    () => mediaOptions.find((option) => option.id === selectedMediaId),
    [mediaOptions, selectedMediaId]
  );
  const matchedNames = useMemo(
    () => filenamesMatch(videoFile?.name, subtitleFile?.name),
    [subtitleFile?.name, videoFile?.name]
  );

  const applyMediaOptions = useCallback((options: AdminMediaOption[]) => {
    setMediaOptions(options);
    setSelectedMediaId((current) => current || options[0]?.id || "");
  }, []);

  const loadMediaOptions = useCallback(async () => {
    if (!configured) {
      const localOptions = readLocalMediaOptions();
      const demoOptions = mediaTitles.map((media) => ({
        id: media.id,
        slug: media.slug,
        title: media.title,
        kind: media.kind,
        quality: media.quality
      }));
      applyMediaOptions([...localOptions, ...demoOptions]);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from(titlesTable)
      .select("id,slug,title,kind,quality,poster_path,banner_path")
      .order("added_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      setEpisodeMessage(error?.message ?? "Гарчигууд уншиж чадсангүй.");
      return;
    }

    applyMediaOptions(
      data.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title),
        kind: row.kind === "movie" ? "movie" : "anime",
        quality: row.quality === "720p" ? "720p" : "1080p",
        posterPath: typeof row.poster_path === "string" ? row.poster_path : null,
        bannerPath: typeof row.banner_path === "string" ? row.banner_path : null
      }))
    );
  }, [applyMediaOptions, configured]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadMediaOptions();
    });
  }, [loadMediaOptions]);

  async function handleTitleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTitleMessage("");

    if (!title.trim()) {
      setTitleStatus("error");
      setTitleMessage("Anime/кино нэр шаардлагатай.");
      return;
    }

    setTitleStatus("uploading");

    try {
      const slug = slugify(title);

      if (!configured) {
        const option = {
          id: slug,
          slug,
          title: title.trim(),
          kind: mediaKind,
          quality
        };
        saveLocalMediaOption(option);
        saveLocalDraft({
          type: "title",
          kind: mediaKind,
          title,
          synopsis: synopsis.trim() || undefined,
          genres: genres.trim() || undefined,
          year,
          quality,
          posterName: posterFile?.name,
          createdAt: new Date().toISOString()
        });
        await loadMediaOptions();
        setSelectedMediaId(option.id);
        setTitleStatus("done");
        setTitleMessage("Supabase тохиргоо байхгүй тул гарчигийн draft хадгалагдлаа.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Supabase client үүссэнгүй.");

      const { data: existingTitle, error: existingTitleError } = await supabase
        .from(titlesTable)
        .select("id,poster_path,banner_path")
        .eq("slug", slug)
        .maybeSingle();

      if (existingTitleError) throw existingTitleError;

      if (!existingTitle && !posterFile) {
        setTitleStatus("error");
        setTitleMessage("Шинэ гарчиг үүсгэхэд poster зураг хэрэгтэй.");
        return;
      }

      let posterPath = getPathValue(existingTitle, "poster_path");
      if (posterFile) {
        posterPath = `${slug}/poster-${cleanFileName(posterFile.name)}`;
        const posterUpload = await supabase.storage.from(imageBucket).upload(posterPath, posterFile, { upsert: true });
        if (posterUpload.error) throw posterUpload.error;
      }

      const payload = {
        slug,
        title: title.trim(),
        original_title: title.trim(),
        kind: mediaKind,
        year: normalizeYear(year),
        rating: "13+",
        quality,
        poster_path: posterPath,
        banner_path: posterPath ?? getPathValue(existingTitle, "banner_path"),
        synopsis: synopsis.trim() || "Тайлбар удахгүй нэмэгдэнэ.",
        genres: genresToArray(genres, mediaKind),
        status: mediaKind === "movie" ? "completed" : "ongoing",
        added_at: new Date().toISOString()
      };

      const result = existingTitle
        ? await supabase.from(titlesTable).update(payload).eq("id", getPathValue(existingTitle, "id")).select("id").single()
        : await supabase.from(titlesTable).insert(payload).select("id").single();

      if (result.error) throw result.error;

      await loadMediaOptions();
      setSelectedMediaId(String(result.data.id));
      setTitleStatus("done");
      setTitleMessage("Гарчигийн мэдээлэл хадгалагдлаа.");
    } catch (error) {
      setTitleStatus("error");
      setTitleMessage(error instanceof Error ? error.message : "Гарчиг хадгалж чадсангүй.");
    }
  }

  async function handleEpisodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEpisodeMessage("");

    if (!selectedMedia || !videoFile) {
      setEpisodeStatus("error");
      setEpisodeMessage("Гарчиг сонгоод видео файл оруулна уу.");
      return;
    }

    setEpisodeStatus("uploading");

    try {
      if (!configured) {
        saveLocalDraft({
          type: "episode",
          title: selectedMedia.title,
          mediaSlug: selectedMedia.slug,
          episodeNumber,
          videoName: videoFile.name,
          subtitleName: subtitleFile?.name,
          createdAt: new Date().toISOString()
        });
        setEpisodeStatus("done");
        setEpisodeMessage("Supabase тохиргоо байхгүй тул ангийн draft хадгалагдлаа.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Supabase client үүссэнгүй.");

      const episodePath = `${selectedMedia.slug}/episode-${episodeNumber}`;
      const videoPath = `${episodePath}/${cleanFileName(videoFile.name)}`;
      const videoStoragePath = await uploadFileToR2(supabase, videoFile, videoPath);

      let subtitlePath: string | null = null;
      if (subtitleFile) {
        const subtitleKey = `${episodePath}/${cleanFileName(subtitleFile.name)}`;
        subtitlePath = await uploadFileToR2(supabase, subtitleFile, subtitleKey);
      }

      const episodeUpsert = await supabase.from(episodesTable).upsert(
        {
          media_id: selectedMedia.id,
          number: episodeNumber,
          title: selectedMedia.kind === "movie" ? "Бүрэн кино" : `Анги ${episodeNumber}`,
          runtime: "24 мин",
          quality: selectedMedia.quality,
          video_path: videoStoragePath,
          subtitle_path: subtitlePath,
          thumbnail_path: null,
          released_at: new Date().toISOString()
        },
        { onConflict: "media_id,number" }
      );

      if (episodeUpsert.error) throw episodeUpsert.error;

      setEpisodeStatus("done");
      setEpisodeMessage(`${selectedMedia.title} дээр ${episodeNumber}-р анги нэмэгдлээ.`);
      setVideoFile(null);
      setSubtitleFile(null);
    } catch (error) {
      setEpisodeStatus("error");
      setEpisodeMessage(error instanceof Error ? error.message : "Анги нэмэж чадсангүй.");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form onSubmit={handleTitleSubmit} className="soft-border rounded-lg bg-white/[0.035] p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-teal-300/14 text-teal-100">
            <Library size={20} />
          </span>
          <div>
            <h2 className="font-semibold text-white">Гарчигийн мэдээлэл</h2>
            <p className="text-sm text-slate-500">Poster, тайлбар, genres, year.</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-white/10 bg-black/24 p-1">
          {mediaKindOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMediaKind(option.value)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                mediaKind === option.value ? "bg-teal-300 text-black" : "text-slate-300 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Title" value={title} onChange={setTitle} placeholder="Жишээ: Bleach" />
          <NumberField label="Year" value={year} min={1900} onChange={setYear} />
          <QualityPicker value={quality} onChange={setQuality} />
          <TextField label="Genres" value={genres} onChange={setGenres} placeholder="Action, Drama, Fantasy" />
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Synopsis</span>
          <textarea
            value={synopsis}
            onChange={(event) => setSynopsis(event.target.value)}
            className="yt-focus min-h-24 w-full resize-y rounded-lg border border-white/10 bg-black/24 px-3 py-3 text-sm text-white focus:border-teal-300/45"
            placeholder="Товч тайлбар"
          />
        </label>

        <div className="mt-5">
          <FileDrop icon={<ImageIcon size={20} />} label="Poster / cover зураг" accept="image/*" file={posterFile} onChange={setPosterFile} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SubmitButton loading={titleStatus === "uploading"} label="Гарчиг хадгалах" loadingLabel="Хадгалж байна" />
          {titleMessage ? <StatusMessage status={titleStatus} message={titleMessage} /> : null}
        </div>
      </form>

      <form onSubmit={handleEpisodeSubmit} className="soft-border min-w-0 overflow-hidden rounded-lg bg-white/[0.035] p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-violet-300/14 text-violet-100">
            <Video size={20} />
          </span>
          <div>
            <h2 className="font-semibold text-white">Анги нэмэх</h2>
            <p className="text-sm text-slate-500">Гарчиг сонгоод video/subtitle нэмнэ.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MediaPicker options={mediaOptions} value={selectedMediaId} onChange={setSelectedMediaId} />
          <NumberField label="Episode number" value={episodeNumber} min={1} onChange={setEpisodeNumber} />
          <div className="rounded-lg bg-black/20 p-3 text-sm">
            <p className="text-slate-500">Гарах нэр</p>
            <p className="mt-1 font-semibold text-white">
              {selectedMedia?.kind === "movie" ? "Бүрэн кино" : `${episodeNumber || 1}-р анги`}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <FileDrop icon={<Video size={20} />} label="Upload video" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv" file={videoFile} onChange={setVideoFile} />
          <FileDrop icon={<FileText size={20} />} label="Upload subtitle" accept=".srt,.ass,.vtt" file={subtitleFile} onChange={setSubtitleFile} />
        </div>

        <div className="mt-5 grid gap-3 text-sm">
          <StatusRow active={Boolean(selectedMedia)} label={selectedMedia?.title || "Гарчиг сонгох"} />
          <StatusRow active={Boolean(videoFile)} label={videoFile?.name || "Video"} />
          <StatusRow active={Boolean(subtitleFile)} label={subtitleFile?.name || "Subtitle"} />
          <StatusRow active={matchedNames} label="Filename match" />
          <StatusRow active={configured} label="Supabase connected" />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SubmitButton loading={episodeStatus === "uploading"} label="Анги нэмэх" loadingLabel="Нэмж байна" />
          {episodeMessage ? <StatusMessage status={episodeStatus} message={episodeMessage} /> : null}
        </div>
      </form>
    </div>
  );
}

const mediaKindOptions: { value: MediaKind; label: string }[] = [
  { value: "anime", label: "Аниме" },
  { value: "movie", label: "Кино" }
];

function TextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
        placeholder={placeholder}
      />
    </label>
  );
}

function QualityPicker({
  value,
  onChange
}: {
  value: "720p" | "1080p";
  onChange: (value: "720p" | "1080p") => void;
}) {
  return (
    <div className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">Quality</span>
      <div className="grid h-11 grid-cols-2 rounded-lg border border-white/10 bg-black/24 p-1">
        {(["1080p", "720p"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-md px-3 text-sm font-semibold transition ${
              value === option ? "bg-teal-300 text-black" : "text-slate-300 hover:bg-white/8 hover:text-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function MediaPicker({
  options,
  value,
  onChange
}: {
  options: AdminMediaOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }

  return (
    <div className="relative block sm:col-span-2" ref={wrapperRef} onBlur={handleBlur}>
      <span className="mb-2 block text-sm font-medium text-slate-300">Anime / кино сонгох</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="yt-focus flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/24 px-3 text-left text-sm text-white transition hover:border-teal-300/35 focus:border-teal-300/45"
      >
        <span className="min-w-0 truncate">{selected?.title || "Гарчиг сонгох"}</span>
        <ChevronDown size={17} className={`shrink-0 text-slate-500 transition ${open ? "rotate-180 text-teal-200" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-auto rounded-lg border border-teal-300/25 bg-[#08090b] p-1 shadow-2xl shadow-black/70">
          {options.length ? (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                  option.id === value ? "bg-teal-300 text-black" : "text-slate-200 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="min-w-0 truncate">{option.title}</span>
                <span className={`shrink-0 text-xs font-semibold ${option.id === value ? "text-black/70" : "text-slate-500"}`}>
                  {option.kind === "movie" ? "Кино" : "Аниме"}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-sm text-slate-500">Гарчиг алга байна.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        value={value}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
      />
    </label>
  );
}

function FileDrop({
  icon,
  label,
  accept,
  file,
  onChange
}: {
  icon: React.ReactNode;
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  return (
    <label className="soft-border grid w-full min-w-0 cursor-pointer grid-cols-[40px_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-lg bg-black/18 p-4 transition hover:border-teal-300/35 hover:bg-white/[0.055]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/8 text-teal-100">{icon}</span>
      <span className="block min-w-0 overflow-hidden">
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block max-w-full truncate text-sm text-slate-500">{file?.name || accept}</span>
      </span>
      <input className="sr-only" type="file" accept={accept} onChange={handleChange} />
    </label>
  );
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      disabled={loading}
      className="yt-focus inline-flex items-center gap-2 rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
    >
      <UploadCloud size={18} />
      {loading ? loadingLabel : label}
    </button>
  );
}

function StatusRow({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-300">
      <CheckCircle2 size={16} className={active ? "text-teal-300" : "text-slate-700"} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function StatusMessage({ status, message }: { status: UploadState; message: string }) {
  return <span className={`text-sm ${status === "error" ? "text-rose-300" : "text-slate-300"}`}>{message}</span>;
}

async function uploadFileToR2(supabase: SupabaseClient, file: File, key: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Admin session олдсонгүй. Дахин нэвтэрнэ үү.");
  }

  const contentType = file.type || guessContentType(file.name);
  const response = await fetch("/api/r2/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ key, contentType })
  });

  const payload = (await response.json().catch(() => null)) as { uploadUrl?: string; storagePath?: string; error?: string } | null;
  if (!response.ok || !payload?.uploadUrl || !payload.storagePath) {
    throw new Error(payload?.error || "R2 upload URL авч чадсангүй.");
  }

  const upload = await fetch(payload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType
    },
    body: file
  });

  if (!upload.ok) {
    const details = await upload.text().catch(() => "");
    throw new Error(`R2 upload амжилтгүй боллоо. Status ${upload.status}${details ? `: ${details.slice(0, 180)}` : ""}`);
  }

  return payload.storagePath;
}

function saveLocalDraft(draft: AdminUploadDraft) {
  const key = "yotoki:admin-drafts";
  const existing = window.localStorage.getItem(key);
  const drafts = existing ? (JSON.parse(existing) as AdminUploadDraft[]) : [];
  window.localStorage.setItem(key, JSON.stringify([draft, ...drafts].slice(0, 10)));
}

function readLocalMediaOptions(): AdminMediaOption[] {
  const raw = window.localStorage.getItem("yotoki:admin-media-options");
  if (!raw) return [];

  try {
    return JSON.parse(raw) as AdminMediaOption[];
  } catch {
    return [];
  }
}

function saveLocalMediaOption(option: AdminMediaOption) {
  const existing = readLocalMediaOptions().filter((item) => item.slug !== option.slug);
  window.localStorage.setItem("yotoki:admin-media-options", JSON.stringify([option, ...existing].slice(0, 30)));
}

function genresToArray(value: string, mediaKind: MediaKind) {
  const genres = value
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);

  if (genres.length) return genres;
  return mediaKind === "movie" ? ["Movie"] : ["Anime"];
}

function getPathValue(row: unknown, key: string) {
  if (!row || typeof row !== "object") return null;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

function normalizeYear(value: number) {
  return Number.isFinite(value) && value >= 1900 ? Math.round(value) : new Date().getFullYear();
}

function cleanFileName(value: string) {
  return value.replace(/[^\w.\-]+/g, "-");
}

function guessContentType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".srt") || lowerName.endsWith(".ass") || lowerName.endsWith(".vtt")) return "text/plain";
  if (lowerName.endsWith(".mkv")) return "video/x-matroska";
  if (lowerName.endsWith(".webm")) return "video/webm";
  if (lowerName.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
    .replace(/(^-|-$)/g, "");
}
