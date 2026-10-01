import Link from "next/link";
import { ATTENDANCE, EVENT_STATUS } from "@/lib/labels";

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
    <div className="mb-5">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm text-brand-600">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-slate-600">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = EVENT_STATUS[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return <span className={`badge ${s.className}`}>{s.label}</span>;
}

export function AttendanceBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="badge bg-slate-100 text-slate-500">Bez odpovědi</span>;
  const s = ATTENDANCE[status];
  return <span className={`badge ${s.className}`}>{s.label}</span>;
}

export function BandDot({ color }: { color: string }) {
  return <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</p>;
}

export const personName = (u: { name: string | null; email: string }) => u.name || u.email;
