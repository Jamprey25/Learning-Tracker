"use client";

import { CheckCircle2, Minus, PauseCircle, PlayCircle, Plus, XCircle } from "lucide-react";

import type { DashboardCourse } from "@/app/actions/course";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CourseCardProps = {
  course: DashboardCourse;
  isPending: boolean;
  onAdjustProgress: (courseId: string, delta: number) => void;
  onSetStatus: (courseId: string, status: string) => void;
};

const STATUS_STYLES: Record<string, string> = {
  active: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
  completed: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
  paused: "border-amber-300/25 bg-amber-400/10 text-amber-200",
  dropped: "border-rose-300/25 bg-rose-400/10 text-rose-200",
};

export function CourseCard({
  course,
  isPending,
  onAdjustProgress,
  onSetStatus,
}: CourseCardProps) {
  const total = Math.max(1, course.totalModules);
  const completed = Math.max(0, Math.min(course.completedModules, total));
  const percent = Math.round((completed / total) * 100);

  return (
    <article className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/45 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/8 backdrop-blur-xl">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-zinc-100">
            {course.url ? (
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {course.title}
              </a>
            ) : (
              course.title
            )}
          </h3>
          <span className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest", STATUS_STYLES[course.status] ?? "border-white/15 bg-white/10 text-zinc-200")}>
            {course.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-zinc-300">
            {course.provider || "Self-paced"}
          </span>
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-2 py-1 text-fuchsia-200">
            {course.category}
          </span>
        </div>
      </header>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Progress</span>
          <span>
            {completed}/{total} modules ({percent}%)
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onAdjustProgress(course.id, -1)}
          disabled={isPending || completed <= 0}
          className="min-h-[36px] border-white/15 bg-white/[0.06] text-zinc-200 hover:bg-white/[0.12]"
        >
          <Minus className="size-4" aria-hidden />
          Module
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onAdjustProgress(course.id, 1)}
          disabled={isPending || completed >= total}
          className="min-h-[36px] border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
        >
          <Plus className="size-4" aria-hidden />
          Module
        </Button>

        {course.status !== "completed" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSetStatus(course.id, "completed")}
            disabled={isPending}
            className="min-h-[36px] border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Complete
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSetStatus(course.id, "active")}
            disabled={isPending}
            className="min-h-[36px] border-white/15 bg-white/[0.06] text-zinc-200 hover:bg-white/[0.12]"
          >
            <PlayCircle className="size-4" aria-hidden />
            Reopen
          </Button>
        )}

        {course.status === "paused" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSetStatus(course.id, "active")}
            disabled={isPending}
            className="min-h-[36px] border-white/15 bg-white/[0.06] text-zinc-200 hover:bg-white/[0.12]"
          >
            <PlayCircle className="size-4" aria-hidden />
            Resume
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSetStatus(course.id, "paused")}
            disabled={isPending || course.status === "completed"}
            className="min-h-[36px] border-amber-300/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
          >
            <PauseCircle className="size-4" aria-hidden />
            Pause
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() => onSetStatus(course.id, "dropped")}
          disabled={isPending || course.status === "completed"}
          className="min-h-[36px] border-rose-300/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
        >
          <XCircle className="size-4" aria-hidden />
          Drop
        </Button>
      </div>
    </article>
  );
}
