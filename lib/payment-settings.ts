import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PaymentSettings } from "@/lib/types";

export const paymentSettingsTableName = process.env.NEXT_PUBLIC_SUPABASE_PAYMENT_SETTINGS_TABLE || "payment_settings";
export const paymentSettingsRowId = "default";
export const paymentSettingsEventName = "yotoki:payment-settings-updated";

const localPaymentSettingsKey = "yotoki:payment-settings";

export const defaultPaymentSettings: PaymentSettings = {
  monthlyPrice: "7,500₮",
  accessDays: 30,
  bankName: "Khan Bank",
  accountNumber: "5000000000",
  accountName: "YotoKi"
};

type PaymentSettingsRow = {
  monthly_price?: unknown;
  access_days?: unknown;
  bank_name?: unknown;
  account_number?: unknown;
  account_name?: unknown;
  updated_at?: unknown;
};

export async function loadPaymentSettings(): Promise<PaymentSettings> {
  if (!isSupabaseConfigured()) {
    return readLocalPaymentSettings();
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) return readLocalPaymentSettings();

  const { data, error } = await supabase
    .from(paymentSettingsTableName)
    .select("monthly_price,access_days,bank_name,account_number,account_name,updated_at")
    .eq("id", paymentSettingsRowId)
    .maybeSingle();

  if (error || !data) {
    return readLocalPaymentSettings();
  }

  return fromPaymentSettingsRow(data);
}

export async function savePaymentSettings(settings: PaymentSettings) {
  const cleanSettings = normalizePaymentSettings(settings);

  if (!isSupabaseConfigured()) {
    saveLocalPaymentSettings(cleanSettings);
    return { ok: true, settings: cleanSettings };
  }

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    saveLocalPaymentSettings(cleanSettings);
    return { ok: true, settings: cleanSettings };
  }

  const { data, error } = await supabase
    .from(paymentSettingsTableName)
    .upsert({
      id: paymentSettingsRowId,
      monthly_price: cleanSettings.monthlyPrice,
      access_days: cleanSettings.accessDays,
      bank_name: cleanSettings.bankName,
      account_number: cleanSettings.accountNumber,
      account_name: cleanSettings.accountName,
      updated_at: new Date().toISOString()
    })
    .select("monthly_price,access_days,bank_name,account_number,account_name,updated_at")
    .single();

  if (error) {
    return { ok: false, message: error.message, settings: cleanSettings };
  }

  const savedSettings = fromPaymentSettingsRow(data);
  window.dispatchEvent(new CustomEvent(paymentSettingsEventName, { detail: savedSettings }));
  return { ok: true, settings: savedSettings };
}

export function readLocalPaymentSettings(): PaymentSettings {
  if (typeof window === "undefined") return defaultPaymentSettings;

  try {
    const raw = window.localStorage.getItem(localPaymentSettingsKey);
    if (!raw) return defaultPaymentSettings;
    return normalizePaymentSettings(JSON.parse(raw));
  } catch {
    return defaultPaymentSettings;
  }
}

export function saveLocalPaymentSettings(settings: PaymentSettings) {
  if (typeof window === "undefined") return;

  const nextSettings = {
    ...normalizePaymentSettings(settings),
    updatedAt: new Date().toISOString()
  };

  window.localStorage.setItem(localPaymentSettingsKey, JSON.stringify(nextSettings));
  window.dispatchEvent(new CustomEvent(paymentSettingsEventName, { detail: nextSettings }));
}

export function normalizePaymentSettings(settings: Partial<PaymentSettings>): PaymentSettings {
  const accessDays = Number(settings.accessDays);

  return {
    monthlyPrice: cleanString(settings.monthlyPrice, defaultPaymentSettings.monthlyPrice),
    accessDays: Number.isFinite(accessDays) && accessDays > 0 ? Math.round(accessDays) : defaultPaymentSettings.accessDays,
    bankName: cleanString(settings.bankName, defaultPaymentSettings.bankName),
    accountNumber: cleanString(settings.accountNumber, defaultPaymentSettings.accountNumber),
    accountName: cleanString(settings.accountName, defaultPaymentSettings.accountName),
    updatedAt: settings.updatedAt
  };
}

function fromPaymentSettingsRow(row: PaymentSettingsRow): PaymentSettings {
  return normalizePaymentSettings({
    monthlyPrice: typeof row.monthly_price === "string" ? row.monthly_price : undefined,
    accessDays: typeof row.access_days === "number" ? row.access_days : undefined,
    bankName: typeof row.bank_name === "string" ? row.bank_name : undefined,
    accountNumber: typeof row.account_number === "string" ? row.account_number : undefined,
    accountName: typeof row.account_name === "string" ? row.account_name : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined
  });
}

function cleanString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
