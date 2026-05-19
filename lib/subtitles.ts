type LoadedSubtitle = {
  url: string;
  vtt: string;
  cues: SubtitleCue[];
};

export type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};

const videoExtensionPattern = /\.(mp4|m4v|webm|mov|mkv)(?:$|[?#])/i;

export async function loadMongolianSubtitle(videoUrl: string, subtitleUrl?: string): Promise<LoadedSubtitle | null> {
  const candidates = buildSubtitleCandidates(videoUrl, subtitleUrl);

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      const vtt = subtitleToVtt(text, candidate);
      const cues = parseVttCues(vtt);
      if (!cues.length) {
        continue;
      }

      return {
        url: candidate,
        vtt,
        cues
      };
    } catch {
      continue;
    }
  }

  return null;
}

export function filenamesMatch(videoName?: string, subtitleName?: string) {
  if (!videoName || !subtitleName) return false;
  return stripExtension(videoName).toLowerCase() === stripExtension(subtitleName).toLowerCase();
}

function buildSubtitleCandidates(videoUrl: string, subtitleUrl?: string) {
  const candidates = subtitleUrl ? [subtitleUrl] : [];
  const cleanVideoUrl = stripUrlSuffix(videoUrl);

  if (videoExtensionPattern.test(cleanVideoUrl)) {
    const baseUrl = cleanVideoUrl.replace(/\.(mp4|m4v|webm|mov|mkv)$/i, "");
    candidates.push(`${baseUrl}.vtt`, `${baseUrl}.srt`, `${baseUrl}.ass`);
  }

  return [...new Set(candidates)];
}

export function subtitleToVtt(input: string, sourceUrl: string) {
  const lowerPath = getCleanPath(sourceUrl);

  if (lowerPath.endsWith(".vtt")) {
    const vtt = input.trimStart().startsWith("WEBVTT") ? input : `WEBVTT\n\n${input}`;
    return liftCuePosition(vtt);
  }

  if (lowerPath.endsWith(".ass")) {
    return liftCuePosition(assToVtt(input));
  }

  return liftCuePosition(srtToVtt(input));
}

export function parseVttCues(vtt: string): SubtitleCue[] {
  const normalized = vtt.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    if (block === "WEBVTT" || block.startsWith("WEBVTT\n")) {
      continue;
    }

    const lines = block.split("\n");
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) {
      continue;
    }

    const timing = lines[timingIndex];
    const match = timing.match(/((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/);
    if (!match) {
      continue;
    }

    const text = lines
      .slice(timingIndex + 1)
      .join("\n")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (!text) {
      continue;
    }

    cues.push({
      start: vttTimeToSeconds(match[1]),
      end: vttTimeToSeconds(match[2]),
      text
    });
  }

  return cues.sort((a, b) => a.start - b.start);
}

function srtToVtt(input: string) {
  const normalized = input.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const withoutIndexes = normalized.replace(/^\s*\d+\s*$/gm, "").trim();
  const timestamps = withoutIndexes.replace(
    /((?:\d{1,2}:)?\d{1,2}:\d{2})[,.](\d{1,3})\s+-->\s+((?:\d{1,2}:)?\d{1,2}:\d{2})[,.](\d{1,3})([^\n]*)/g,
    (_match, start: string, startMs: string, end: string, endMs: string, settings: string) =>
      `${normalizeSubtitleTime(start, startMs)} --> ${normalizeSubtitleTime(end, endMs)}${settings || ""}`
  );

  return `WEBVTT\n\n${timestamps}\n`;
}

function assToVtt(input: string) {
  const lines = input.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let format = ["Layer", "Start", "End", "Style", "Name", "MarginL", "MarginR", "MarginV", "Effect", "Text"];
  const cues: string[] = [];

  for (const line of lines) {
    const cleanLine = line.trimStart();

    if (cleanLine.startsWith("Format:")) {
      format = cleanLine
        .slice("Format:".length)
        .split(",")
        .map((item) => item.trim());
      continue;
    }

    if (!cleanLine.startsWith("Dialogue:")) {
      continue;
    }

    const values = splitAssDialogue(cleanLine.slice("Dialogue:".length), format.length);
    const startIndex = format.indexOf("Start");
    const endIndex = format.indexOf("End");
    const textIndex = format.indexOf("Text");

    if (startIndex < 0 || endIndex < 0 || textIndex < 0 || !values[startIndex] || !values[endIndex]) {
      continue;
    }

    const text = values
      .slice(textIndex)
      .join(",")
      .replace(/\{[^}]*}/g, "")
      .replace(/\\N/g, "\n")
      .replace(/\\h/g, " ")
      .trim();

    if (!text) {
      continue;
    }

    cues.push(`${assTimeToVtt(values[startIndex])} --> ${assTimeToVtt(values[endIndex])}\n${text}`);
  }

  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

function assTimeToVtt(value: string) {
  const [hours = "0", minutes = "00", secondPart = "00.00"] = value.trim().split(":");
  const [seconds = "00", centiseconds = "00"] = secondPart.split(".");
  const paddedHours = hours.padStart(2, "0");
  const paddedMinutes = minutes.padStart(2, "0");
  const paddedSeconds = seconds.padStart(2, "0");
  const milliseconds = centiseconds.padEnd(3, "0").slice(0, 3);

  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}.${milliseconds}`;
}

function normalizeSubtitleTime(time: string, milliseconds: string) {
  const parts = time.split(":").map((part) => part.padStart(2, "0"));
  const [hours, minutes, seconds] = parts.length === 2 ? ["00", parts[0], parts[1]] : parts;
  return `${hours}:${minutes}:${seconds}.${milliseconds.padEnd(3, "0").slice(0, 3)}`;
}

function splitAssDialogue(value: string, expectedColumns: number) {
  const values = value.split(",");
  const textColumn = Math.max(0, expectedColumns - 1);

  if (values.length <= expectedColumns) {
    return values;
  }

  return [...values.slice(0, textColumn), values.slice(textColumn).join(",")];
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function vttTimeToSeconds(value: string) {
  const parts = value.split(":");
  const secondsPart = parts.pop() ?? "0";
  const minutes = Number(parts.pop() ?? 0);
  const hours = Number(parts.pop() ?? 0);
  const seconds = Number(secondsPart);

  return hours * 3600 + minutes * 60 + seconds;
}

function getCleanPath(sourceUrl: string) {
  try {
    return new URL(sourceUrl, "http://yotoki.local").pathname.toLowerCase();
  } catch {
    return sourceUrl.split(/[?#]/)[0].toLowerCase();
  }
}

function stripUrlSuffix(value: string) {
  return value.split(/[?#]/)[0];
}

function liftCuePosition(vtt: string) {
  return vtt.replace(
    /^((?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(?:\d{2}:)?\d{2}:\d{2}\.\d{3})([^\n]*)$/gm,
    (_match, timing: string, settings: string) => {
      if (settings.includes("line:")) {
        return `${timing}${settings}`;
      }

      return `${timing}${settings} line:88% position:50% align:center`;
    }
  );
}
