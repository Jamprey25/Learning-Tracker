"use server";

import { Prisma } from "@/generated/prisma/client";
import {
  normalizeCompletedModules,
  normalizeTotalModules,
  toCourseStatus,
  type CourseStatus,
} from "@/lib/course-progress";
import { prisma } from "@/lib/prisma";
import { recordProgressEvent } from "@/lib/progress";

export type DashboardCourse = {
  id: string;
  title: string;
  provider: string | null;
  url: string | null;
  totalModules: number;
  completedModules: number;
  status: string;
  category: string;
  startedAt: string;
  targetCompletionDate: string | null;
  completedAt: string | null;
};

type CourseRow = {
  id: string;
  title: string;
  provider: string | null;
  url: string | null;
  totalModules: number;
  completedModules: number;
  status: string;
  category: string;
  startedAt: Date;
  targetCompletionDate: Date | null;
  completedAt: Date | null;
};

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type AddCourseInput = {
  title: string;
  provider?: string;
  url?: string;
  totalModules?: number;
  category?: string;
  targetCompletionDate?: string;
};

type UpdateCourseProgressInput = { courseId: string; completedModules: number };
type CompleteCourseModuleInput = { moduleId: string };
type SetCourseStatusInput = { courseId: string; status: string };

const courseSelect = {
  id: true,
  title: true,
  provider: true,
  url: true,
  totalModules: true,
  completedModules: true,
  status: true,
  category: true,
  startedAt: true,
  targetCompletionDate: true,
  completedAt: true,
} as const;

function toDashboardCourse(course: CourseRow): DashboardCourse {
  return {
    ...course,
    startedAt: course.startedAt.toISOString(),
    targetCompletionDate: course.targetCompletionDate?.toISOString() ?? null,
    completedAt: course.completedAt?.toISOString() ?? null,
  };
}

async function emitCourseCompletedIfNeeded(courseId: string, becameCompleted: boolean) {
  if (!becameCompleted) return;
  await recordProgressEvent({ entityType: "course", entityId: courseId, eventType: "completed", xp: 25 });
}

export async function listCourses(): Promise<DashboardCourse[]> {
  const rows = await prisma.course.findMany({ orderBy: { startedAt: "desc" }, select: courseSelect });
  return rows.map((row) => toDashboardCourse(row));
}

export async function listActiveCourses(limit = 3): Promise<DashboardCourse[]> {
  const rows = await prisma.course.findMany({
    where: { status: "active" },
    orderBy: [{ completedModules: "desc" }, { startedAt: "desc" }],
    take: Math.max(1, Math.min(limit, 10)),
    select: courseSelect,
  });
  return rows.map((row) => toDashboardCourse(row));
}

export async function addCourse(input: AddCourseInput): Promise<ActionResult<DashboardCourse>> {
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Course title is required." };

  try {
    const created = await prisma.course.create({
      data: {
        title,
        ...(input.provider?.trim() ? { provider: input.provider.trim() } : {}),
        ...(input.url?.trim() ? { url: input.url.trim() } : {}),
        totalModules: normalizeTotalModules(input.totalModules ?? 1),
        category: input.category?.trim() || "General",
        ...(input.targetCompletionDate ? { targetCompletionDate: new Date(input.targetCompletionDate) } : {}),
      },
      select: courseSelect,
    });
    return { ok: true, data: toDashboardCourse(created) };
  } catch {
    return { ok: false, error: "Could not add course." };
  }
}

export async function updateCourseProgress(
  input: UpdateCourseProgressInput,
): Promise<ActionResult<DashboardCourse>> {
  const existing = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, totalModules: true, status: true },
  });
  if (!existing) return { ok: false, error: "Course not found." };

  const nextCompleted = normalizeCompletedModules(input.completedModules, existing.totalModules);
  let nextStatus: CourseStatus = toCourseStatus(existing.status) ?? "active";
  if (nextCompleted >= existing.totalModules) nextStatus = "completed";
  else if (nextStatus === "completed") nextStatus = "active";

  const becameCompleted = existing.status !== "completed" && nextStatus === "completed";

  try {
    const updated = await prisma.course.update({
      where: { id: input.courseId },
      data: {
        completedModules: nextCompleted,
        status: nextStatus,
        completedAt:
          nextStatus === "completed"
            ? (existing.status === "completed" ? undefined : new Date())
            : existing.status === "completed"
              ? null
              : undefined,
      },
      select: courseSelect,
    });

    await emitCourseCompletedIfNeeded(updated.id, becameCompleted);
    return { ok: true, data: toDashboardCourse(updated) };
  } catch {
    return { ok: false, error: "Could not update course progress." };
  }
}

export async function completeCourseModule(
  input: CompleteCourseModuleInput,
): Promise<ActionResult<DashboardCourse>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const moduleRow = await tx.courseModule.findUnique({
        where: { id: input.moduleId },
        select: {
          id: true,
          courseId: true,
          completedAt: true,
          course: { select: { status: true, totalModules: true } },
        },
      });
      if (!moduleRow) return { kind: "not_found" as const };

      if (moduleRow.completedAt) {
        const existingCourse = await tx.course.findUnique({ where: { id: moduleRow.courseId }, select: courseSelect });
        if (!existingCourse) return { kind: "not_found" as const };
        return { kind: "ok" as const, course: existingCourse, emitModule: false, becameCompleted: false };
      }

      await tx.courseModule.update({ where: { id: input.moduleId }, data: { completedAt: new Date() } });
      const completedCount = await tx.courseModule.count({
        where: { courseId: moduleRow.courseId, completedAt: { not: null } },
      });

      const nextCompleted = normalizeCompletedModules(completedCount, moduleRow.course.totalModules);
      let nextStatus: CourseStatus = toCourseStatus(moduleRow.course.status) ?? "active";
      if (nextCompleted >= moduleRow.course.totalModules) nextStatus = "completed";
      const becameCompleted = moduleRow.course.status !== "completed" && nextStatus === "completed";

      const updated = await tx.course.update({
        where: { id: moduleRow.courseId },
        data: {
          completedModules: nextCompleted,
          status: nextStatus,
          completedAt: becameCompleted ? new Date() : undefined,
        },
        select: courseSelect,
      });

      return { kind: "ok" as const, course: updated, emitModule: true, becameCompleted };
    });

    if (result.kind === "not_found") return { ok: false, error: "Module not found." };

    if (result.emitModule) {
      await recordProgressEvent({
        entityType: "course_module",
        entityId: input.moduleId,
        eventType: "progressed",
        xp: 3,
      });
    }
    await emitCourseCompletedIfNeeded(result.course.id, result.becameCompleted);
    return { ok: true, data: toDashboardCourse(result.course) };
  } catch {
    return { ok: false, error: "Could not complete module." };
  }
}

export async function setCourseStatus(
  input: SetCourseStatusInput,
): Promise<ActionResult<DashboardCourse>> {
  const status = toCourseStatus(input.status);
  if (!status) return { ok: false, error: "Invalid course status." };

  const existing = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, status: true, totalModules: true, completedAt: true },
  });
  if (!existing) return { ok: false, error: "Course not found." };

  const becameCompleted = existing.status !== "completed" && status === "completed";

  try {
    const updated = await prisma.course.update({
      where: { id: input.courseId },
      data: {
        status,
        ...(status === "completed"
          ? { completedModules: existing.totalModules, completedAt: existing.completedAt ?? new Date() }
          : existing.status === "completed"
            ? { completedAt: null }
            : {}),
      },
      select: courseSelect,
    });

    await emitCourseCompletedIfNeeded(updated.id, becameCompleted);
    return { ok: true, data: toDashboardCourse(updated) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "Course not found." };
    }
    return { ok: false, error: "Could not update course status." };
  }
}
