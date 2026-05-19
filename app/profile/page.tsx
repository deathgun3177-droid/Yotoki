import { SiteHeader } from "@/components/site-header";
import { UserProfilePanel } from "@/components/user-profile-panel";

export default function ProfilePage() {
  return (
    <main className="cinema-shell min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#050506]">
      <SiteHeader compact />
      <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <UserProfilePanel />
      </div>
    </main>
  );
}
