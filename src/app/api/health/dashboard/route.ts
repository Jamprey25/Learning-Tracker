import { Prisma } from "@/generated/prisma/client";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { getActivityByDay } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const steps: Array<{
    step: string;
    ok: boolean;
    error?: string;
    code?: string;
    meta?: unknown;
  }> = [];

  async function runStep(step: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      steps.push({ step, ok: true });
    } catch (error) {
      const prismaError =
        error instanceof Prisma.PrismaClientKnownRequestError ? error : null;
      const message =
        prismaError?.message ||
        (error instanceof Error ? error.message : String(error));

      steps.push({
        step,
        ok: false,
        error: message.split("\n")[0] || "Query failed",
        code: prismaError?.code,
        meta: prismaError?.meta,
      });
    }
  }

  await runStep("getDashboardSummary", getDashboardSummary);
  await runStep("getActivityByDay", () => getActivityByDay(84));

  const ok = steps.every((step) => step.ok);

  return Response.json(
    {
      ok,
      steps,
      hint: steps.some((step) => step.code === "P1011")
        ? "TLS connection failed. Keep sslmode out of DATABASE_URL when using this app; it configures pg SSL internally."
        : steps.some((step) => step.code === "P2010")
          ? "Raw SQL failed. Redeploy latest main — activity aggregation no longer uses $queryRaw."
          : steps.some((step) => step.error?.includes("max clients"))
            ? "Supabase session pool (5432) hit its client limit. Keep connection_limit=1 and avoid many parallel serverless invocations, or upgrade pool size."
            : undefined,
    },
    { status: ok ? 200 : 500 },
  );
}
