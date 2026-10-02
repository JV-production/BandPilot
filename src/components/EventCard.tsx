import Link from "next/link";
import { Bus, Clock, MapPin } from "lucide-react";
import { fmt, fmtTime } from "@/lib/time";
import { AttendanceBadge, StatusBadge, bandGradient } from "./ui";

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
  const cancelled = event.status === "CANCELLED";
  return (
    <Link
      href={`/events/${event.id}`}
      className={`card group flex min-w-0 gap-4 p-3 transition hover:-translate-y-0.5 hover:border-brand/40 sm:p-3 ${cancelled ? "opacity-60" : ""}`}
    >
      <div
        className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl py-2.5 text-white shadow-sm"
        style={bandGradient(event.band.color)}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{fmt(event.startAt, "EEE")}</span>
        <span className="font-display text-[1.7rem] font-black leading-none">{fmt(event.startAt, "d")}</span>
        <span className="text-[11px] font-semibold opacity-90">{fmt(event.startAt, "LLL")}</span>
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold" style={{ color: event.band.color }}>
              {event.band.name}
            </div>
            <div className={`truncate text-[17px] font-bold leading-snug ${cancelled ? "line-through" : ""}`}>{event.title}</div>
          </div>
          <StatusBadge status={event.status} />
        </div>
        <div className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{event.venueName || event.venueAddress || "Místo upřesníme"}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {event.departureAt && (
            <span className="chip">
              <Bus className="h-3.5 w-3.5" /> {fmtTime(event.departureAt)}
            </span>
          )}
          <span className="chip">
            <Clock className="h-3.5 w-3.5" /> {fmtTime(event.startAt)}
          </span>
          {showAttendance && <AttendanceBadge status={myStatus} />}
        </div>
      </div>
    </Link>
  );
}
