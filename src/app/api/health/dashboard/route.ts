import { Prisma } from "@/generated/prisma/client";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { getActivityByDay } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const steps: Array<{ step: string; ok: boolean; error?: string; code?: string }> = [];

  async function runStep(step: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      steps.push({ step, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({
        step,
        ok: false,
        error: message.split("\n")[0],
        code:
          error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
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
      hint: steps.some((step) => step.error?.includes("max clients"))
        ? "Supabase session pool (5432) hit its client limit. Keep connection_limit=1 and avoid many parallel serverless invocations, or upgrade pool size."
        : undefined,
    },
    { status: ok ? 200 : 500 },
  );
}
