export const COURSE_STATUSES = ["active", "completed", "paused", "dropped"] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];

export function normalizeTotalModules(totalModules: number): number {
  if (!Number.isFinite(totalModules)) return 1;
  return Math.max(1, Math.floor(totalModules));
}

export function normalizeCompletedModules(
  completedModules: number,
  totalModules: number,
): number {
  if (!Number.isFinite(completedModules)) return 0;
  const safeTotal = normalizeTotalModules(totalModules);
  return Math.min(safeTotal, Math.max(0, Math.floor(completedModules)));
}

export function toCourseStatus(value: string): CourseStatus | null {
  if ((COURSE_STATUSES as readonly string[]).includes(value)) {
    return value as CourseStatus;
  }

  return null;
}
