import { AuthPanel } from "@/components/auth-panel";
import { SiteHeader } from "@/components/site-header";

type AuthPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { mode } = await searchParams;

  return (
    <main className="cinema-shell min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#050506]">
      <SiteHeader compact />
      <div className="mx-auto w-full px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-12 lg:px-8">
        <AuthPanel initialMode={mode === "sign-up" ? "sign-up" : "login"} />
      </div>
    </main>
  );
}
