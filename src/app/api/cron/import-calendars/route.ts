import { autoImportStale } from "@/lib/calendar-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Denní import koncertů z Google Kalendářů (Vercel Cron). Vyžaduje CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await autoImportStale();
  return Response.json({ ok: true });
}
