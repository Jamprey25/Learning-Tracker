import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dbTargetSummary(): { host: string; port: string; user: string } | null {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: url.port || "5432",
      user: url.username || "unknown",
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const target = dbTargetSummary();
  if (!target) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not set or invalid" },
      { status: 500 },
    );
  }

  try {
    const [videoCount, eventCount, streakCount] = await Promise.all([
      prisma.video.count(),
      prisma.progressEvent.count(),
      prisma.streak.count(),
    ]);

    return Response.json({
      ok: true,
      database: target,
      counts: { videos: videoCount, progressEvents: eventCount, streakRows: streakCount },
    });
  } catch (error) {
    const prismaError =
      error instanceof Prisma.PrismaClientKnownRequestError ? error : null;
    const message =
      prismaError?.message ||
      (error instanceof Error ? error.message : String(error));

    return Response.json(
      {
        ok: false,
        database: target,
        error: message.split("\n")[0] || "Database query failed",
        code: prismaError?.code,
        meta: prismaError?.meta,
        hint:
          target.port === "6543"
            ? "This app uses @prisma/adapter-pg. Prefer Supabase session pooler port 5432 for DATABASE_URL on Vercel."
            : undefined,
      },
      { status: 500 },
    );
  }
}
