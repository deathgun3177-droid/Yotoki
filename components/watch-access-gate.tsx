"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { hasActiveWatchAccess } from "@/lib/auth/access";
import { useAuth } from "@/components/auth-provider";

export function WatchAccessGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-slate-400 sm:px-6 lg:px-8">Эрх шалгаж байна...</div>;
  }

  if (!user) {
    return (
      <AccessMessage
        title="Нэвтрэх шаардлагатай"
        description="Анги, кино үзэхийн тулд аккаунтаараа нэвтэрнэ үү."
        href="/auth"
        action="Нэвтрэх"
      />
    );
  }

  if (!hasActiveWatchAccess(user)) {
    return (
      <AccessMessage
        title="Үзэх эрх идэвхгүй байна"
        description="Үзэх эрх авах эсвэл сунгуулах мэдээллээ шалгаад, гүйлгээний утга дээр User ID-гаа бичнэ үү."
        href="/info"
        action="Мэдээлэл харах"
      />
    );
  }

  return children;
}

function AccessMessage({
  title,
  description,
  href,
  action
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="soft-border mx-auto max-w-xl rounded-lg bg-white/[0.035] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-amber-300/12 text-amber-100">
          <Lock size={24} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        <Link className="mt-5 inline-flex rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black" href={href}>
          {action}
        </Link>
      </div>
    </div>
  );
}
