"use client";

import Link from "next/link";
import { Check, CircleAlert, Copy, LogIn } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { formatPublicUserId } from "@/lib/auth/user-number";

export function PaymentUserIdCard() {
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const userId = useMemo(() => (user ? formatPublicUserId(user.userNumber) : ""), [user]);

  async function copyUserId() {
    if (!userId) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(userId);
      } else if (!copyTextFallback(userId)) {
        throw new Error("Clipboard fallback failed.");
      }
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      if (copyTextFallback(userId)) {
        setCopied(true);
        setCopyError("");
        window.setTimeout(() => setCopied(false), 1600);
        return;
      }

      setCopyError("Хуулах боломжгүй байна. User ID-гаа гараар хуулна уу.");
    }
  }

  return (
    <div className="rounded-lg border border-amber-300/18 bg-amber-300/8 p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-amber-300/14 text-amber-100">
          <CircleAlert size={21} />
        </span>
        <h2 className="font-semibold text-white">Гүйлгээний утга</h2>
      </div>

      <div className="rounded-lg bg-black/24 p-4">
        <p className="text-sm text-slate-400">Гүйлгээний утга дээр өөрийн User ID-г бичнэ:</p>
        <p className="mt-2 font-mono text-2xl font-semibold text-teal-100">
          {loading ? "..." : userId || "Нэвтрэх хэрэгтэй"}
        </p>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">
        User ID бичээгүй шилжүүлгийг баталгаажуулахад удааширч магадгүй.
      </p>

      {userId ? (
        <button
          className="yt-focus mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-teal-200"
          type="button"
          onClick={copyUserId}
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? "User ID хууллаа" : "User ID хуулах"}
        </button>
      ) : (
        <Link
          className="yt-focus mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-teal-200"
          href="/auth"
        >
          <LogIn size={17} />
          Нэвтрэх
        </Link>
      )}

      {copyError ? <p className="mt-3 text-sm text-rose-200">{copyError}</p> : null}
    </div>
  );
}

function copyTextFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    return true;
  } finally {
    document.body.removeChild(textarea);
  }
}
