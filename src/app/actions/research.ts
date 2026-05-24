"use server";

import { prisma } from "@/lib/prisma";
import { recordProgressEvent } from "@/lib/progress";

const RESEARCH_PHASES = [
  "planning",
  "lit_review",
  "methodology",
  "data",
  "writing",
  "done",
] as const;

type ResearchPhase = (typeof RESEARCH_PHASES)[number];

export type DashboardResearchTopic = {
  id: string;
  title: string;
  phase: string;
  notesUrl: string | null;
  targetDate: string | null;
  startedAt: string;
};

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type AddResearchTopicInput = {
  title: string;
  phase?: string;
  notesUrl?: string;
  targetDate?: string;
};

type UpdateResearchPhaseInput = {
  topicId: string;
  phase: string;
};

function toResearchPhase(value: string): ResearchPhase | null {
  if ((RESEARCH_PHASES as readonly string[]).includes(value)) {
    return value as ResearchPhase;
  }
  return null;
}

const researchTopicSelect = {
  id: true,
  title: true,
  phase: true,
  notesUrl: true,
  targetDate: true,
  startedAt: true,
} as const;

type ResearchTopicRow = {
  id: string;
  title: string;
  phase: string;
  notesUrl: string | null;
  targetDate: Date | null;
  startedAt: Date;
};

function toDashboardResearchTopic(row: ResearchTopicRow): DashboardResearchTopic {
  return {
    ...row,
    targetDate: row.targetDate?.toISOString() ?? null,
    startedAt: row.startedAt.toISOString(),
  };
}

export async function listResearchTopics(): Promise<DashboardResearchTopic[]> {
  const rows = await prisma.researchTopic.findMany({
    orderBy: [{ startedAt: "desc" }, { title: "asc" }],
    select: researchTopicSelect,
  });
  return rows.map((row) => toDashboardResearchTopic(row));
}

export async function addResearchTopic(
  input: AddResearchTopicInput,
): Promise<ActionResult<DashboardResearchTopic>> {
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Research topic title is required." };

  const phase = input.phase ? toResearchPhase(input.phase) : "planning";
  if (!phase) return { ok: false, error: "Invalid research phase." };

  try {
    const created = await prisma.researchTopic.create({
      data: {
        title,
        phase,
        ...(input.notesUrl?.trim() ? { notesUrl: input.notesUrl.trim() } : {}),
        ...(input.targetDate ? { targetDate: new Date(input.targetDate) } : {}),
      },
      select: researchTopicSelect,
    });

    return { ok: true, data: toDashboardResearchTopic(created) };
  } catch {
    return { ok: false, error: "Could not add research topic." };
  }
}

export async function updateResearchPhase(
  input: UpdateResearchPhaseInput,
): Promise<ActionResult<DashboardResearchTopic>> {
  const phase = toResearchPhase(input.phase);
  if (!phase) return { ok: false, error: "Invalid research phase." };

  const existing = await prisma.researchTopic.findUnique({
    where: { id: input.topicId },
    select: { id: true, phase: true },
  });
  if (!existing) return { ok: false, error: "Research topic not found." };

  if (existing.phase === phase) {
    const current = await prisma.researchTopic.findUnique({
      where: { id: input.topicId },
      select: researchTopicSelect,
    });
    if (!current) return { ok: false, error: "Research topic not found." };
    return { ok: true, data: toDashboardResearchTopic(current) };
  }

  try {
    const updated = await prisma.researchTopic.update({
      where: { id: input.topicId },
      data: { phase },
      select: researchTopicSelect,
    });

    const isDone = phase === "done";
    await recordProgressEvent({
      entityType: "research",
      entityId: updated.id,
      eventType: isDone ? "completed" : "progressed",
      xp: isDone ? 40 : 15,
      note: `Phase: ${existing.phase} -> ${phase}`,
    });

    return { ok: true, data: toDashboardResearchTopic(updated) };
  } catch {
    return { ok: false, error: "Could not update research phase." };
  }
}
