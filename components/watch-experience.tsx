"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Maximize, Pause, Play, RotateCcw, RotateCw, SkipForward, Subtitles, Volume2, VolumeX } from "lucide-react";
import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { isR2StoragePath } from "@/lib/r2-paths";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Episode, MediaTitle } from "@/lib/types";
import { findProgress, upsertProgress } from "@/lib/storage";
import { loadMongolianSubtitle, type SubtitleCue } from "@/lib/subtitles";
import { formatPlaybackTime, formatRuntime } from "@/lib/time";
import { createVideoDurationReader } from "@/lib/video-duration";

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

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

export function WatchExperience({ media, episode, nextEpisode }: WatchExperienceProps) {
  const router = useRouter();
  const { user } = useAuth();
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveRef = useRef(0);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ side: "left" | "right"; time: number } | null>(null);
  const fullscreenPlaybackRef = useRef<boolean | null>(null);
  const fullscreenRestoreTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [centerActionVisible, setCenterActionVisible] = useState(true);
  const [videoBuffering, setVideoBuffering] = useState(false);
  const [softFullscreen, setSoftFullscreen] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [subtitleState, setSubtitleState] = useState<{
    episodeId: string;
    cues: SubtitleCue[];
    status: "loading" | "ready" | "missing";
  }>({ episodeId: episode.id, cues: [], status: "loading" });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [episodeRuntimeOverrides, setEpisodeRuntimeOverrides] = useState<Record<string, string>>({});
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
  const seekPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const volumePercent = Math.min(100, Math.max(0, (isMuted ? 0 : volume) * 100));
  const currentRuntime = duration > 0 ? formatRuntime(duration) : episode.durationSeconds ? formatRuntime(episode.durationSeconds) : episode.runtime;
  const getEpisodeRuntimeLabel = useCallback(
    (item: Episode) => {
      if (item.id === episode.id) return currentRuntime;

      const resolvedRuntime = episodeRuntimeOverrides[item.id];
      if (resolvedRuntime) return resolvedRuntime;
      if (item.durationSeconds) return formatRuntime(item.durationSeconds);

      return isLegacyRuntimeLabel(item.runtime) ? "Уншиж байна..." : item.runtime;
    },
    [currentRuntime, episode.id, episodeRuntimeOverrides]
  );

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

  const clearCenterActionTimer = useCallback(() => {
    if (centerActionTimerRef.current) {
      clearTimeout(centerActionTimerRef.current);
      centerActionTimerRef.current = null;
    }
  }, []);

  const revealCenterAction = useCallback(() => {
    clearCenterActionTimer();
    setCenterActionVisible(true);

    if (isPlaying) {
      centerActionTimerRef.current = setTimeout(() => {
        setCenterActionVisible(false);
        centerActionTimerRef.current = null;
      }, 1800);
    }
  }, [clearCenterActionTimer, isPlaying]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    showControls();

    if (video.paused) {
      void video.play();
      clearCenterActionTimer();
      setCenterActionVisible(false);
    } else {
      video.pause();
      setCenterActionVisible(true);
    }
  }, [clearCenterActionTimer, showControls]);

  const seekBy = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      const max = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration;
      const nextTime = max > 0 ? Math.min(max, Math.max(0, video.currentTime + seconds)) : Math.max(0, video.currentTime + seconds);
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      showControls();
    },
    [duration, showControls]
  );

  const changeVolumeBy = useCallback(
    (amount: number) => {
      setVolume((current) => Math.min(1, Math.max(0, Number((current + amount).toFixed(2)))));
      setIsMuted(false);
      showControls();
    },
    [showControls]
  );

  const clearFullscreenRestoreTimers = useCallback(() => {
    fullscreenRestoreTimersRef.current.forEach((timer) => clearTimeout(timer));
    fullscreenRestoreTimersRef.current = [];
  }, []);

  const rememberFullscreenPlayback = useCallback(() => {
    const video = videoRef.current;
    clearFullscreenRestoreTimers();
    fullscreenPlaybackRef.current = video ? !video.paused && !video.ended : null;
  }, [clearFullscreenRestoreTimers]);

  const restoreFullscreenPlayback = useCallback(() => {
    const video = videoRef.current;
    const wasPlaying = fullscreenPlaybackRef.current;
    if (!video || wasPlaying === null) return;

    clearFullscreenRestoreTimers();

    const restore = () => {
      if (wasPlaying) {
        if (video.paused) {
          void video.play().catch(() => {
            // Some mobile browsers block play() after fullscreen changes without a fresh gesture.
          });
        }
        return;
      }

      if (!video.paused) {
        video.pause();
      }
    };

    const finish = () => {
      restore();
      fullscreenPlaybackRef.current = null;
      fullscreenRestoreTimersRef.current = [];
    };

    restore();
    fullscreenRestoreTimersRef.current = [setTimeout(restore, 90), setTimeout(finish, 260)];
  }, [clearFullscreenRestoreTimers]);

  const toggleFullscreen = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const fullscreenDocument = document as FullscreenDocument;
    const fullscreenElement = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement;

    rememberFullscreenPlayback();
    showControls();

    if (fullscreenElement || softFullscreen) {
      const exitFullscreen = document.exitFullscreen ?? fullscreenDocument.webkitExitFullscreen;
      if (exitFullscreen) {
        void Promise.resolve(exitFullscreen.call(document))
          .catch(() => undefined)
          .finally(restoreFullscreenPlayback);
      } else {
        restoreFullscreenPlayback();
      }
      setSoftFullscreen(false);
      unlockOrientation();
      return;
    }

    const fullscreenPlayer = player as FullscreenTarget;
    const requestFullscreen = fullscreenPlayer.requestFullscreen ?? fullscreenPlayer.webkitRequestFullscreen;
    if (!requestFullscreen) {
      setSoftFullscreen(true);
      void lockLandscapeOrientation();
      restoreFullscreenPlayback();
      return;
    }

    try {
      void Promise.resolve(requestFullscreen.call(fullscreenPlayer))
        .then(() => {
          void lockLandscapeOrientation();
        })
        .catch(() => {
          setSoftFullscreen(true);
          void lockLandscapeOrientation();
        })
        .finally(restoreFullscreenPlayback);
    } catch {
      setSoftFullscreen(true);
      void lockLandscapeOrientation();
      restoreFullscreenPlayback();
    }
  }, [rememberFullscreenPlayback, restoreFullscreenPlayback, showControls, softFullscreen]);

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
    const episodesToResolve = media.episodes.filter((item) => item.id !== episode.id && !item.durationSeconds && item.videoUrl);
    if (!episodesToResolve.length) return;

    const needsAuth = episodesToResolve.some((item) => isR2StoragePath(item.videoUrl));
    if (needsAuth && !user?.id) return;

    let cancelled = false;
    const readers: Array<{ cancel: () => void }> = [];

    async function resolveEpisodeDurations() {
      for (const item of episodesToResolve) {
        if (cancelled) return;

        try {
          const videoUrl = isR2StoragePath(item.videoUrl) ? await getSignedR2Url(item.videoUrl) : item.videoUrl;
          if (cancelled || !videoUrl) return;

          const reader = createVideoDurationReader(videoUrl);
          readers.push(reader);

          const seconds = await reader.promise;
          if (cancelled) return;

          const runtime = formatRuntime(seconds);
          setEpisodeRuntimeOverrides((current) => (current[item.id] === runtime ? current : { ...current, [item.id]: runtime }));
        } catch {
          if (cancelled) return;
          setEpisodeRuntimeOverrides((current) => (current[item.id] ? current : { ...current, [item.id]: "Тодорхойгүй" }));
        }
      }
    }

    void resolveEpisodeDurations();

    return () => {
      cancelled = true;
      readers.forEach((reader) => reader.cancel());
    };
  }, [episode.id, media.episodes, user?.id]);

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
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "Escape" && softFullscreen) {
        event.preventDefault();
        rememberFullscreenPlayback();
        setSoftFullscreen(false);
        unlockOrientation();
        restoreFullscreenPlayback();
        return;
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        if (!event.repeat) {
          togglePlay();
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-5);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(5);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        changeVolumeBy(0.05);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        changeVolumeBy(-0.05);
        return;
      }

      if (event.key.toLowerCase() !== "f") return;

      event.preventDefault();
      if (!event.repeat) {
        toggleFullscreen();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [changeVolumeBy, rememberFullscreenPlayback, restoreFullscreenPlayback, seekBy, softFullscreen, toggleFullscreen, togglePlay]);

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
      const isFullscreen = Boolean(document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement);
      setNativeFullscreen(isFullscreen);

      if (isFullscreen) {
        void lockLandscapeOrientation();
      } else {
        unlockOrientation();
      }

      restoreFullscreenPlayback();
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [restoreFullscreenPlayback]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }

      clearCenterActionTimer();
      clearFullscreenRestoreTimers();
      unlockOrientation();
    };
  }, [clearCenterActionTimer, clearFullscreenRestoreTimers]);

  function handleFramePointerUp(event: PointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest("[data-player-controls='true']")) return;

    showControls();
    revealCenterAction();

    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const side = event.clientX - rect.left < rect.width / 2 ? "left" : "right";
    const now = Date.now();
    const previousTap = lastTapRef.current;

    if (previousTap && previousTap.side === side && now - previousTap.time < 320) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }

      lastTapRef.current = null;
      seekBy(side === "left" ? -5 : 5);
      return;
    }

    lastTapRef.current = { side, time: now };

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    tapTimerRef.current = setTimeout(() => {
      tapTimerRef.current = null;
      lastTapRef.current = null;
    }, 320);
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

    const nextTime = Number(value);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    showControls();
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-0 pb-12 pt-0 sm:px-6 sm:pt-4 lg:grid-cols-[1fr_320px] lg:px-8">
      <section className="soft-border mx-4 min-w-0 overflow-hidden rounded-lg bg-white/[0.035] p-2 shadow-2xl shadow-black/24 sm:mx-0 sm:p-3">
        <div
          ref={playerRef}
          className={`video-player yotoki-player overflow-hidden bg-black shadow-2xl shadow-black/50 ${
            fullscreenLayout
              ? "yotoki-player--fullscreen fixed inset-0 z-50 rounded-none"
              : "relative rounded-md"
          } ${controlsVisible ? "yotoki-player--controls-visible" : "yotoki-player--controls-hidden cursor-none"}`}
          onMouseMove={showControls}
          onTouchStart={showControls}
          onFocus={showControls}
        >
          <div className="yotoki-player-frame" onPointerUp={handleFramePointerUp}>
            <video
              ref={videoRef}
              className="yotoki-video yotoki-player-video bg-black"
              poster={episode.thumbnail}
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onWaiting={() => setVideoBuffering(true)}
              onCanPlay={() => setVideoBuffering(false)}
              onCanPlayThrough={() => setVideoBuffering(false)}
              onPlay={() => {
                setIsPlaying(true);
                setVideoBuffering(false);
                clearCenterActionTimer();
                setCenterActionVisible(false);
              }}
              onPause={() => {
                setIsPlaying(false);
                setCenterActionVisible(true);
              }}
              onEnded={handleEnded}
            >
              {streamVideoUrl ? <source key={streamVideoUrl} src={streamVideoUrl} type="video/mp4" /> : null}
            </video>

            {streamStatus === "ready" && streamVideoUrl && (centerActionVisible || !isPlaying) ? (
              <button
                data-player-controls="true"
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                className="video-center-button yt-focus absolute left-1/2 top-1/2 z-20 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/58 text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur transition hover:bg-black/70 sm:h-[72px] sm:w-[72px]"
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  togglePlay();
                }}
              >
                {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play className="ml-1" size={32} fill="currentColor" />}
              </button>
            ) : null}

            {activeSubtitle ? (
              <div className="subtitle-overlay yotoki-subtitle-wrap pointer-events-none absolute inset-x-4 bottom-[12%] z-10 text-center">
                <span
                  className={`yotoki-subtitle-text inline-block max-w-[92%] whitespace-pre-line rounded-md bg-black/62 font-semibold leading-snug text-white shadow-[0_3px_18px_rgba(0,0,0,0.75)] ${
                    fullscreenLayout ? "px-3 py-1.5 text-2xl sm:text-3xl lg:text-4xl" : "px-2.5 py-1 text-base sm:text-xl"
                  }`}
                >
                  {activeSubtitle}
                </span>
              </div>
            ) : null}

            {streamStatus === "loading" || videoBuffering ? (
              <div className="absolute inset-0 z-10 grid place-items-center bg-black/38 text-sm font-semibold text-slate-200">
                <div className="soft-border rounded-lg bg-black/58 px-5 py-4 text-center shadow-2xl shadow-black/50 backdrop-blur">
                  <span className="yotoki-spinner mx-auto block" />
                  <span className="mt-3 block">Видео ачаалж байна</span>
                </div>
              </div>
            ) : null}

            {streamStatus === "error" ? (
              <div className="absolute inset-0 grid place-items-center bg-black/70 px-5 text-center text-sm font-semibold text-rose-100">
                {streamState.message || "Video ачаалж чадсангүй."}
              </div>
            ) : null}

            <div
              data-player-controls="true"
              className={`yotoki-player-controls absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/48 to-transparent px-3 pb-3 pt-16 transition duration-300 ${
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
                className="yotoki-range mb-3 h-1 w-full"
                style={{
                  background: `linear-gradient(to right, rgba(45, 212, 191, 0.96) ${seekPercent}%, rgba(255, 255, 255, 0.36) ${seekPercent}%)`
                }}
              />

              <div className="yotoki-player-control-row flex flex-wrap items-center gap-2 text-white">
                <IconButton label="5 секунд ухрах" onClick={() => seekBy(-5)}>
                  <RotateCcw size={18} />
                </IconButton>

                <IconButton label={isPlaying ? "Pause" : "Play"} onClick={togglePlay}>
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </IconButton>

                <IconButton label="5 секунд урагшлах" onClick={() => seekBy(5)}>
                  <RotateCw size={18} />
                </IconButton>

                {nextEpisode ? (
                  <span className="hidden sm:contents">
                    <IconButton label="Next episode" onClick={() => router.push(`/watch/${media.slug}/${nextEpisode.number}`)}>
                      <SkipForward size={18} />
                    </IconButton>
                  </span>
                ) : null}

                <span className="yotoki-time-label min-w-[92px] text-xs tabular-nums text-slate-300">
                  {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
                </span>

                <div className="yotoki-control-cluster ml-auto flex items-center gap-2">
                  <span className="hidden sm:contents">
                    <IconButton label={isMuted ? "Unmute" : "Mute"} onClick={() => setIsMuted((current) => !current)}>
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </IconButton>
                  </span>
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
                    className="yotoki-range hidden h-1 w-20 sm:block"
                    style={{
                      background: `linear-gradient(to right, rgba(45, 212, 191, 0.96) ${volumePercent}%, rgba(255, 255, 255, 0.32) ${volumePercent}%)`
                    }}
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
        </div>

        <div className="px-2 pb-2 pt-4 sm:px-1">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
            {episode.isFree ? <span className="rounded bg-amber-300/14 px-2 py-1 text-amber-100">ҮНЭГҮЙ</span> : null}
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

      <aside className="soft-border mx-4 h-max rounded-lg bg-white/[0.035] p-3 sm:mx-0">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-semibold text-white">Анги сонгох</h2>
          <span className="text-xs text-slate-500">{media.episodes.length}</span>
        </div>
        <div className="grid gap-2">
          {media.episodes.map((item) => {
            const active = item.id === episode.id;

            return (
              <Link
                className={`relative grid min-h-[78px] grid-cols-[92px_1fr] overflow-hidden rounded-lg border transition ${
                  active
                    ? "border-teal-300/50 bg-teal-300/10"
                    : "border-white/8 bg-black/18 hover:border-white/18 hover:bg-white/[0.055]"
                }`}
                href={`/watch/${media.slug}/${item.number}`}
                key={item.id}
              >
                {item.isFree ? (
                  <span className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-amber-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black shadow-lg shadow-amber-300/20">
                    ҮНЭГҮЙ
                  </span>
                ) : null}
                <div className="relative min-h-full self-stretch">
                  <Image src={item.thumbnail} alt="" fill className="object-cover" sizes="92px" />
                </div>
                <div className="min-w-0 p-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200">EP {item.number}</p>
                  <p className="mt-1 truncate text-sm text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{getEpisodeRuntimeLabel(item)}</p>
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
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`video-control-button yt-focus grid h-9 w-9 place-items-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 ${
        active
          ? "border-teal-300/50 bg-teal-300/18 text-teal-100"
          : "border-white/10 bg-white/8 text-slate-100 hover:border-white/24 hover:bg-white/14"
      }`}
    >
      {children}
    </button>
  );
}

function isLegacyRuntimeLabel(value: string) {
  return value === "24 мин" || value === "Тодорхойгүй";
}

async function getSignedR2Url(path: string) {
  const supabase = createBrowserSupabaseClient();
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Video үзэхийн тулд дахин нэвтэрнэ үү.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch("/api/r2/watch-url", {
    method: "POST",
    headers,
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

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

async function lockLandscapeOrientation() {
  if (typeof screen === "undefined" || !screen.orientation) return;

  const orientation = screen.orientation as LockableScreenOrientation;
  if (!orientation.lock) return;

  try {
    await orientation.lock("landscape");
  } catch {
    // Browsers may reject orientation lock unless fullscreen is active.
  }
}

function unlockOrientation() {
  if (typeof screen === "undefined" || !screen.orientation) return;

  const orientation = screen.orientation as LockableScreenOrientation;
  try {
    orientation.unlock?.();
  } catch {
    // Some mobile browsers expose lock without unlock.
  }
}
