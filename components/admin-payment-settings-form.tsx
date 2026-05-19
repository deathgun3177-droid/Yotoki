"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Banknote, Save } from "lucide-react";
import { defaultPaymentSettings, loadPaymentSettings, savePaymentSettings } from "@/lib/payment-settings";
import type { PaymentSettings } from "@/lib/types";

type SaveState = "idle" | "saving" | "done" | "error";

export function AdminPaymentSettingsForm() {
  const [settings, setSettings] = useState<PaymentSettings>(defaultPaymentSettings);
  const [status, setStatus] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(async () => {
      setSettings(await loadPaymentSettings());
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const result = await savePaymentSettings(settings);
    if (!result.ok) {
      setStatus("error");
      setMessage(result.message ?? "Хадгалж чадсангүй.");
      return;
    }

    setSettings(result.settings);
    setStatus("done");
    setMessage("Мэдээлэл хадгалагдлаа.");
  }

  function updateField<Key extends keyof PaymentSettings>(key: Key, value: PaymentSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="soft-border rounded-lg bg-white/[0.035] p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Үнийн дүн" value={settings.monthlyPrice} onChange={(value) => updateField("monthlyPrice", value)} />
          <NumberField label="Үзэх хоног" value={settings.accessDays} onChange={(value) => updateField("accessDays", value)} />
          <TextField label="Банк" value={settings.bankName} onChange={(value) => updateField("bankName", value)} />
          <TextField label="Дансны дугаар" value={settings.accountNumber} onChange={(value) => updateField("accountNumber", value)} />
          <TextField label="Дансны нэр" value={settings.accountName} onChange={(value) => updateField("accountName", value)} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            className="yt-focus inline-flex items-center gap-2 rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={status === "saving"}
          >
            <Save size={18} />
            {status === "saving" ? "Хадгалж байна" : "Хадгалах"}
          </button>

          <Link
            className="yt-focus inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-teal-300/35"
            href="/info"
          >
            Мэдээлэл харах
          </Link>

          {message ? <span className={`text-sm ${status === "error" ? "text-rose-300" : "text-teal-200"}`}>{message}</span> : null}
        </div>
      </section>

      <aside className="soft-border h-max rounded-lg bg-white/[0.035] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-teal-300/14 text-teal-100">
            <Banknote size={20} />
          </span>
          <h2 className="font-semibold text-white">Preview</h2>
        </div>

        <div className="mt-4 grid gap-3 text-sm">
          <PreviewRow label="Үнэ" value={settings.monthlyPrice} strong />
          <PreviewRow label="Хоног" value={`${settings.accessDays || 30} хоног`} />
          <PreviewRow label="Банк" value={settings.bankName} />
          <PreviewRow label="Данс" value={settings.accountNumber} mono />
          <PreviewRow label="Дансны нэр" value={settings.accountName} />
        </div>
      </aside>
    </form>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        value={value}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        className="yt-focus h-11 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm text-white focus:border-teal-300/45"
      />
    </label>
  );
}

function PreviewRow({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-black/20 p-3">
      <span className="text-slate-500">{label}</span>
      <span className={`${mono ? "font-mono" : ""} ${strong ? "font-semibold text-teal-100" : "text-slate-200"} text-right`}>
        {value}
      </span>
    </div>
  );
}
