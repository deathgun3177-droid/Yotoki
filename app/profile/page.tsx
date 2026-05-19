import { SiteHeader } from "@/components/site-header";
import { UserProfilePanel } from "@/components/user-profile-panel";

export default function ProfilePage() {
  return (
    <main className="cinema-shell min-h-screen bg-[#050506]">
      <SiteHeader compact />
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <UserProfilePanel />
      </div>
    </main>
  );
}
