import { NextResponse } from "next/server";
import { requireServerAdmin } from "@/lib/auth/server-auth";
import { createR2UploadUrl, isR2Configured, sanitizeR2Key } from "@/lib/r2";
import { toR2StoragePath } from "@/lib/r2-paths";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireServerAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 тохиргоо дутуу байна." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { key?: string; contentType?: string } | null;
  if (!body?.key) {
    return NextResponse.json({ error: "R2 object key дутуу байна." }, { status: 400 });
  }

  try {
    const key = sanitizeR2Key(body.key);
    const uploadUrl = await createR2UploadUrl(key, body.contentType || "application/octet-stream");

    return NextResponse.json({
      key,
      storagePath: toR2StoragePath(key),
      uploadUrl
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "R2 upload URL үүсгэж чадсангүй." }, { status: 500 });
  }
}
