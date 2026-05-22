import { PaymentInfoCard } from "@/components/payment-info-card";
import { PaymentUserIdCard } from "@/components/payment-user-id-card";
import { SiteHeader } from "@/components/site-header";

export default function InfoPage() {
  return (
    <main className="cinema-shell min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#050506]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <section className="soft-border overflow-hidden rounded-lg bg-white/[0.04]">
          <div className="border-b border-white/8 p-5 sm:p-7">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-teal-200/70">Lumi+</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Мэдээлэл</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Үзэх эрхээ сунгуулахдаа доорх данс руу шилжүүлэг хийж, гүйлгээний утга дээр өөрийн User ID-г бичнэ үү.
            </p>
          </div>

          <div className="grid gap-4 p-5 sm:p-7 md:grid-cols-[1fr_0.85fr]">
            <PaymentInfoCard />
            <PaymentUserIdCard />
          </div>
        </section>
      </div>
    </main>
  );
}
