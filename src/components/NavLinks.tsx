"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Music2, Settings, Users, Wallet } from "lucide-react";

const LINKS = [
  { href: "/", label: "Koncerty", icon: CalendarDays, admin: false },
  { href: "/bands", label: "Kapely", icon: Music2, admin: false },
  { href: "/earnings", label: "Honoráře", icon: Wallet, admin: false },
  { href: "/admin/users", label: "Lidé", icon: Users, admin: true },
  { href: "/settings", label: "Nastavení", icon: Settings, admin: false },
];

export function NavLinks({ isAdmin, variant }: { isAdmin: boolean; variant: "top" | "bottom" }) {
  const pathname = usePathname();
  return (
    <>
      {LINKS.filter((l) => !l.admin || isAdmin).map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/events") : pathname.startsWith(href);
        if (variant === "top") {
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                active ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 pt-2 text-[10.5px] font-semibold transition ${
              active ? "text-brand" : "text-ink-3"
            }`}
          >
            <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-brand-soft" : ""}`}>
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
            </span>
            {label}
          </Link>
        );
      })}
    </>
  );
}
