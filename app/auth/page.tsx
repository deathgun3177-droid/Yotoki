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
    <main className="cinema-shell min-h-screen bg-[#050506]">
      <SiteHeader compact />
      <div className="mx-auto w-full px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <AuthPanel initialMode={mode === "sign-up" ? "sign-up" : "login"} />
      </div>
    </main>
  );
}
