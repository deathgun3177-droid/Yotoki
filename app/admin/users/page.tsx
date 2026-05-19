import { AdminOnly } from "@/components/admin-only";
import { AdminUsersPanel } from "@/components/admin-users-panel";
import { SiteHeader } from "@/components/site-header";

export default function AdminUsersPage() {
  return (
    <main className="cinema-shell min-h-screen bg-[#050506]">
      <SiteHeader compact />
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <AdminOnly>
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-teal-200/70">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Users</h1>
          </div>
          <AdminUsersPanel />
        </AdminOnly>
      </div>
    </main>
  );
}
