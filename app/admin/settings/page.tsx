import { AdminOnly } from "@/components/admin-only";
import { AdminPaymentSettingsForm } from "@/components/admin-payment-settings-form";
import { SiteHeader } from "@/components/site-header";

export default function AdminSettingsPage() {
  return (
    <main className="cinema-shell min-h-screen bg-[#050506]">
      <SiteHeader compact />
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <AdminOnly>
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-teal-200/70">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Мэдээлэл засах</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Үнийн дүн, үзэх хоног, банк болон дансны мэдээллээ эндээс шинэчилнэ.
            </p>
          </div>
          <AdminPaymentSettingsForm />
        </AdminOnly>
      </div>
    </main>
  );
}
