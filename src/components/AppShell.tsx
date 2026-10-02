import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { Avatar } from "./ui";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const isAdmin = user.role === "ADMIN";
  return (
    <div className="min-h-screen">
      <header className="safe-top sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" aria-label="BandPilot – domů">
            <Logo size="sm" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLinks isAdmin={isAdmin} variant="top" />
          </nav>
          <Link href="/settings" className="flex items-center gap-2 rounded-full text-sm font-medium text-ink-2">
            <span className="hidden sm:inline">{user.name || user.email}</span>
            <Avatar user={user} size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 md:pb-12">{children}</main>

      {/* Spodní lišta pro telefony (iOS / Android) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-bg/85 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md">
          <NavLinks isAdmin={isAdmin} variant="bottom" />
        </div>
      </nav>
    </div>
  );
}
