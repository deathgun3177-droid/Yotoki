"use client";

import Link from "next/link";
import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, FileText, ListVideo, Search, Trash2, UploadCloud } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isR2StoragePath } from "@/lib/r2-paths";
import type { MediaKind } from "@/lib/types";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ManageState = "idle" | "saving" | "done" | "error";

type EditableTitle = {
  id: string;
  slug: string;
  title: string;
  kind: MediaKind;
  year: number;
  quality: "720p" | "1080p";
  synopsis: string;
  genres: string[];
  episodeCount: number;
};

type EditableEpisode = {
  id: string;
  number: number;
  quality: "720p" | "1080p";
  videoPath: string;
  subtitlePath?: string;
  thumbnailPath?: string;
  releasedAt: string;
  isFree: boolean;
};

const titlesTable = process.env.NEXT_PUBLIC_SUPABASE_TITLES_TABLE || "media_titles";
const episodesTable = process.env.NEXT_PUBLIC_SUPABASE_EPISODES_TABLE || "media_episodes";
const videoBucket = process.env.NEXT_PUBLIC_SUPABASE_VIDEO_BUCKET || "videos";
const subtitleBucket = process.env.NEXT_PUBLIC_SUPABASE_SUBTITLE_BUCKET || "subtitles";
const imageBucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET || "images";

export function AdminContentManager() {
  const [titles, setTitles] = useState<EditableTitle[]>([]);
  const [episodes, setEpisodes] = useState<EditableEpisode[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<EditableTitle | null>(null);
  const [status, setStatus] = useState<ManageState>("idle");
  const [message, setMessage] = useState("");
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState("");
  const [updatingSubtitleId, setUpdatingSubtitleId] = useState("");
  const [updatingEpisodeNumberId, setUpdatingEpisodeNumberId] = useState("");
  const [updatingFreeEpisodeId, setUpdatingFreeEpisodeId] = useState("");
  const [episodeNumberDrafts, setEpisodeNumberDrafts] = useState<Record<string, number>>({});
  const [subtitleFiles, setSubtitleFiles] = useState<Record<string, File | null>>({});
  const configured = isSupabaseConfigured();

  const setSelectedTitle = useCallback((id: string, sourceTitles: EditableTitle[]) => {
    const selected = sourceTitles.find((title) => title.id === id) ?? sourceTitles[0] ?? null;
    setSelectedId(selected?.id ?? "");
    setForm(selected ? { ...selected, genres: [...selected.genres] } : null);
  }, []);

  const loadEpisodes = useCallback(
    async (mediaId: string) => {
      if (!configured || !mediaId) {
        setEpisodes([]);
        setEpisodeNumberDrafts({});
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;

      setEpisodesLoading(true);
      const { data, error } = await selectEpisodesForAdmin(supabase, mediaId);
      setEpisodesLoading(false);

      if (error || !Array.isArray(data)) {
        setStatus("error");
        setMessage(error?.message ?? "Ангиуд уншиж чадсангүй.");
        setEpisodes([]);
        return;
      }

      const nextEpisodes: EditableEpisode[] = data.map((episode) => ({
          id: String(episode.id),
          number: typeof episode.number === "number" ? episode.number : 1,
          quality: episode.quality === "720p" ? "720p" : "1080p",
          videoPath: String(episode.video_path ?? ""),
          subtitlePath: typeof episode.subtitle_path === "string" ? episode.subtitle_path : undefined,
          thumbnailPath: typeof episode.thumbnail_path === "string" ? episode.thumbnail_path : undefined,
          releasedAt: typeof episode.released_at === "string" ? episode.released_at : "",
          isFree: Boolean((episode as { is_free?: unknown }).is_free)
        }));

      setEpisodes(nextEpisodes);
      setEpisodeNumberDrafts(Object.fromEntries(nextEpisodes.map((episode) => [episode.id, episode.number])));
    },
    [configured]
  );

  const loadTitles = useCallback(async () => {
    setMessage("");

    if (!configured) {
      const localTitles = readLocalManagedTitles();
      setTitles(localTitles);
      setSelectedTitle(selectedId, localTitles);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase client үүссэнгүй.");
      return;
    }

    const [{ data: titleRows, error: titleError }, { data: episodeRows, error: episodeError }] = await Promise.all([
      supabase
        .from(titlesTable)
        .select("id,slug,title,kind,year,quality,synopsis,genres")
        .order("added_at", { ascending: false }),
      supabase.from(episodesTable).select("media_id")
    ]);

    if (titleError || episodeError || !Array.isArray(titleRows)) {
      setStatus("error");
      setMessage(titleError?.message ?? episodeError?.message ?? "Content уншиж чадсангүй.");
      return;
    }

    const episodeCounts = new Map<string, number>();
    for (const episode of episodeRows ?? []) {
      const mediaId = String(episode.media_id);
      episodeCounts.set(mediaId, (episodeCounts.get(mediaId) ?? 0) + 1);
    }

    const nextTitles: EditableTitle[] = titleRows.map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      kind: row.kind === "movie" ? "movie" : "anime",
      year: typeof row.year === "number" ? row.year : new Date().getFullYear(),
      quality: row.quality === "720p" ? "720p" : "1080p",
      synopsis: typeof row.synopsis === "string" ? row.synopsis : "",
      genres: Array.isArray(row.genres) ? row.genres.filter(Boolean).map(String) : [],
      episodeCount: episodeCounts.get(String(row.id)) ?? 0
    }));

    setTitles(nextTitles);
    setSelectedTitle(selectedId, nextTitles);
  }, [configured, selectedId, setSelectedTitle]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadTitles();
    });
  }, [loadTitles]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadEpisodes(form?.id ?? "");
    });
  }, [form?.id, loadEpisodes]);

  const filteredTitles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return titles;

    return titles.filter((title) =>
      [title.title, title.slug, title.kind, title.genres.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query, titles]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    setStatus("saving");
    setMessage("");

    const cleanTitle = form.title.trim();
    if (!cleanTitle) {
      setStatus("error");
      setMessage("Title хоосон байж болохгүй.");
      return;
    }

    if (!configured) {
      const nextTitles = titles.map((title) => (title.id === form.id ? form : title));
      saveLocalManagedTitles(nextTitles);
      setTitles(nextTitles);
      setStatus("done");
      setMessage("Local content шинэчлэгдлээ.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase client үүссэнгүй.");
      return;
    }

    const { error } = await supabase
      .from(titlesTable)
      .update({
        title: cleanTitle,
        original_title: cleanTitle,
        kind: form.kind,
        year: normalizeYear(form.year),
        quality: form.quality,
        synopsis: form.synopsis.trim() || "Тайлбар удахгүй нэмэгдэнэ.",
        genres: normalizeGenresInput(form.genres.join(","), form.kind),
        status: form.kind === "movie" ? "completed" : "ongoing",
        updated_at: new Date().toISOString()
      })
      .eq("id", form.id);

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("done");
    setMessage("Content шинэчлэгдлээ.");
    await loadTitles();
  }

  async function handleDelete() {
    if (!form) return;

    const confirmed = window.confirm(`${form.title} устгах уу? Энэ гарчгийн бүх анги хамт устна.`);
    if (!confirmed) return;

    setStatus("saving");
    setMessage("");

    if (!configured) {
      const nextTitles = titles.filter((title) => title.id !== form.id);
      saveLocalManagedTitles(nextTitles);
      setTitles(nextTitles);
      setSelectedId(nextTitles[0]?.id || "");
      setStatus("done");
      setMessage("Local content устлаа.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from(titlesTable).delete().eq("id", form.id);
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setSelectedId("");
    setStatus("done");
    setMessage("Content устлаа.");
    await loadTitles();
  }

  async function handleDeleteEpisode(episode: EditableEpisode) {
    if (!form) return;

    const confirmed = window.confirm(`${form.title} - ${episode.number}-р анги устгах уу? Видео болон хадмал файл хамт устна.`);
    if (!confirmed) return;

    setStatus("saving");
    setDeletingEpisodeId(episode.id);
    setMessage("");

    if (!configured) {
      setEpisodes((current) => current.filter((item) => item.id !== episode.id));
      setDeletingEpisodeId("");
      setStatus("done");
      setMessage(`${episode.number}-р анги устлаа.`);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const allStoragePaths = [episode.videoPath, episode.subtitlePath, episode.thumbnailPath].filter(Boolean);
    const r2Paths = allStoragePaths.filter(isR2StoragePath);
    if (r2Paths.length) {
      const token = await getAccessToken(supabase);
      const response = await fetch("/api/r2/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paths: r2Paths })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setStatus("error");
        setDeletingEpisodeId("");
        setMessage(payload?.error || "R2 файл устгаж чадсангүй.");
        return;
      }
    }

    const storageDeletes = [
      { bucket: videoBucket, paths: toSupabaseStoragePaths(episode.videoPath) },
      { bucket: subtitleBucket, paths: toSupabaseStoragePaths(episode.subtitlePath) },
      { bucket: imageBucket, paths: toSupabaseStoragePaths(episode.thumbnailPath) }
    ];

    for (const item of storageDeletes) {
      if (!item.paths.length) continue;
      const { error } = await supabase.storage.from(item.bucket).remove(item.paths);
      if (error) {
        setStatus("error");
        setDeletingEpisodeId("");
        setMessage(error.message);
        return;
      }
    }

    const { error } = await supabase.from(episodesTable).delete().eq("id", episode.id);
    if (error) {
      setStatus("error");
      setDeletingEpisodeId("");
      setMessage(error.message);
      return;
    }

    setStatus("done");
    setDeletingEpisodeId("");
    setMessage(`${episode.number}-р анги устлаа.`);
    await loadTitles();
    await loadEpisodes(form.id);
  }

  async function handleUpdateSubtitle(episode: EditableEpisode) {
    if (!form) return;

    const subtitleFile = subtitleFiles[episode.id];
    if (!subtitleFile) {
      setStatus("error");
      setMessage("Солих subtitle файл сонгоно уу.");
      return;
    }

    if (!isSubtitleFile(subtitleFile)) {
      setStatus("error");
      setMessage("Subtitle файл .srt, .ass эсвэл .vtt байх хэрэгтэй.");
      return;
    }

    if (!configured) {
      setStatus("error");
      setMessage("Subtitle солихын тулд Supabase/R2 холболт хэрэгтэй.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    setStatus("saving");
    setUpdatingSubtitleId(episode.id);
    setMessage("");

    const nextKey = `${form.slug}/episode-${episode.number}/subtitle-${Date.now()}-${cleanFileName(subtitleFile.name)}`;

    try {
      const nextSubtitlePath = await uploadFileToR2(supabase, subtitleFile, nextKey);
      const { error } = await supabase
        .from(episodesTable)
        .update({
          subtitle_path: nextSubtitlePath
        })
        .eq("id", episode.id);

      if (error) {
        await deleteR2Paths(supabase, [nextSubtitlePath]).catch(() => undefined);
        throw error;
      }

      const oldDeleteMessage = await deleteOldSubtitle(supabase, episode.subtitlePath);

      setEpisodes((current) =>
        current.map((item) => (item.id === episode.id ? { ...item, subtitlePath: nextSubtitlePath } : item))
      );
      setSubtitleFiles((current) => ({ ...current, [episode.id]: null }));
      setStatus("done");
      setMessage(oldDeleteMessage || `${episode.number}-р ангийн subtitle солигдлоо.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Subtitle сольж чадсангүй.");
    } finally {
      setUpdatingSubtitleId("");
    }
  }

  async function handleUpdateEpisodeNumber(episode: EditableEpisode) {
    if (!form) return;

    const nextNumber = normalizeEpisodeNumber(episodeNumberDrafts[episode.id] ?? episode.number);
    if (!nextNumber) {
      setStatus("error");
      setMessage("Ангийн дугаар 1-ээс их бүхэл тоо байх ёстой.");
      return;
    }

    if (nextNumber === episode.number) {
      setStatus("done");
      setMessage(`${episode.number}-р ангийн дугаар өөрчлөгдөөгүй байна.`);
      return;
    }

    const duplicate = episodes.find((item) => item.id !== episode.id && item.number === nextNumber);
    if (duplicate) {
      setStatus("error");
      setMessage(`${nextNumber}-р анги аль хэдийн байна. Эхлээд тэр ангийн дугаарыг солино уу.`);
      return;
    }

    setStatus("saving");
    setUpdatingEpisodeNumberId(episode.id);
    setMessage("");

    if (!configured) {
      setEpisodes((current) =>
        current
          .map((item) => (item.id === episode.id ? { ...item, number: nextNumber } : item))
          .sort((a, b) => a.number - b.number)
      );
      setEpisodeNumberDrafts((current) => ({ ...current, [episode.id]: nextNumber }));
      setStatus("done");
      setUpdatingEpisodeNumberId("");
      setMessage(`${episode.number}-р анги ${nextNumber}-р анги болж солигдлоо.`);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setStatus("error");
      setUpdatingEpisodeNumberId("");
      setMessage("Supabase client үүссэнгүй.");
      return;
    }

    const { error } = await supabase
      .from(episodesTable)
      .update({
        number: nextNumber,
        title: form.kind === "movie" ? "Бүрэн кино" : `Анги ${nextNumber}`,
        updated_at: new Date().toISOString()
      })
      .eq("id", episode.id);

    if (error) {
      setStatus("error");
      setUpdatingEpisodeNumberId("");
      setMessage(error.message.includes("duplicate") ? `${nextNumber}-р анги аль хэдийн байна.` : error.message);
      return;
    }

    setEpisodes((current) =>
      current
        .map((item) => (item.id === episode.id ? { ...item, number: nextNumber } : item))
        .sort((a, b) => a.number - b.number)
    );
    setEpisodeNumberDrafts((current) => ({ ...current, [episode.id]: nextNumber }));
    setStatus("done");
    setUpdatingEpisodeNumberId("");
    setMessage(`${episode.number}-р анги ${nextNumber}-р анги болж солигдлоо.`);
  }

  async function handleToggleFreeEpisode(episode: EditableEpisode, isFree: boolean) {
    setStatus("saving");
    setUpdatingFreeEpisodeId(episode.id);
    setMessage("");

    if (!configured) {
      setEpisodes((current) => current.map((item) => (item.id === episode.id ? { ...item, isFree } : item)));
      setStatus("done");
      setUpdatingFreeEpisodeId("");
      setMessage(`${episode.number}-р анги ${isFree ? "үнэгүй preview" : "эрх шаарддаг"} боллоо.`);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setStatus("error");
      setUpdatingFreeEpisodeId("");
      setMessage("Supabase client үүссэнгүй.");
      return;
    }

    const token = await getAccessToken(supabase).catch((error) => {
      setStatus("error");
      setUpdatingFreeEpisodeId("");
      setMessage(error instanceof Error ? error.message : "Admin session олдсонгүй. Дахин нэвтэрнэ үү.");
      return "";
    });

    if (!token) return;

    const response = await fetch("/api/admin/episodes/free", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ episodeId: episode.id, isFree })
    });
    const payload = (await response.json().catch(() => null)) as { isFree?: boolean; error?: string } | null;

    if (!response.ok || typeof payload?.isFree !== "boolean") {
      setStatus("error");
      setUpdatingFreeEpisodeId("");
      setMessage(payload?.error || "Үнэгүй preview ON/OFF хадгалж чадсангүй.");
      return;
    }

    setEpisodes((current) => current.map((item) => (item.id === episode.id ? { ...item, isFree: payload.isFree! } : item)));
    setStatus("done");
    setUpdatingFreeEpisodeId("");
    setMessage(`${episode.number}-р анги ${payload.isFree ? "үнэгүй preview" : "эрх шаарддаг"} боллоо.`);
  }

  function updateForm(next: Partial<EditableTitle>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="soft-border h-max rounded-lg bg-white/[0.035] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="yt-focus h-10 w-full rounded-lg border border-white/10 bg-black/24 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-300/45"
            placeholder="Title хайх"
          />
        </div>

        <div className="mt-4 max-h-[560px] space-y-2 overflow-auto pr-1">
          {filteredTitles.length ? (
            filteredTitles.map((title) => (
              <button
                key={title.id}
                type="button"
                onClick={() => setSelectedTitle(title.id, titles)}
                className={`w-full rounded-md px-3 py-3 text-left transition ${
                  selectedId === title.id ? "bg-teal-300 text-black" : "bg-black/22 text-slate-200 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="block truncate text-sm font-semibold">{title.title}</span>
                <span className={`mt-1 block text-xs ${selectedId === title.id ? "text-black/65" : "text-slate-500"}`}>
                  {title.kind === "movie" ? "Кино" : "Аниме"} · {title.episodeCount} анги
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-md bg-black/20 p-4 text-sm text-slate-500">Content алга байна.</p>
          )}
        </div>
      </aside>

      {form ? (
        <form onSubmit={handleSave} className="soft-border rounded-lg bg-white/[0.035] p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-violet-300/14 text-violet-100">
                <Edit3 size={20} />
              </span>
              <div>
                <h2 className="font-semibold text-white">Content засах</h2>
                <p className="text-sm text-slate-500">{form.slug}</p>
              </div>
            </div>
            <Link className="yt-focus rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white" href={`/title/${form.slug}`}>
              Detail харах
            </Link>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-lg border border-white/10 bg-black/24 p-1">
            {mediaKindOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateForm({ kind: option.value })}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  form.kind === option.value ? "bg-teal-300 text-black" : "text-slate-300 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Title" value={form.title} onChange={(value) => updateForm({ title: value })} />
            <NumberField label="Year" value={form.year} onChange={(value) => updateForm({ year: value })} />
            <QualityPicker value={form.quality} onChange={(value) => updateForm({ quality: value })} />
            <TextField label="Genres" value={form.genres.join(", ")} onChange={(value) => updateForm({ genres: normalizeGenresInput(value, form.kind) })} />
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Synopsis</span>
            <textarea
              value={form.synopsis}
              onChange={(event) => updateForm({ synopsis: event.target.value })}
              className="yt-focus min-h-32 w-full resize-y rounded-lg border border-white/10 bg-black/24 px-3 py-3 text-sm text-white focus:border-teal-300/45"
            />
          </label>

          <section className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-teal-300/12 text-teal-100">
                  <ListVideo size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">Ангиуд</h3>
                  <p className="text-xs text-slate-500">Буруу хадмал сольж, тестээр нэмсэн бичлэгээ устгана.</p>
                </div>
              </div>
              <span className="rounded-md bg-white/8 px-2.5 py-1 text-xs font-semibold text-slate-300">{episodes.length} анги</span>
            </div>

            {episodesLoading ? (
              <p className="rounded-md bg-white/[0.04] px-3 py-3 text-sm text-slate-400">Ангиуд уншиж байна...</p>
            ) : episodes.length ? (
              <div className="grid gap-2">
                {episodes.map((episode) => {
                  const selectedSubtitleFile = subtitleFiles[episode.id] ?? null;
                  const subtitleBusy = updatingSubtitleId === episode.id;
                  const draftNumber = episodeNumberDrafts[episode.id] ?? episode.number;
                  const numberBusy = updatingEpisodeNumberId === episode.id;
                  const numberChanged = draftNumber !== episode.number;
                  const freeBusy = updatingFreeEpisodeId === episode.id;

                  return (
                    <div key={episode.id} className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] px-3 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{episode.number}-р анги</p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {episode.quality} · {episode.subtitlePath ? "MN хадмалтай" : "Хадмалгүй"} · {episode.isFree ? "Үнэгүй preview" : "Эрх шаардна"} · {episode.videoPath}
                          </p>
                        </div>
                        <button
                          disabled={status === "saving" || deletingEpisodeId === episode.id}
                          className="yt-focus inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-300/25 bg-rose-300/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/16 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => void handleDeleteEpisode(episode)}
                        >
                          <Trash2 size={16} />
                          {deletingEpisodeId === episode.id ? "Устгаж байна" : "Устгах"}
                        </button>
                      </div>

                      <div className="grid gap-2 rounded-md border border-white/8 bg-black/18 p-2 sm:grid-cols-[140px_auto_1fr] sm:items-end">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-slate-400">Анги дугаар</span>
                          <input
                            value={draftNumber}
                            min={1}
                            type="number"
                            onChange={(event) =>
                              setEpisodeNumberDrafts((current) => ({
                                ...current,
                                [episode.id]: Number(event.target.value)
                              }))
                            }
                            className="yt-focus h-10 w-full rounded-md border border-white/10 bg-black/24 px-3 text-sm font-semibold text-white focus:border-teal-300/45"
                          />
                        </label>
                        <button
                          disabled={status === "saving" || numberBusy || !numberChanged}
                          className="yt-focus inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-white transition hover:border-teal-300/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => void handleUpdateEpisodeNumber(episode)}
                        >
                          <Edit3 size={15} />
                          {numberBusy ? "Сольж байна" : "Дугаар солих"}
                        </button>
                        <p className="text-xs leading-5 text-slate-500">
                          Буруу дугаартай оруулсан бол video дахин upload хийхгүйгээр эндээс солино.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 rounded-md border border-white/8 bg-black/18 p-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-white">Үнэгүй preview</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Login хийсэн хүн үзэх эрхгүй байсан ч энэ ангийг үзнэ.
                          </p>
                        </div>
                        <button
                          disabled={status === "saving" || freeBusy}
                          aria-pressed={episode.isFree}
                          className={`yt-focus inline-flex h-10 min-w-28 items-center justify-between gap-2 rounded-full border px-2 text-xs font-bold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            episode.isFree
                              ? "border-teal-300/45 bg-teal-300/18 text-teal-100 hover:bg-teal-300/24"
                              : "border-white/10 bg-white/[0.055] text-slate-400 hover:border-teal-300/35 hover:bg-white/[0.08] hover:text-white"
                          }`}
                          type="button"
                          onClick={() => void handleToggleFreeEpisode(episode, !episode.isFree)}
                        >
                          <span>{freeBusy ? "..." : episode.isFree ? "ON" : "OFF"}</span>
                          <span
                            className={`h-6 w-6 rounded-full transition ${
                              episode.isFree ? "translate-x-0 bg-teal-300 shadow-[0_0_18px_rgba(45,212,191,0.35)]" : "bg-white/20"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="grid gap-2 rounded-md border border-white/8 bg-black/18 p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <label className="yt-focus grid min-w-0 cursor-pointer grid-cols-[34px_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-2 transition hover:border-teal-300/35 hover:bg-white/[0.06]">
                          <span className="grid h-8 w-8 place-items-center rounded bg-teal-300/12 text-teal-100">
                            <FileText size={16} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-white">Subtitle солих</span>
                            <span className="block truncate text-xs text-slate-500">
                              {selectedSubtitleFile?.name || episode.subtitlePath || ".srt / .ass / .vtt"}
                            </span>
                          </span>
                          <input
                            className="sr-only"
                            type="file"
                            accept=".srt,.ass,.vtt"
                            onChange={(event) => handleSubtitleFileChange(event, episode.id, setSubtitleFiles)}
                          />
                        </label>

                        <button
                          disabled={status === "saving" || subtitleBusy || !selectedSubtitleFile}
                          className="yt-focus inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-300 px-4 text-sm font-semibold text-black transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => void handleUpdateSubtitle(episode)}
                        >
                          <UploadCloud size={16} />
                          {subtitleBusy ? "Сольж байна" : "Хадмал солих"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md bg-white/[0.04] px-3 py-3 text-sm text-slate-500">Энэ гарчигт анги нэмэгдээгүй байна.</p>
            )}
          </section>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              disabled={status === "saving"}
              className="yt-focus inline-flex items-center gap-2 rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
            >
              <Edit3 size={18} />
              {status === "saving" ? "Хадгалж байна" : "Засвар хадгалах"}
            </button>
            <button
              disabled={status === "saving"}
              className="yt-focus inline-flex items-center gap-2 rounded-md border border-rose-300/25 bg-rose-300/10 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/16 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={handleDelete}
            >
              <Trash2 size={18} />
              Устгах
            </button>
            {message ? <span className={`text-sm ${status === "error" ? "text-rose-300" : "text-teal-200"}`}>{message}</span> : null}
          </div>
        </form>
      ) : (
        <div className="soft-border rounded-lg bg-white/[0.035] p-8 text-center text-slate-400">
          Засах content сонгоно уу.
        </div>
      )}
    </section>
  );
}

const mediaKindOptions: { value: MediaKind; label: string }[] = [
  { value: "anime", label: "Аниме" },
  { value: "movie", label: "Кино" }
];

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        value={value}
        min={1900}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
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

async function selectEpisodesForAdmin(supabase: SupabaseClient, mediaId: string) {
  const withFree = await supabase
    .from(episodesTable)
    .select("id,number,quality,video_path,subtitle_path,thumbnail_path,is_free,released_at")
    .eq("media_id", mediaId)
    .order("number", { ascending: true });

  if (!withFree.error || !isMissingIsFreeColumn(withFree.error)) {
    return withFree;
  }

  return supabase
    .from(episodesTable)
    .select("id,number,quality,video_path,subtitle_path,thumbnail_path,released_at")
    .eq("media_id", mediaId)
    .order("number", { ascending: true });
}

function isMissingIsFreeColumn(error: { message?: string; code?: string }) {
  const message = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return message.includes("is_free") || message.includes("column");
}

function normalizeGenresInput(value: string, mediaKind: MediaKind) {
  const genres = value
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);

  if (genres.length) return genres;
  return mediaKind === "movie" ? ["Movie"] : ["Anime"];
}

function normalizeYear(value: number) {
  return Number.isFinite(value) && value >= 1900 ? Math.round(value) : new Date().getFullYear();
}

function normalizeEpisodeNumber(value: number) {
  if (!Number.isFinite(value)) return 0;
  const nextValue = Math.round(value);
  return nextValue >= 1 ? nextValue : 0;
}

function toSupabaseStoragePaths(value?: string) {
  return value && !isR2StoragePath(value) ? [value] : [];
}

function handleSubtitleFileChange(
  event: ChangeEvent<HTMLInputElement>,
  episodeId: string,
  setFiles: Dispatch<SetStateAction<Record<string, File | null>>>
) {
  const file = event.target.files?.[0] ?? null;
  setFiles((current) => ({ ...current, [episodeId]: file }));
  event.target.value = "";
}

async function uploadFileToR2(supabase: SupabaseClient, file: File, key: string) {
  const token = await getAccessToken(supabase);
  const contentType = guessContentType(file.name);
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

async function deleteOldSubtitle(supabase: SupabaseClient, subtitlePath?: string) {
  if (!subtitlePath) return "";

  try {
    if (isR2StoragePath(subtitlePath)) {
      await deleteR2Paths(supabase, [subtitlePath]);
      return "";
    }

    const { error } = await supabase.storage.from(subtitleBucket).remove([subtitlePath]);
    if (error) throw error;
    return "";
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return `Subtitle солигдлоо. Хуучин хадмал файл устсангүй: ${reason}`;
  }
}

async function deleteR2Paths(supabase: SupabaseClient, paths: string[]) {
  if (!paths.length) return;

  const token = await getAccessToken(supabase);
  const response = await fetch("/api/r2/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ paths })
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "R2 файл устгаж чадсангүй.");
  }
}

async function getAccessToken(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Admin session олдсонгүй. Дахин нэвтэрнэ үү.");
  return token;
}

function isSubtitleFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".srt") || lowerName.endsWith(".ass") || lowerName.endsWith(".vtt");
}

function cleanFileName(value: string) {
  return value.replace(/[^\w.\-]+/g, "-");
}

function guessContentType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".vtt")) return "text/vtt";
  return "text/plain";
}

function readLocalManagedTitles(): EditableTitle[] {
  const raw = window.localStorage.getItem("yotoki:admin-managed-titles");
  if (!raw) return [];

  try {
    return JSON.parse(raw) as EditableTitle[];
  } catch {
    return [];
  }
}

function saveLocalManagedTitles(titles: EditableTitle[]) {
  window.localStorage.setItem("yotoki:admin-managed-titles", JSON.stringify(titles));
}
