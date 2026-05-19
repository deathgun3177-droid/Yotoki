"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Check, Copy, Edit3, LogOut, Settings, UploadCloud, UserRound, UsersRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { formatAccessStatus } from "@/lib/auth/access";
import { formatPublicUserId } from "@/lib/auth/user-number";
import type { YotokiUser } from "@/lib/types";

export function UserProfilePanel() {
  const router = useRouter();
  const { user, loading, signOut, updateProfile } = useAuth();
  const [copied, setCopied] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  async function copyUserId() {
    if (!user) return;
    await navigator.clipboard.writeText(formatPublicUserId(user.userNumber));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (loading) {
    return <div className="soft-border loading-bar rounded-lg bg-white/[0.035] p-8 text-slate-400">Профайл ачаалж байна...</div>;
  }

  if (!user) {
    return (
      <div className="soft-border rounded-lg bg-white/[0.035] p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">Нэвтрээгүй байна</h1>
        <p className="mt-2 text-slate-400">Профайл болон user ID харахын тулд эхлээд нэвтэрнэ үү.</p>
        <Link className="mt-5 inline-flex rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black" href="/auth">
          Нэвтрэх
        </Link>
      </div>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <ProfileForm user={user} onSave={updateProfile} />

      <aside className="grid h-max gap-4">
        <div className="soft-border rounded-lg bg-white/[0.035] p-5">
          <h2 className="font-semibold text-white">User info</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <InfoRow label="User ID" value={formatPublicUserId(user.userNumber)} mono />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Үзэх эрх" value={formatAccessStatus(user)} />
            <InfoRow label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("mn-MN") : "-"} />
          </dl>

          <button
            className="yt-focus mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-teal-300/35"
            type="button"
            onClick={copyUserId}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? "Хуулагдлаа" : "User ID хуулах"}
          </button>

          <button
            className="yt-focus mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/16"
            type="button"
            onClick={handleSignOut}
          >
            <LogOut size={17} />
            Гарах
          </button>
        </div>

        {user.role === "admin" ? (
          <div className="soft-border rounded-lg bg-teal-300/8 p-5">
            <h2 className="font-semibold text-white">Admin tools</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Видео, хадмал, thumbnail нийтлэх хэсэг.</p>
            <Link
              className="yt-focus mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-teal-200"
              href="/admin/upload"
            >
              <UploadCloud size={17} />
              Upload panel
            </Link>
            <Link
              className="yt-focus mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-teal-300/35"
              href="/admin/content"
            >
              <Edit3 size={17} />
              Content manage
            </Link>
            <Link
              className="yt-focus mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-teal-300/35"
              href="/admin/users"
            >
              <UsersRound size={17} />
              Users
            </Link>
            <Link
              className="yt-focus mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-teal-300/35"
              href="/admin/settings"
            >
              <Settings size={17} />
              Мэдээлэл засах
            </Link>
          </div>
        ) : null}
      </aside>
    </section>
  );
}

function ProfileForm({
  user,
  onSave
}: {
  user: YotokiUser;
  onSave: (displayName: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [message, setMessage] = useState("");

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await onSave(displayName);
    setMessage(result.message ?? "");
  }

  return (
    <div className="soft-border rounded-lg bg-white/[0.035] p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-16 w-16 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-teal-300 text-black">
          <UserRound size={28} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold tracking-tight text-white">{user.displayName || "YotoKi хэрэглэгч"}</h1>
          <p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-7 grid max-w-xl gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
            placeholder="Таны нэр"
          />
        </label>

        <button className="yt-focus w-max rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-teal-200" type="submit">
          Профайл хадгалах
        </button>

        {message ? <p className="text-sm text-teal-200">{message}</p> : null}
      </form>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-black/20 p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className={`mt-1 break-all text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
