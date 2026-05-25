import type { ProgressEvent } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type RecordProgressEventInput = {
  entityType: string;
  entityId: string;
  eventType: string;
  xp: number;
  note?: string;
};

export type StreakSummary = {
  current: number;
  longest: number;
  lastEventDate: string | null;
};

export type DailyActivity = {
  date: string;
  count: number;
  xp: number;
};

function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

function dayKey(date: Date): string {
  return toUtcDayStart(date).toISOString().slice(0, 10);
}

export async function recordProgressEvent({
  entityType,
  entityId,
  eventType,
  xp,
  note,
}: RecordProgressEventInput): Promise<ProgressEvent> {
  return prisma.$transaction(async (tx) => {
    const event = await tx.progressEvent.create({
      data: {
        entityType,
        entityId,
        eventType,
        xp,
        ...(note ? { note } : {}),
      },
    });

    const streak = await tx.streak.findFirst();
    const today = toUtcDayStart(event.occurredAt);
    const yesterday = addUtcDays(today, -1);

    if (!streak) {
      await tx.streak.create({
        data: {
          currentCount: 1,
          longestCount: 1,
          lastEventDate: today,
        },
      });
      return event;
    }

    const lastEventDate = streak.lastEventDate ? toUtcDayStart(streak.lastEventDate) : null;

    if (!lastEventDate) {
      await tx.streak.update({
        where: { id: streak.id },
        data: {
          currentCount: 1,
          longestCount: Math.max(streak.longestCount, 1),
          lastEventDate: today,
        },
      });
      return event;
    }

    if (lastEventDate.getTime() === today.getTime()) {
      return event;
    }

    const nextCurrent =
      lastEventDate.getTime() === yesterday.getTime() ? streak.currentCount + 1 : 1;

    await tx.streak.update({
      where: { id: streak.id },
      data: {
        currentCount: nextCurrent,
        longestCount: Math.max(streak.longestCount, nextCurrent),
        lastEventDate: today,
      },
    });

    return event;
  });
}

export async function getStreak(): Promise<StreakSummary> {
  const streak = await prisma.streak.findFirst();
  if (!streak) {
    return { current: 0, longest: 0, lastEventDate: null };
  }

  return {
    current: streak.currentCount,
    longest: streak.longestCount,
    lastEventDate: streak.lastEventDate ? streak.lastEventDate.toISOString() : null,
  };
}

export async function getRecentEvents(limit = 20): Promise<ProgressEvent[]> {
  const take = Math.max(1, Math.min(limit, 100));
  return prisma.progressEvent.findMany({
    orderBy: { occurredAt: "desc" },
    take,
  });
}

export async function getXpTotal(sinceDays?: number): Promise<number> {
  const where =
    typeof sinceDays === "number" && Number.isFinite(sinceDays) && sinceDays > 0
      ? { occurredAt: { gte: addUtcDays(new Date(), -Math.floor(sinceDays)) } }
      : undefined;

  const result = await prisma.progressEvent.aggregate({
    _sum: { xp: true },
    ...(where ? { where } : {}),
  });

  return result._sum.xp ?? 0;
}

export async function getActivityByDay(days = 84): Promise<DailyActivity[]> {
  const safeDays = Math.max(1, Math.min(Math.floor(days), 365));
  const today = toUtcDayStart(new Date());
  const start = addUtcDays(today, -(safeDays - 1));

  const events = await prisma.progressEvent.findMany({
    where: { occurredAt: { gte: start } },
    select: { occurredAt: true, xp: true },
  });

  const byDay = new Map<string, { count: number; xp: number }>();
  for (const event of events) {
    const key = dayKey(event.occurredAt);
    const existing = byDay.get(key) ?? { count: 0, xp: 0 };
    existing.count += 1;
    existing.xp += event.xp;
    byDay.set(key, existing);
  }

  const activity: DailyActivity[] = [];
  for (let offset = 0; offset < safeDays; offset += 1) {
    const date = addUtcDays(start, offset);
    const key = dayKey(date);
    const existing = byDay.get(key);
    activity.push({
      date: key,
      count: existing?.count ?? 0,
      xp: existing?.xp ?? 0,
    });
  }

  return activity;
}
