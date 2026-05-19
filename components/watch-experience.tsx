"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Maximize, Pause, Play, SkipForward, Subtitles, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { isR2StoragePath } from "@/lib/r2-paths";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Episode, MediaTitle } from "@/lib/types";
import { findProgress, upsertProgress } from "@/lib/storage";
import { loadMongolianSubtitle, type SubtitleCue } from "@/lib/subtitles";

type WatchExperienceProps = {
  media: MediaTitle;
  episode: Episode;
  nextEpisode?: Episode;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenTarget = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function WatchExperience({ media, episode, nextEpisode }: WatchExperienceProps) {
  const router = useRouter();
  const { user } = useAuth();
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveRef = useRef(0);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [softFullscreen, setSoftFullscreen] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [subtitleState, setSubtitleState] = useState<{
    episodeId: string;
    cues: SubtitleCue[];
    status: "loading" | "ready" | "missing";
  }>({ episodeId: episode.id, cues: [], status: "loading" });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [streamState, setStreamState] = useState<{
    episodeId: string;
    videoUrl: string | null;
    subtitleUrl?: string;
    status: "loading" | "ready" | "error";
    message?: string;
  }>({
    episodeId: episode.id,
    videoUrl: isR2StoragePath(episode.videoUrl) ? null : episode.videoUrl,
    subtitleUrl: isR2StoragePath(episode.subtitleUrl) ? undefined : episode.subtitleUrl,
    status: isR2StoragePath(episode.videoUrl) || isR2StoragePath(episode.subtitleUrl) ? "loading" : "ready"
  });

  const episodeLabel = useMemo(() => `EP ${episode.number}`, [episode.number]);
  const streamVideoUrl = streamState.episodeId === episode.id ? streamState.videoUrl : null;
  const streamSubtitleUrl = streamState.episodeId === episode.id ? streamState.subtitleUrl : undefined;
  const streamStatus = streamState.episodeId === episode.id ? streamState.status : "loading";
  const fullscreenLayout = softFullscreen || nativeFullscreen;
  const subtitleCues = useMemo(
    () => (subtitleState.episodeId === episode.id ? subtitleState.cues : []),
    [episode.id, subtitleState.cues, subtitleState.episodeId]
  );
  const subtitleStatus = subtitleState.episodeId === episode.id ? subtitleState.status : "loading";
  const activeSubtitle = useMemo(() => {
    if (!subtitlesEnabled || subtitleStatus !== "ready") return "";
    return subtitleCues.find((cue) => currentTime >= cue.start && currentTime <= cue.end)?.text ?? "";
  }, [currentTime, subtitleCues, subtitleStatus, subtitlesEnabled]);

  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }

    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2400);
    }
  }, [isPlaying]);

  const toggleFullscreen = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const fullscreenDocument = document as FullscreenDocument;
    const fullscreenElement = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement;

    showControls();

    if (fullscreenElement) {
      const exitFullscreen = document.exitFullscreen ?? fullscreenDocument.webkitExitFullscreen;
      if (exitFullscreen) void exitFullscreen.call(document);
      return;
    }

    const fullscreenPlayer = player as FullscreenTarget;
    const requestFullscreen = fullscreenPlayer.requestFullscreen ?? fullscreenPlayer.webkitRequestFullscreen;
    if (!requestFullscreen) {
      setSoftFullscreen((current) => !current);
      return;
    }

    try {
      void Promise.resolve(requestFullscreen.call(fullscreenPlayer)).catch(() => {
        setSoftFullscreen((current) => !current);
      });
    } catch {
      setSoftFullscreen((current) => !current);
    }
  }, [showControls]);

  useEffect(() => {
    let cancelled = false;

    async function resolveStreamUrls() {
      const videoNeedsSigning = isR2StoragePath(episode.videoUrl);
      const subtitleNeedsSigning = isR2StoragePath(episode.subtitleUrl);

      if (!videoNeedsSigning && !subtitleNeedsSigning) {
        setStreamState({
          episodeId: episode.id,
          videoUrl: episode.videoUrl,
          subtitleUrl: episode.subtitleUrl,
          status: "ready"
        });
        return;
      }

      setStreamState({
        episodeId: episode.id,
        videoUrl: videoNeedsSigning ? null : episode.videoUrl,
        subtitleUrl: subtitleNeedsSigning ? undefined : episode.subtitleUrl,
        status: "loading"
      });

      try {
        const [signedVideoUrl, signedSubtitleUrl] = await Promise.all([
          videoNeedsSigning ? getSignedR2Url(episode.videoUrl) : Promise.resolve(episode.videoUrl),
          subtitleNeedsSigning && episode.subtitleUrl ? getSignedR2Url(episode.subtitleUrl) : Promise.resolve(episode.subtitleUrl)
        ]);

        if (cancelled) return;

        setStreamState({
          episodeId: episode.id,
          videoUrl: signedVideoUrl,
          subtitleUrl: signedSubtitleUrl,
          status: "ready"
        });
      } catch (error) {
        if (cancelled) return;

        setStreamState({
          episodeId: episode.id,
          videoUrl: null,
          status: "error",
          message: error instanceof Error ? error.message : "Video URL авч чадсангүй."
        });
      }
    }

    void resolveStreamUrls();

    return () => {
      cancelled = true;
    };
  }, [episode.id, episode.subtitleUrl, episode.videoUrl, user?.id]);

  useEffect(() => {
    if (!streamVideoUrl || streamStatus !== "ready") return;

    let cancelled = false;

    loadMongolianSubtitle(streamVideoUrl, streamSubtitleUrl).then((subtitle) => {
      if (cancelled) {
        return;
      }

      if (!subtitle) {
        setSubtitleState({ episodeId: episode.id, cues: [], status: "missing" });
        return;
      }

      setSubtitleState({ episodeId: episode.id, cues: subtitle.cues, status: "ready" });
    });

    return () => {
      cancelled = true;
    };
  }, [episode.id, streamStatus, streamSubtitleUrl, streamVideoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!isPlaying) {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      queueMicrotask(() => setControlsVisible(true));
      return;
    }

    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2400);

    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
    };
  }, [isPlaying, showControls]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;

      if (event.key === "Escape" && softFullscreen) {
        event.preventDefault();
        setSoftFullscreen(false);
        return;
      }

      if (event.key.toLowerCase() !== "f") return;

      event.preventDefault();
      toggleFullscreen();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [softFullscreen, toggleFullscreen]);

  useEffect(() => {
    if (!softFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [softFullscreen]);

  useEffect(() => {
    function handleFullscreenChange() {
      const fullscreenDocument = document as FullscreenDocument;
      setNativeFullscreen(Boolean(document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration || 0);
    const saved = findProgress(media.slug, episode.id, episode.number);

    if (saved && saved.currentTime > 8 && saved.currentTime < video.duration - 12) {
      video.currentTime = saved.currentTime;
    }
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);

    const now = Date.now();
    if (now - saveRef.current < 1600 || !video.duration || video.currentTime < 5) return;
    saveRef.current = now;

    upsertProgress({
      mediaSlug: media.slug,
      mediaTitle: media.title,
      episodeId: episode.id,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      poster: episode.thumbnail || media.poster,
      currentTime: video.currentTime,
      duration: video.duration,
      updatedAt: new Date().toISOString()
    });
  }

  function handleEnded() {
    setIsPlaying(false);
    if (nextEpisode) {
      router.push(`/watch/${media.slug}/${nextEpisode.number}`);
    }
  }

  function seekTo(value: string) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number(value);
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-12 pt-4 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
      <section className="min-w-0">
        <div
          ref={playerRef}
          className={`overflow-hidden bg-black shadow-2xl shadow-black/50 ${
            softFullscreen ? "fixed inset-0 z-50 flex items-center justify-center rounded-none" : "relative rounded-lg"
          } ${controlsVisible ? "" : "cursor-none"}`}
          onMouseMove={showControls}
          onTouchStart={showControls}
          onFocus={showControls}
        >
          <video
            ref={videoRef}
            className={`yotoki-video bg-black ${softFullscreen ? "h-screen w-screen object-contain" : "aspect-video w-full"}`}
            poster={episode.thumbnail}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
          >
            {streamVideoUrl ? <source key={streamVideoUrl} src={streamVideoUrl} type="video/mp4" /> : null}
          </video>

          {activeSubtitle ? (
            <div className="pointer-events-none absolute inset-x-4 bottom-[12%] z-10 text-center">
              <span
                className={`inline-block max-w-[92%] whitespace-pre-line rounded-md bg-black/62 font-semibold leading-snug text-white shadow-[0_3px_18px_rgba(0,0,0,0.75)] ${
                  fullscreenLayout ? "px-4 py-2 text-2xl sm:text-3xl lg:text-4xl" : "px-3 py-1.5 text-base sm:text-xl"
                }`}
              >
                {activeSubtitle}
              </span>
            </div>
          ) : null}

          {streamStatus === "loading" ? (
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-semibold text-slate-200">Video ачаалж байна...</div>
          ) : null}

          {streamStatus === "error" ? (
            <div className="absolute inset-0 grid place-items-center bg-black/70 px-5 text-center text-sm font-semibold text-rose-100">
              {streamState.message || "Video ачаалж чадсангүй."}
            </div>
          ) : null}

          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/48 to-transparent px-3 pb-3 pt-16 transition duration-300 ${
              controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
            }`}
          >
            <input
              aria-label="Seek"
              type="range"
              min={0}
              max={duration || 0}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seekTo(event.target.value)}
              className="mb-3 h-1 w-full accent-teal-300"
            />

            <div className="flex flex-wrap items-center gap-2 text-white">
              <IconButton label={isPlaying ? "Pause" : "Play"} onClick={togglePlay}>
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </IconButton>

              {nextEpisode ? (
                <IconButton label="Next episode" onClick={() => router.push(`/watch/${media.slug}/${nextEpisode.number}`)}>
                  <SkipForward size={18} />
                </IconButton>
              ) : null}

              <span className="min-w-[92px] text-xs tabular-nums text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-2">
                <IconButton label={isMuted ? "Unmute" : "Mute"} onClick={() => setIsMuted((current) => !current)}>
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </IconButton>
                <input
                  aria-label="Volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(event) => {
                    setIsMuted(false);
                    setVolume(Number(event.target.value));
                  }}
                  className="hidden h-1 w-20 accent-teal-300 sm:block"
                />
                <IconButton
                  active={subtitlesEnabled}
                  disabled={subtitleStatus === "missing"}
                  label="Mongolian subtitles"
                  onClick={() => setSubtitlesEnabled((current) => !current)}
                >
                  <Subtitles size={18} />
                </IconButton>
                <IconButton label="Fullscreen" onClick={toggleFullscreen}>
                  <Maximize size={18} />
                </IconButton>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
            <span className="rounded bg-teal-300/14 px-2 py-1 text-teal-100">{episodeLabel}</span>
            <span className="rounded bg-white/8 px-2 py-1 text-slate-300">{episode.quality}</span>
            <span className="rounded bg-amber-300/14 px-2 py-1 text-amber-100">
              {subtitleStatus === "ready" ? "MN хадмал" : subtitleStatus === "loading" ? "Хадмал ачаалж байна" : "Хадмалгүй"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{media.title}</h1>
          <p className="mt-1 text-slate-400">{episode.title}</p>
        </div>
      </section>

      <aside className="soft-border h-max rounded-lg bg-white/[0.035] p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-semibold text-white">Анги сонгох</h2>
          <span className="text-xs text-slate-500">{media.episodes.length}</span>
        </div>
        <div className="grid gap-2">
          {media.episodes.map((item) => {
            const active = item.id === episode.id;

            return (
              <Link
                className={`grid grid-cols-[86px_1fr] overflow-hidden rounded-lg border transition ${
                  active
                    ? "border-teal-300/50 bg-teal-300/10"
                    : "border-white/8 bg-black/18 hover:border-white/18 hover:bg-white/[0.055]"
                }`}
                href={`/watch/${media.slug}/${item.number}`}
                key={item.id}
              >
                <div className="relative aspect-video">
                  <Image src={item.thumbnail} alt="" fill className="object-cover" sizes="86px" />
                </div>
                <div className="min-w-0 p-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200">EP {item.number}</p>
                  <p className="mt-1 truncate text-sm text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.runtime}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  active,
  disabled
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`yt-focus grid h-10 w-10 place-items-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-teal-300/50 bg-teal-300/18 text-teal-100"
          : "border-white/10 bg-white/8 text-slate-100 hover:border-white/24 hover:bg-white/14"
      }`}
    >
      {children}
    </button>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function getSignedR2Url(path: string) {
  const supabase = createBrowserSupabaseClient();
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Video үзэхийн тулд дахин нэвтэрнэ үү.");
  }

  const response = await fetch("/api/r2/watch-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ path })
  });

  const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Video URL авч чадсангүй.");
  }

  return payload.url;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}
