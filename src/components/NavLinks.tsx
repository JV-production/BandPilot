"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Koncerty", icon: "🗓️", admin: false },
  { href: "/bands", label: "Kapely", icon: "🎶", admin: false },
  { href: "/earnings", label: "Honoráře", icon: "💰", admin: false },
  { href: "/admin/users", label: "Uživatelé", icon: "👥", admin: true },
  { href: "/settings", label: "Nastavení", icon: "⚙️", admin: false },
];

export function NavLinks({ isAdmin, variant }: { isAdmin: boolean; variant: "top" | "bottom" }) {
  const pathname = usePathname();
  return (
    <>
      {LINKS.filter((l) => !l.admin || isAdmin).map((link) => {
        const active = link.href === "/" ? pathname === "/" || pathname.startsWith("/events") : pathname.startsWith(link.href);
        if (variant === "top") {
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {link.label}
            </Link>
          );
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-w-[60px] flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-medium ${active ? "text-brand-700" : "text-slate-500"}`}
          >
            <span className="text-xl leading-none" aria-hidden>
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
