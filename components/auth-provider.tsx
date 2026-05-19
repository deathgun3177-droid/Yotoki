"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearLocalAuthUser,
  createLocalAuthUser,
  findLocalUserByEmail,
  localAuthEventName,
  readLocalAuthUser,
  saveLocalAuthUser
} from "@/lib/auth/local-auth";
import { getSupabaseUserRole, getUserRole } from "@/lib/auth/roles";
import { ensureSupabaseUserNumber, getUserNumberFromMetadata, profileTableName } from "@/lib/auth/user-number";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { YotokiUser } from "@/lib/types";

type AuthResult = {
  ok: boolean;
  message?: string;
  signedIn?: boolean;
};

type AuthContextValue = {
  user: YotokiUser | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const isConfigured = isSupabaseConfigured();
  const [user, setUser] = useState<YotokiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      const syncLocalUser = () => {
        if (!active) return;
        setUser(readLocalAuthUser());
        setLoading(false);
      };

      queueMicrotask(syncLocalUser);
      window.addEventListener(localAuthEventName, syncLocalUser);

      return () => {
        active = false;
        window.removeEventListener(localAuthEventName, syncLocalUser);
      };
    }

    async function applySupabaseUser(supabaseUser: User | null) {
      if (!active) return;

      if (!supabaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(await toYotokiUser(supabaseUser, supabase));
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      void applySupabaseUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySupabaseUser(session?.user ?? null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!supabase) {
        try {
          const localUser = findLocalUserByEmail(email) ?? createLocalAuthUser(email);
          const nextUser = { ...localUser, email, role: getUserRole(email) };
          saveLocalAuthUser(nextUser);
          setUser(nextUser);
          return { ok: true, signedIn: true, message: "Local demo account-аар нэвтэрлээ." };
        } catch (error) {
          return { ok: false, message: error instanceof Error ? error.message : "User ID үүсгэж чадсангүй." };
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, message: getFriendlyAuthError(error) };

      if (data.user) {
        setUser(await toYotokiUser(data.user, supabase));
      }

      return { ok: true, signedIn: true, message: "Амжилттай нэвтэрлээ." };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string): Promise<AuthResult> => {
      if (!supabase) {
        try {
          const localUser = createLocalAuthUser(email, displayName);
          saveLocalAuthUser(localUser);
          setUser(localUser);
          return { ok: true, signedIn: true, message: "Local demo account үүслээ." };
        } catch (error) {
          return { ok: false, message: error instanceof Error ? error.message : "User ID үүсгэж чадсангүй." };
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName?.trim() || undefined
          }
        }
      });

      if (error) return { ok: false, message: getFriendlyAuthError(error) };

      if (data.session?.user) {
        setUser(await toYotokiUser(data.session.user, supabase));
        return { ok: true, signedIn: true, message: "Бүртгэл үүслээ." };
      }

      return { ok: true, signedIn: false, message: "Бүртгэл үүслээ. Имэйлээ баталгаажуулна уу." };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      clearLocalAuthUser();
      setUser(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const updateProfile = useCallback(
    async (displayName: string): Promise<AuthResult> => {
      const cleanName = displayName.trim();

      if (!user) {
        return { ok: false, message: "Эхлээд нэвтэрнэ үү." };
      }

      if (!supabase) {
        const nextUser = { ...user, displayName: cleanName || undefined };
        saveLocalAuthUser(nextUser);
        setUser(nextUser);
        return { ok: true, message: "Профайл хадгалагдлаа." };
      }

      const { data, error } = await supabase.auth.updateUser({
        data: {
          display_name: cleanName || null
        }
      });

      if (error) return { ok: false, message: getFriendlyAuthError(error) };
      if (data.user) setUser(await toYotokiUser(data.user, supabase));

      return { ok: true, message: "Профайл хадгалагдлаа." };
    },
    [supabase, user]
  );

  const value = useMemo(
    () => ({ user, loading, isConfigured, signIn, signUp, signOut, updateProfile }),
    [isConfigured, loading, signIn, signOut, signUp, updateProfile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}

async function toYotokiUser(user: User, supabase?: ReturnType<typeof createBrowserSupabaseClient>): Promise<YotokiUser> {
  const displayName = getDisplayName(user);
  const userNumber = supabase ? await ensureSupabaseUserNumber(supabase, user) : getUserNumberFromMetadata(user);
  const watchAccessExpiresAt = supabase ? await getSupabaseWatchAccessExpiresAt(supabase, user.id) : undefined;

  return {
    id: user.id,
    userNumber: userNumber ?? 1,
    email: user.email ?? "unknown@yotoki.local",
    role: getSupabaseUserRole(user),
    watchAccessExpiresAt,
    displayName,
    provider: "supabase",
    createdAt: user.created_at
  };
}

async function getSupabaseWatchAccessExpiresAt(supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>, userId: string) {
  const { data } = await supabase
    .from(profileTableName)
    .select("watch_access_expires_at")
    .eq("id", userId)
    .maybeSingle();

  const value = data?.watch_access_expires_at;
  return typeof value === "string" ? value : undefined;
}

function getDisplayName(user: User) {
  const value = user.user_metadata?.display_name ?? user.user_metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getFriendlyAuthError(error: { message?: string }) {
  const message = error.message ?? "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit") || normalized.includes("rate limit exceeded")) {
    return "Имэйл илгээх лимит түр хэтэрсэн байна. Түр хүлээгээд дахин оролдоорой, эсвэл Supabase Auth > Users дээр test хэрэглэгчийг гараар үүсгээрэй.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Имэйл эсвэл нууц үг буруу байна.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Имэйл баталгаажаагүй байна. Gmail дээр ирсэн холбоосоор баталгаажуулна уу.";
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "Энэ имэйлээр бүртгэл үүссэн байна. Нэвтрэх хэсгээр орно уу.";
  }

  if (normalized.includes("password")) {
    return "Нууц үгээ шалгана уу. Дор хаяж 6 тэмдэгттэй байх хэрэгтэй.";
  }

  return message || "Нэвтрэх үйлдэл амжилтгүй боллоо.";
}
