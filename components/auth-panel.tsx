"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type AuthMode = "login" | "sign-up";

export function AuthPanel({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/profile");
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const result =
      mode === "login"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName);

    setStatus(result.ok ? "success" : "error");
    setMessage(result.message ?? "");

    if (result.ok && result.signedIn) {
      router.push("/profile");
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-md items-center justify-center"
    >
      <div className="soft-border w-full rounded-lg bg-white/[0.04] p-5 shadow-2xl shadow-black/30 sm:p-7">
        <div className="mb-6 grid grid-cols-2 rounded-lg border border-white/10 bg-black/24 p-1">
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              mode === "login" ? "bg-teal-300 text-black" : "text-slate-300 hover:text-white"
            }`}
            type="button"
            onClick={() => setMode("login")}
          >
            Нэвтрэх
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              mode === "sign-up" ? "bg-teal-300 text-black" : "text-slate-300 hover:text-white"
            }`}
            type="button"
            onClick={() => setMode("sign-up")}
          >
            Бүртгүүлэх
          </button>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {mode === "login" ? "YotoKi-д нэвтрэх" : "Шинэ хэрэглэгч үүсгэх"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Аккаунтаараа нэвтэрч үзэж байсан ангиа үргэлжлүүлээрэй.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {mode === "sign-up" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Display name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
                placeholder="Жишээ: Бат"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
              placeholder="name@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
              placeholder="6+ тэмдэгт"
            />
          </label>

          <button
            disabled={status === "submitting"}
            className="yt-focus inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-300 px-5 text-sm font-semibold text-black transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {status === "submitting" ? "Түр хүлээнэ үү" : mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
          </button>

          {message ? (
            <p className={`text-sm ${status === "error" ? "text-rose-300" : "text-teal-200"}`}>{message}</p>
          ) : null}
        </form>
      </div>
    </motion.section>
  );
}
