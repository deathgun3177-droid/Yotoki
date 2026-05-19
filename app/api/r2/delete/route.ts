import { NextResponse } from "next/server";
import { requireServerAdmin } from "@/lib/auth/server-auth";
import { deleteR2Object, isR2Configured, sanitizeR2Key } from "@/lib/r2";
import { fromR2StoragePath, isR2StoragePath } from "@/lib/r2-paths";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireServerAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 тохиргоо дутуу байна." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { paths?: string[] } | null;
  const paths = Array.isArray(body?.paths) ? body.paths.filter(isR2StoragePath) : [];
  if (!paths.length) {
    return NextResponse.json({ deleted: 0 });
  }

  try {
    for (const path of paths) {
      await deleteR2Object(sanitizeR2Key(fromR2StoragePath(path)));
    }

    return NextResponse.json({ deleted: paths.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "R2 файл устгаж чадсангүй." }, { status: 500 });
  }
}
