"use client";

import { Banknote } from "lucide-react";
import { useEffect, useState } from "react";
import {
  defaultPaymentSettings,
  loadPaymentSettings,
  paymentSettingsEventName,
  readLocalPaymentSettings
} from "@/lib/payment-settings";
import type { PaymentSettings } from "@/lib/types";

export function PaymentInfoCard() {
  const [settings, setSettings] = useState<PaymentSettings>(defaultPaymentSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const nextSettings = await loadPaymentSettings();
      if (!active) return;
      setSettings(nextSettings);
      setLoading(false);
    }

    function handleSettingsUpdate(event: Event) {
      const nextSettings = (event as CustomEvent<PaymentSettings>).detail ?? readLocalPaymentSettings();
      setSettings(nextSettings);
    }

    queueMicrotask(() => {
      void loadSettings();
    });
    window.addEventListener(paymentSettingsEventName, handleSettingsUpdate);

    return () => {
      active = false;
      window.removeEventListener(paymentSettingsEventName, handleSettingsUpdate);
    };
  }, []);

  return (
    <div className={`rounded-lg bg-black/22 p-5 ${loading ? "loading-bar" : ""}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-teal-300/14 text-teal-100">
          <Banknote size={21} />
        </span>
        <div>
          <h2 className="font-semibold text-white">1 сарын үзэх эрх</h2>
          <p className="text-sm text-slate-500">{settings.accessDays} хоног</p>
        </div>
      </div>

      <div className="grid gap-3 text-sm">
        <InfoRow label="Үнэ" value={settings.monthlyPrice} strong />
        <InfoRow label="Банк" value={settings.bankName} />
        <InfoRow label="Данс" value={settings.accountNumber} mono />
        <InfoRow label="Дансны нэр" value={settings.accountName} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-white/[0.045] px-3 py-3">
      <span className="text-slate-500">{label}</span>
      <span
        className={`${mono ? "font-mono" : ""} ${strong ? "text-lg font-semibold text-teal-100" : "font-medium text-white"} text-right`}
      >
        {value}
      </span>
    </div>
  );
}
