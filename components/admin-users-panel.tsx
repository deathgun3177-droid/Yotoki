"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, ShieldX } from "lucide-react";
import { addWatchAccessDays, formatAccessStatus, removeWatchAccess } from "@/lib/auth/access";
import { readLocalUsers, updateLocalUser } from "@/lib/auth/local-auth";
import { formatPublicUserId, profileTableName } from "@/lib/auth/user-number";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { YotokiUser } from "@/lib/types";

export function AdminUsersPanel() {
  const [users, setUsers] = useState<YotokiUser[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const supabaseConfigured = isSupabaseConfigured();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage("");

    if (!supabaseConfigured) {
      setUsers(readLocalUsers());
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setUsers(readLocalUsers());
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from(profileTableName)
      .select("id,email,display_name,user_number,role,watch_access_expires_at,created_at")
      .order("created_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      setMessage(error?.message ?? "Users уншиж чадсангүй.");
      setUsers(readLocalUsers());
      setLoading(false);
      return;
    }

    setUsers(
      data.map((row) => ({
        id: String(row.id),
        userNumber: Number(row.user_number),
        email: String(row.email ?? ""),
        displayName: typeof row.display_name === "string" ? row.display_name : undefined,
        watchAccessExpiresAt: typeof row.watch_access_expires_at === "string" ? row.watch_access_expires_at : undefined,
        role: row.role === "admin" ? "admin" : "user",
        provider: "supabase",
        createdAt: typeof row.created_at === "string" ? row.created_at : undefined
      }))
    );
    setLoading(false);
  }, [supabaseConfigured]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadUsers();
    });
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalized = normalizeQuery(query);
    if (!normalized) return users;

    return users.filter((user) => {
      const haystack = [
        user.email,
        user.displayName ?? "",
        String(user.userNumber),
        formatPublicUserId(user.userNumber)
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [query, users]);

  async function grantAccess(user: YotokiUser) {
    await saveAccess(addWatchAccessDays(user));
  }

  async function revokeAccess(user: YotokiUser) {
    await saveAccess(removeWatchAccess(user));
  }

  async function saveAccess(nextUser: YotokiUser) {
    if (nextUser.provider === "local" || !supabaseConfigured) {
      updateLocalUser(nextUser);
      setUsers(readLocalUsers());
      setMessage(`${formatPublicUserId(nextUser.userNumber)} шинэчлэгдлээ.`);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from(profileTableName)
      .update({ watch_access_expires_at: nextUser.watchAccessExpiresAt ?? null })
      .eq("id", nextUser.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadUsers();
    setMessage(`${formatPublicUserId(nextUser.userNumber)} шинэчлэгдлээ.`);
  }

  return (
    <section className="space-y-4">
      <div className="soft-border rounded-lg bg-white/[0.035] p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-300/45"
            placeholder="Email, нэр эсвэл #3177 гэж хайх"
          />
        </div>
        {message ? <p className="mt-3 text-sm text-teal-200">{message}</p> : null}
      </div>

      <div className="soft-border overflow-hidden rounded-lg bg-white/[0.035]">
        <div className="grid grid-cols-[1fr_120px_170px] gap-3 border-b border-white/8 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 max-md:hidden">
          <span>User</span>
          <span>User ID</span>
          <span>Үзэх эрх</span>
        </div>

        {loading ? (
          <div className="loading-bar p-6 text-sm text-slate-400">Users ачаалж байна...</div>
        ) : filteredUsers.length ? (
          <div className="divide-y divide-white/8">
            {filteredUsers.map((user) => (
              <UserRow key={user.id} user={user} onGrant={() => grantAccess(user)} onRevoke={() => revokeAccess(user)} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-400">Илэрц олдсонгүй.</div>
        )}
      </div>
    </section>
  );
}

function UserRow({
  user,
  onGrant,
  onRevoke
}: {
  user: YotokiUser;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  const isAdmin = user.role === "admin";

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_120px_170px] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{user.displayName || "Lumi+ хэрэглэгч"}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
      </div>
      <p className="font-mono text-sm text-teal-100">{formatPublicUserId(user.userNumber)}</p>
      <div>
        <p className="mb-2 text-sm text-slate-300">{formatAccessStatus(user)}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isAdmin}
            onClick={onGrant}
            className="yt-focus inline-flex items-center gap-1.5 rounded-md bg-teal-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShieldCheck size={14} />
            +30 хоног
          </button>
          <button
            type="button"
            disabled={isAdmin}
            onClick={onRevoke}
            className="yt-focus inline-flex items-center gap-1.5 rounded-md border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/16 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShieldX size={14} />
            Хасах
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeQuery(value: string) {
  return value.trim().replace(/^#/, "").toLowerCase();
}
