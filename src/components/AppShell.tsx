import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const isAdmin = user.role === "ADMIN";
  return (
    <div className="min-h-screen">
      <header className="safe-top sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-brand-700">
            <span aria-hidden>🎸</span> BandPilot
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLinks isAdmin={isAdmin} variant="top" />
          </nav>
          <Link href="/settings" className="flex items-center gap-2 text-sm text-slate-600">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                {(user.name || user.email)[0]?.toUpperCase()}
              </span>
            )}
            <span className="hidden sm:inline">{user.name || user.email}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 md:pb-10">{children}</main>

      {/* Spodní navigace pro telefony (iOS / Android) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          <NavLinks isAdmin={isAdmin} variant="bottom" />
        </div>
      </nav>
    </div>
  );
}
