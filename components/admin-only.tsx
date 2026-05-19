"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="soft-border loading-bar rounded-lg bg-white/[0.035] p-8 text-slate-400">Шалгаж байна...</div>;
  }

  if (!user) {
    return (
      <AccessBox
        title="Нэвтрэх шаардлагатай"
        description="Энэ admin хэсэг зөвхөн эрхтэй хэрэглэгчид нээлттэй."
        actionLabel="Нэвтрэх"
        href="/auth"
      />
    );
  }

  if (user.role !== "admin") {
    return (
      <AccessBox
        title="Admin эрх шаардлагатай"
        description="Энэ хэсэг зөвхөн admin profile дээрээс ашиглагдана."
        actionLabel="Профайл руу буцах"
        href="/profile"
      />
    );
  }

  return children;
}

function AccessBox({
  title,
  description,
  actionLabel,
  href
}: {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <div className="soft-border mx-auto max-w-xl rounded-lg bg-white/[0.035] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-rose-300/12 text-rose-100">
        <ShieldAlert size={24} />
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <Link className="mt-5 inline-flex rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black" href={href}>
        {actionLabel}
      </Link>
    </div>
  );
}
