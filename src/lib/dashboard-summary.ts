import type {
  Course,
  Milestone,
  ProgressEvent,
  Project,
  ResearchTopic,
  Venture,
  Video,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getStreak, getXpTotal } from "@/lib/progress";

export type HydratedProgressEvent = ProgressEvent & {
  entityTitle: string | null;
};

export type DashboardSummary = {
  streak: { current: number; longest: number };
  xpThisWeek: number;
  activeCourses: Course[];
  activeProjects: Project[];
  ventures: Venture[];
  recentVideos: Video[];
  recentEvents: HydratedProgressEvent[];
};

type EntityTitleTables = {
  video: Map<string, string>;
  course: Map<string, string>;
  course_module: Map<string, string>;
  project: Map<string, string>;
  milestone: Map<string, string>;
  venture: Map<string, string>;
  research: Map<string, string>;
};

function idsFor(events: ProgressEvent[], entityType: keyof EntityTitleTables): string[] {
  return Array.from(
    new Set(
      events
        .filter((event) => event.entityType === entityType)
        .map((event) => event.entityId),
    ),
  );
}

function toTitleMap<T extends { id: string }>(
  rows: T[],
  getTitle: (row: T) => string,
): Map<string, string> {
  return new Map(rows.map((row) => [row.id, getTitle(row)]));
}

async function buildEntityTitleTables(events: ProgressEvent[]): Promise<EntityTitleTables> {
  const [
    videos,
    courses,
    courseModules,
    projects,
    milestones,
    ventures,
    researchTopics,
  ] = await Promise.all([
    prisma.video.findMany({
      where: { id: { in: idsFor(events, "video") } },
      select: { id: true, title: true },
    }),
    prisma.course.findMany({
      where: { id: { in: idsFor(events, "course") } },
      select: { id: true, title: true },
    }),
    prisma.courseModule.findMany({
      where: { id: { in: idsFor(events, "course_module") } },
      select: { id: true, title: true },
    }),
    prisma.project.findMany({
      where: { id: { in: idsFor(events, "project") } },
      select: { id: true, name: true },
    }),
    prisma.milestone.findMany({
      where: { id: { in: idsFor(events, "milestone") } },
      select: { id: true, title: true },
    }),
    prisma.venture.findMany({
      where: { id: { in: idsFor(events, "venture") } },
      select: { id: true, name: true },
    }),
    prisma.researchTopic.findMany({
      where: { id: { in: idsFor(events, "research") } },
      select: { id: true, title: true },
    }),
  ]);

  return {
    video: toTitleMap(videos, (row) => row.title),
    course: toTitleMap(courses, (row) => row.title),
    course_module: toTitleMap(courseModules, (row) => row.title),
    project: toTitleMap(projects, (row) => row.name),
    milestone: toTitleMap(milestones, (row: Pick<Milestone, "id" | "title">) => row.title),
    venture: toTitleMap(ventures, (row) => row.name),
    research: toTitleMap(
      researchTopics,
      (row: Pick<ResearchTopic, "id" | "title">) => row.title,
    ),
  };
}

function hydrateEvents(
  events: ProgressEvent[],
  tables: EntityTitleTables,
): HydratedProgressEvent[] {
  return events.map((event) => {
    const entityType = event.entityType as keyof EntityTitleTables;
    const entityTitle = tables[entityType]?.get(event.entityId) ?? null;
    return { ...event, entityTitle };
  });
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [streakData, xpThisWeek, activeCourses, activeProjects, ventures, recentVideos, recentEvents] =
    await Promise.all([
      getStreak(),
      getXpTotal(7),
      prisma.course.findMany({
        where: { status: "active" },
        orderBy: [{ completedModules: "desc" }, { startedAt: "desc" }],
        take: 3,
      }),
      prisma.project.findMany({
        where: { status: "active" },
        orderBy: { startedAt: "desc" },
        take: 3,
      }),
      prisma.venture.findMany({
        orderBy: { startedAt: "desc" },
      }),
      prisma.video.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.progressEvent.findMany({
        orderBy: { occurredAt: "desc" },
        take: 15,
      }),
    ]);

  const titleTables = await buildEntityTitleTables(recentEvents);

  return {
    streak: { current: streakData.current, longest: streakData.longest },
    xpThisWeek,
    activeCourses,
    activeProjects,
    ventures,
    recentVideos,
    recentEvents: hydrateEvents(recentEvents, titleTables),
  };
}
