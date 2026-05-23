"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";

import {
  setCourseStatus,
  updateCourseProgress,
  type DashboardCourse,
} from "@/app/actions/course";
import { AddCourseForm } from "@/components/courses/add-course-form";
import { CourseCard } from "@/components/courses/course-card";
import { cn } from "@/lib/utils";

type CoursesClientProps = {
  initialCourses: DashboardCourse[];
};

const ALL = "all";
const STATUS_FILTERS = [ALL, "active", "completed", "paused", "dropped"] as const;

export function CoursesClient({ initialCourses }: CoursesClientProps) {
  const [courses, setCourses] = useState<DashboardCourse[]>(initialCourses);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>(ALL);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesQuery =
        q.length === 0 ||
        course.title.toLowerCase().includes(q) ||
        (course.provider || "").toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q);
      const matchesStatus = statusFilter === ALL || course.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [courses, query, statusFilter]);

  function updateLocalCourse(courseId: string, updater: (course: DashboardCourse) => DashboardCourse) {
    setCourses((prev) => prev.map((course) => (course.id === courseId ? updater(course) : course)));
  }

  function handleAdjustProgress(courseId: string, delta: number) {
    const target = courses.find((course) => course.id === courseId);
    if (!target) return;

    const nextCompleted = Math.max(0, Math.min(target.totalModules, target.completedModules + delta));
    if (nextCompleted === target.completedModules) return;

    const previous = target;
    const optimisticStatus = nextCompleted >= target.totalModules ? "completed" : target.status === "completed" ? "active" : target.status;

    setError(null);
    updateLocalCourse(courseId, (course) => ({
      ...course,
      completedModules: nextCompleted,
      status: optimisticStatus,
      completedAt: optimisticStatus === "completed" ? new Date().toISOString() : null,
    }));

    startTransition(async () => {
      const res = await updateCourseProgress({ courseId, completedModules: nextCompleted });
      if (!res.ok) {
        updateLocalCourse(courseId, () => previous);
        setError(res.error);
        return;
      }
      updateLocalCourse(courseId, () => res.data);
    });
  }

  function handleSetStatus(courseId: string, status: string) {
    const previous = courses.find((course) => course.id === courseId);
    if (!previous) return;
    if (previous.status === status) return;

    setError(null);
    updateLocalCourse(courseId, (course) => ({
      ...course,
      status,
      completedModules: status === "completed" ? course.totalModules : course.completedModules,
      completedAt: status === "completed" ? new Date().toISOString() : status === "active" ? null : course.completedAt,
    }));

    startTransition(async () => {
      const res = await setCourseStatus({ courseId, status });
      if (!res.ok) {
        updateLocalCourse(courseId, () => previous);
        setError(res.error);
        return;
      }
      updateLocalCourse(courseId, () => res.data);
    });
  }

  return (
    <div className="space-y-6">
      <AddCourseForm onCreated={(course) => setCourses((prev) => [course, ...prev])} />

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            placeholder="Search courses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
                statusFilter === status
                  ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200",
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-400/90">{error}</p> : null}

      {filteredCourses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-zinc-500">
          {courses.length === 0
            ? "No courses yet. Add your first one above."
            : "No courses match your filters."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isPending={isPending}
              onAdjustProgress={handleAdjustProgress}
              onSetStatus={handleSetStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
