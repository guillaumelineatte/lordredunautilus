import { timingSafeEqual } from "node:crypto";
import { runDailyJobs } from "@/server/cron/daily";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// appelée tous les jours par Vercel Cron, avec Authorization: Bearer $CRON_SECRET
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const results = await runDailyJobs();
  return Response.json({ ok: true, results });
}
