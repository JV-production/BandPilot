import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ATTENDANCE, EVENT_STATUS } from "@/lib/labels";

export const personName = (u: { name: string | null; email: string }) => u.name || u.email;

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="-ml-1 mb-2 inline-flex items-center gap-0.5 text-sm font-medium text-brand">
          <ChevronLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] font-black leading-tight tracking-tight">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-ink-2">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, icon: Icon, action }: { children: React.ReactNode; icon?: React.ElementType; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="section-title">
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </h2>
      {action && <div className="mb-2.5">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = EVENT_STATUS[status] ?? { label: status, className: "bg-surface-2 text-ink-2" };
  return <span className={`badge ${s.className}`}>{s.label}</span>;
}

export function AttendanceBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="badge bg-surface-2 text-ink-3">Bez odpovědi</span>;
  const s = ATTENDANCE[status];
  return <span className={`badge ${s.className}`}>{s.label}</span>;
}

export function BandDot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export function Empty({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-3">
      {Icon && <Icon className="h-7 w-7 opacity-60" />}
      <div>{children}</div>
    </div>
  );
}

function hue(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({
  user,
  size = "md",
}: {
  user: { name: string | null; email: string; image?: string | null };
  size?: "sm" | "md" | "lg";
}) {
  const cls = { sm: "h-7 w-7 text-[11px]", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" }[size];
  const name = personName(user);
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt="" className={`${cls} shrink-0 rounded-full object-cover`} />;
  }
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const h = hue(name);
  return (
    <span
      className={`${cls} flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 40) % 360} 70% 45%))` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** Pozadí v barvě kapely – pro hlavičky a dlaždice. */
export function bandGradient(color: string) {
  return { background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #000))` };
}
