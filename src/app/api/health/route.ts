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
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('videos', 'ProgressEvent', 'Streak', 'Course', 'Project')
      ORDER BY table_name
    `;

    return Response.json({
      ok: true,
      database: target,
      tables: tables.map((row) => row.table_name),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;

    return Response.json(
      {
        ok: false,
        database: target,
        error: message.split("\n")[0],
        code,
        hint:
          target.port === "6543"
            ? "This app uses @prisma/adapter-pg. Prefer Supabase session pooler port 5432 for DATABASE_URL on Vercel."
            : undefined,
      },
      { status: 500 },
    );
  }
}
