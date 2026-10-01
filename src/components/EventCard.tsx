import Link from "next/link";
import { fmt, fmtTime } from "@/lib/time";
import { AttendanceBadge, BandDot, StatusBadge } from "./ui";

type Props = {
  event: {
    id: string;
    title: string;
    status: string;
    startAt: Date;
    departureAt: Date | null;
    venueName: string | null;
    venueAddress: string | null;
    band: { name: string; color: string };
  };
  myStatus?: string | null;
  showAttendance?: boolean;
};

export function EventCard({ event, myStatus, showAttendance }: Props) {
  return (
    <Link href={`/events/${event.id}`} className="card flex min-w-0 gap-4 transition hover:border-brand-300 hover:shadow">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 py-2 text-brand-700">
        <span className="text-xs font-semibold uppercase">{fmt(event.startAt, "EEE")}</span>
        <span className="text-2xl font-extrabold leading-none">{fmt(event.startAt, "d")}</span>
        <span className="text-xs">{fmt(event.startAt, "LLL")}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BandDot color={event.band.color} />
          <span className="truncate">{event.band.name}</span>
        </div>
        <div className={`truncate font-bold ${event.status === "CANCELLED" ? "line-through text-slate-400" : ""}`}>
          {event.title}
        </div>
        <div className="truncate text-sm text-slate-600">
          {[event.venueName, event.venueAddress].filter(Boolean).join(" · ") || "Místo upřesníme"}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {event.departureAt && <span>🚐 odjezd {fmtTime(event.departureAt)}</span>}
          <span>🎤 začátek {fmtTime(event.startAt)}</span>
          <StatusBadge status={event.status} />
          {showAttendance && <AttendanceBadge status={myStatus} />}
        </div>
      </div>
    </Link>
  );
}
