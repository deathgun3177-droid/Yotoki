import { NextResponse } from "next/server";
import { requireWatchAccess } from "@/lib/auth/server-auth";
import { createR2ReadUrl, isR2Configured, sanitizeR2Key } from "@/lib/r2";
import { fromR2StoragePath, isR2StoragePath } from "@/lib/r2-paths";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireWatchAccess(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 тохиргоо дутуу байна." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { path?: string } | null;
  if (!body?.path || !isR2StoragePath(body.path)) {
    return NextResponse.json({ error: "R2 path буруу байна." }, { status: 400 });
  }

  try {
    const key = sanitizeR2Key(fromR2StoragePath(body.path));
    const url = await createR2ReadUrl(key);
    return NextResponse.json({ url, expiresIn: 60 * 60 * 6 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "R2 watch URL үүсгэж чадсангүй." }, { status: 500 });
  }
}
