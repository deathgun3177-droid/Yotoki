import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerAuthUser, requireWatchAccess } from "@/lib/auth/server-auth";
import { createR2ReadUrl, isR2Configured, sanitizeR2Key } from "@/lib/r2";
import { fromR2StoragePath, isR2StoragePath } from "@/lib/r2-paths";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mediaEpisodesTable = process.env.NEXT_PUBLIC_SUPABASE_EPISODES_TABLE || "media_episodes";

export async function POST(request: Request) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 тохиргоо дутуу байна." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { path?: string } | null;
  if (!body?.path || !isR2StoragePath(body.path)) {
    return NextResponse.json({ error: "R2 path буруу байна." }, { status: 400 });
  }

  const isFreePath = await isFreeEpisodePath(body.path);
  const auth = isFreePath ? await getServerAuthUser(request) : await requireWatchAccess(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const key = sanitizeR2Key(fromR2StoragePath(body.path));
    const url = await createR2ReadUrl(key);
    return NextResponse.json({ url, expiresIn: 60 * 60 * 6 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "R2 watch URL үүсгэж чадсангүй." }, { status: 500 });
  }
}

async function isFreeEpisodePath(path: string) {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const [videoMatch, subtitleMatch] = await Promise.all([
    supabase.from(mediaEpisodesTable).select("id").eq("is_free", true).eq("video_path", path).limit(1).maybeSingle(),
    supabase.from(mediaEpisodesTable).select("id").eq("is_free", true).eq("subtitle_path", path).limit(1).maybeSingle()
  ]);

  return Boolean(videoMatch.data || subtitleMatch.data);
}
