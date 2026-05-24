"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { recordProgressEvent } from "@/lib/progress";

const PROJECT_STATUSES = ["planning", "active", "shipped", "shelved"] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type DashboardMilestone = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  orderIndex: number;
  completedAt: string | null;
};

export type DashboardProject = {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  status: string;
  category: string;
  startedAt: string;
  shippedAt: string | null;
  milestones: DashboardMilestone[];
};

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type AddProjectInput = {
  name: string;
  description?: string;
  repoUrl?: string;
  category?: string;
};

type UpdateProjectStatusInput = {
  projectId: string;
  status: string;
};

type AddMilestoneInput = {
  projectId: string;
  title: string;
};

type CompleteMilestoneInput = {
  milestoneId: string;
};

type ReorderMilestonesInput = {
  projectId: string;
  milestoneIds: string[];
};

const projectSelect = {
  id: true,
  name: true,
  description: true,
  repoUrl: true,
  status: true,
  category: true,
  startedAt: true,
  shippedAt: true,
  milestones: {
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      projectId: true,
      title: true,
      status: true,
      orderIndex: true,
      completedAt: true,
    },
  },
} as const;

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  status: string;
  category: string;
  startedAt: Date;
  shippedAt: Date | null;
  milestones: Array<{
    id: string;
    projectId: string;
    title: string;
    status: string;
    orderIndex: number;
    completedAt: Date | null;
  }>;
};

function toProjectStatus(value: string): ProjectStatus | null {
  if ((PROJECT_STATUSES as readonly string[]).includes(value)) {
    return value as ProjectStatus;
  }
  return null;
}

function toDashboardProject(project: ProjectRow): DashboardProject {
  return {
    ...project,
    startedAt: project.startedAt.toISOString(),
    shippedAt: project.shippedAt?.toISOString() ?? null,
    milestones: project.milestones.map((milestone) => ({
      ...milestone,
      completedAt: milestone.completedAt?.toISOString() ?? null,
    })),
  };
}

export async function listProjects(): Promise<DashboardProject[]> {
  const rows = await prisma.project.findMany({
    orderBy: [{ startedAt: "desc" }, { name: "asc" }],
    select: projectSelect,
  });
  return rows.map((row) => toDashboardProject(row));
}

export async function addProject(input: AddProjectInput): Promise<ActionResult<DashboardProject>> {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Project name is required." };

  try {
    const created = await prisma.project.create({
      data: {
        name,
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.repoUrl?.trim() ? { repoUrl: input.repoUrl.trim() } : {}),
        category: input.category?.trim() || "General",
      },
      select: projectSelect,
    });

    return { ok: true, data: toDashboardProject(created) };
  } catch {
    return { ok: false, error: "Could not add project." };
  }
}

export async function updateProjectStatus(
  input: UpdateProjectStatusInput,
): Promise<ActionResult<DashboardProject>> {
  const status = toProjectStatus(input.status);
  if (!status) return { ok: false, error: "Invalid project status." };

  const existing = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, status: true, shippedAt: true },
  });
  if (!existing) return { ok: false, error: "Project not found." };

  const becameShipped = existing.status !== "shipped" && status === "shipped";

  try {
    const updated = await prisma.project.update({
      where: { id: input.projectId },
      data: {
        status,
        ...(status === "shipped"
          ? { shippedAt: existing.shippedAt ?? new Date() }
          : existing.status === "shipped"
            ? { shippedAt: null }
            : {}),
      },
      select: projectSelect,
    });

    if (becameShipped) {
      await recordProgressEvent({
        entityType: "project",
        entityId: updated.id,
        eventType: "shipped",
        xp: 50,
      });
      // TODO: v2 — auto-fetch recent GitHub commits and append release evidence.
    }

    return { ok: true, data: toDashboardProject(updated) };
  } catch {
    return { ok: false, error: "Could not update project status." };
  }
}

export async function addMilestone(
  input: AddMilestoneInput,
): Promise<ActionResult<DashboardProject>> {
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Milestone title is required." };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: input.projectId },
        select: { id: true },
      });
      if (!project) return null;

      const maxOrder = await tx.milestone.aggregate({
        where: { projectId: input.projectId },
        _max: { orderIndex: true },
      });
      const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

      await tx.milestone.create({
        data: {
          projectId: input.projectId,
          title,
          orderIndex: nextOrder,
        },
      });

      return tx.project.findUnique({
        where: { id: input.projectId },
        select: projectSelect,
      });
    });

    if (!updated) return { ok: false, error: "Project not found." };
    return { ok: true, data: toDashboardProject(updated) };
  } catch {
    return { ok: false, error: "Could not add milestone." };
  }
}

export async function completeMilestone(
  input: CompleteMilestoneInput,
): Promise<ActionResult<DashboardProject>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.findUnique({
        where: { id: input.milestoneId },
        select: { id: true, projectId: true, status: true, completedAt: true },
      });
      if (!milestone) return { kind: "not_found" as const };

      const shouldEmit = milestone.status !== "done";
      if (shouldEmit) {
        await tx.milestone.update({
          where: { id: input.milestoneId },
          data: { status: "done", completedAt: milestone.completedAt ?? new Date() },
        });
      }

      const updated = await tx.project.findUnique({
        where: { id: milestone.projectId },
        select: projectSelect,
      });
      if (!updated) return { kind: "not_found" as const };

      return { kind: "ok" as const, project: updated, shouldEmit };
    });

    if (result.kind === "not_found") {
      return { ok: false, error: "Milestone not found." };
    }

    if (result.shouldEmit) {
      await recordProgressEvent({
        entityType: "milestone",
        entityId: input.milestoneId,
        eventType: "progressed",
        xp: 10,
      });
    }

    return { ok: true, data: toDashboardProject(result.project) };
  } catch {
    return { ok: false, error: "Could not complete milestone." };
  }
}

export async function reorderMilestones(
  input: ReorderMilestonesInput,
): Promise<ActionResult<DashboardProject>> {
  if (!Array.isArray(input.milestoneIds) || input.milestoneIds.length === 0) {
    return { ok: false, error: "Milestone order is required." };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.milestone.findMany({
        where: { projectId: input.projectId },
        select: { id: true },
      });
      if (existing.length === 0) return null;

      const existingIds = new Set(existing.map((milestone) => milestone.id));
      const incomingIds = new Set(input.milestoneIds);
      if (existingIds.size !== incomingIds.size) {
        throw new Error("MISMATCHED_MILESTONES");
      }
      for (const id of incomingIds) {
        if (!existingIds.has(id)) throw new Error("MISMATCHED_MILESTONES");
      }

      await Promise.all(
        input.milestoneIds.map((id, index) =>
          tx.milestone.update({
            where: { id },
            data: { orderIndex: index },
          }),
        ),
      );

      return tx.project.findUnique({
        where: { id: input.projectId },
        select: projectSelect,
      });
    });

    if (!updated) return { ok: false, error: "Project not found." };
    return { ok: true, data: toDashboardProject(updated) };
  } catch (e) {
    if (e instanceof Error && e.message === "MISMATCHED_MILESTONES") {
      return { ok: false, error: "Milestone order does not match project milestones." };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "Project not found." };
    }
    return { ok: false, error: "Could not reorder milestones." };
  }
}
