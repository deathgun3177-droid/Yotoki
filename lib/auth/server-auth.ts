import { createClient } from "@supabase/supabase-js";
import { profileTableName } from "@/lib/auth/user-number";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type ServerAuthUser = {
  id: string;
  email?: string;
  role: "user" | "admin";
};

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [type, token] = header.split(" ");
  return type?.toLowerCase() === "bearer" && token ? token : null;
}

export async function getServerAuthUser(request: Request): Promise<{ token: string; user: ServerAuthUser } | { error: string; status: number }> {
  const token = getBearerToken(request);
  if (!token) {
    return { error: "Нэвтрэх шаардлагатай.", status: 401 };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { error: "Supabase тохиргоо дутуу байна.", status: 500 };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { error: "Session хүчингүй байна. Дахин нэвтэрнэ үү.", status: 401 };
  }

  return {
    token,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: data.user.app_metadata?.role === "admin" ? "admin" : "user"
    }
  };
}

export async function requireServerAdmin(request: Request) {
  const result = await getServerAuthUser(request);
  if ("error" in result) return result;

  if (result.user.role !== "admin") {
    return { error: "Admin эрх шаардлагатай.", status: 403 };
  }

  return result;
}

export async function requireWatchAccess(request: Request) {
  const result = await getServerAuthUser(request);
  if ("error" in result) return result;

  if (result.user.role === "admin") {
    return result;
  }

  const supabase = createServerSupabaseClient(result.token);
  if (!supabase) {
    return { error: "Supabase тохиргоо дутуу байна.", status: 500 };
  }

  const { data, error } = await supabase
    .from(profileTableName)
    .select("watch_access_expires_at")
    .eq("id", result.user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message, status: 403 };
  }

  const expiresAt = typeof data?.watch_access_expires_at === "string" ? Date.parse(data.watch_access_expires_at) : 0;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return { error: "Үзэх эрх идэвхгүй байна.", status: 403 };
  }

  return result;
}

function createServerSupabaseClient(token?: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
