import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient, requireServerAdmin } from "@/lib/auth/server-auth";

export const runtime = "nodejs";

const episodesTable = process.env.NEXT_PUBLIC_SUPABASE_EPISODES_TABLE || "media_episodes";

type ToggleFreeBody = {
  episodeId?: string;
  isFree?: boolean;
};

export async function PATCH(request: Request) {
  const auth = await requireServerAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as ToggleFreeBody | null;
  if (!body?.episodeId || typeof body.isFree !== "boolean") {
    return NextResponse.json({ error: "Ангийн ID эсвэл ON/OFF утга дутуу байна." }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient() ?? createServerSupabaseClient(auth.token);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase тохиргоо дутуу байна." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from(episodesTable)
    .update({
      is_free: body.isFree,
      updated_at: new Date().toISOString()
    })
    .eq("id", body.episodeId)
    .select("id,is_free")
    .maybeSingle();

  if (error) {
    const message = error.message.includes("is_free")
      ? "Supabase дээр is_free column нэмэх хэрэгтэй. supabase/media_content.sql-г SQL Editor дээр ажиллуулна уу."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      {
        error:
          "Анги update хийгдсэнгүй. Admin role эсвэл Supabase RLS policy-г шалгана уу. Боломжтой бол SUPABASE_SERVICE_ROLE_KEY-г Vercel env дээр нэмвэл admin update найдвартай ажиллана."
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ episodeId: data.id, isFree: Boolean(data.is_free) });
}
