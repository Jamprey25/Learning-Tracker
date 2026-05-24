"use server";

import { prisma } from "@/lib/prisma";
import { recordProgressEvent } from "@/lib/progress";

const VENTURE_STAGES = ["idea", "validating", "building", "launched"] as const;
type VentureStage = (typeof VENTURE_STAGES)[number];

export type DashboardVenture = {
  id: string;
  name: string;
  oneLiner: string | null;
  stage: string;
  startedAt: string;
  keyMetricLabel: string | null;
  keyMetricValue: number | null;
  keyMetricUpdatedAt: string | null;
};

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type AddVentureInput = {
  name: string;
  oneLiner?: string;
  stage?: string;
  keyMetricLabel?: string;
  keyMetricValue?: number;
};

type UpdateVentureStageInput = {
  ventureId: string;
  stage: string;
};

type UpdateVentureMetricInput = {
  ventureId: string;
  keyMetricLabel?: string;
  keyMetricValue?: number;
};

function toVentureStage(value: string): VentureStage | null {
  if ((VENTURE_STAGES as readonly string[]).includes(value)) {
    return value as VentureStage;
  }
  return null;
}

const ventureSelect = {
  id: true,
  name: true,
  oneLiner: true,
  stage: true,
  startedAt: true,
  keyMetricLabel: true,
  keyMetricValue: true,
  keyMetricUpdatedAt: true,
} as const;

type VentureRow = {
  id: string;
  name: string;
  oneLiner: string | null;
  stage: string;
  startedAt: Date;
  keyMetricLabel: string | null;
  keyMetricValue: number | null;
  keyMetricUpdatedAt: Date | null;
};

function toDashboardVenture(row: VentureRow): DashboardVenture {
  return {
    ...row,
    startedAt: row.startedAt.toISOString(),
    keyMetricUpdatedAt: row.keyMetricUpdatedAt?.toISOString() ?? null,
  };
}

export async function listVentures(): Promise<DashboardVenture[]> {
  const rows = await prisma.venture.findMany({
    orderBy: [{ startedAt: "desc" }, { name: "asc" }],
    select: ventureSelect,
  });
  return rows.map((row) => toDashboardVenture(row));
}

export async function addVenture(input: AddVentureInput): Promise<ActionResult<DashboardVenture>> {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Venture name is required." };

  const stage = input.stage ? toVentureStage(input.stage) : "idea";
  if (!stage) return { ok: false, error: "Invalid venture stage." };

  try {
    const created = await prisma.venture.create({
      data: {
        name,
        ...(input.oneLiner?.trim() ? { oneLiner: input.oneLiner.trim() } : {}),
        stage,
        ...(input.keyMetricLabel?.trim() ? { keyMetricLabel: input.keyMetricLabel.trim() } : {}),
        ...(typeof input.keyMetricValue === "number" && Number.isFinite(input.keyMetricValue)
          ? {
              keyMetricValue: input.keyMetricValue,
              keyMetricUpdatedAt: new Date(),
            }
          : {}),
      },
      select: ventureSelect,
    });

    return { ok: true, data: toDashboardVenture(created) };
  } catch {
    return { ok: false, error: "Could not add venture." };
  }
}

export async function updateVentureStage(
  input: UpdateVentureStageInput,
): Promise<ActionResult<DashboardVenture>> {
  const stage = toVentureStage(input.stage);
  if (!stage) return { ok: false, error: "Invalid venture stage." };

  const existing = await prisma.venture.findUnique({
    where: { id: input.ventureId },
    select: { id: true, stage: true },
  });
  if (!existing) return { ok: false, error: "Venture not found." };

  if (existing.stage === stage) {
    const current = await prisma.venture.findUnique({
      where: { id: input.ventureId },
      select: ventureSelect,
    });
    if (!current) return { ok: false, error: "Venture not found." };
    return { ok: true, data: toDashboardVenture(current) };
  }

  try {
    const updated = await prisma.venture.update({
      where: { id: input.ventureId },
      data: { stage },
      select: ventureSelect,
    });

    await recordProgressEvent({
      entityType: "venture",
      entityId: updated.id,
      eventType: "progressed",
      xp: 30,
      note: `Stage: ${existing.stage} -> ${stage}`,
    });

    return { ok: true, data: toDashboardVenture(updated) };
  } catch {
    return { ok: false, error: "Could not update venture stage." };
  }
}

export async function updateVentureMetric(
  input: UpdateVentureMetricInput,
): Promise<ActionResult<DashboardVenture>> {
  const hasLabel = typeof input.keyMetricLabel === "string";
  const hasValue = typeof input.keyMetricValue === "number" && Number.isFinite(input.keyMetricValue);
  if (!hasLabel && !hasValue) {
    return { ok: false, error: "Provide a metric label or metric value." };
  }

  try {
    const updated = await prisma.venture.update({
      where: { id: input.ventureId },
      data: {
        ...(hasLabel ? { keyMetricLabel: input.keyMetricLabel?.trim() || null } : {}),
        ...(hasValue ? { keyMetricValue: input.keyMetricValue ?? null } : {}),
        keyMetricUpdatedAt: new Date(),
      },
      select: ventureSelect,
    });

    await recordProgressEvent({
      entityType: "venture",
      entityId: updated.id,
      eventType: "progressed",
      xp: 5,
      note: updated.keyMetricLabel ? `Metric updated: ${updated.keyMetricLabel}` : "Metric updated",
    });

    return { ok: true, data: toDashboardVenture(updated) };
  } catch {
    return { ok: false, error: "Could not update venture metric." };
  }
}
