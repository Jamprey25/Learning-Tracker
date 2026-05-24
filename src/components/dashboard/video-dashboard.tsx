"use client";

import { useCallback, useState, useTransition } from "react";
import Image from "next/image";
import {
  BookOpenText,
  Briefcase,
  Plus,
  RefreshCw,
  Sparkles,
  GraduationCap,
  Lightbulb,
  Milestone,
  Rocket,
  Video,
} from "lucide-react";

import { saveYoutubeVideo } from "@/app/actions/youtube";
import { syncWatchLaterFromPlaylist } from "@/app/actions/sync";
import type { DashboardCourse } from "@/app/actions/course";
import { setVideoLearned, type DashboardVideo } from "@/app/actions/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import { CATEGORIES, categoryColor, categoryGlow } from "@/lib/categories";
import { StreakCard } from "@/components/dashboard/streak-card";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import type { HydratedProgressEvent } from "@/lib/dashboard-summary";

type VideoDashboardProps = {
  initialVideos: DashboardVideo[];
  watchLaterConfigured: boolean;
  streak: {
    current: number;
    longest: number;
    lastEventDate: string | null;
  };
  weeklySummary: {
    eventCount: number;
    xpTotal: number;
  };
  activityByDay: Array<{
    date: string;
    count: number;
    xp: number;
  }>;
  activeCourses: DashboardCourse[];
  activeProjects: Array<{
    id: string;
    name: string;
    status: string;
    category: string;
    startedAt: string;
    shippedAt: string | null;
  }>;
  ventures: Array<{
    id: string;
    name: string;
    stage: string;
    keyMetricLabel: string | null;
    keyMetricValue: number | null;
    startedAt: string;
  }>;
  recentEvents: Array<
    Omit<HydratedProgressEvent, "occurredAt"> & {
      occurredAt: string;
    }
  >;
};

export function VideoDashboard({
  initialVideos,
  watchLaterConfigured,
  streak,
  weeklySummary,
  activityByDay,
  activeCourses,
  activeProjects,
  ventures,
  recentEvents,
}: VideoDashboardProps) {
  const [url, setUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [videos, setVideos] = useState<DashboardVideo[]>(initialVideos);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSyncWatchLater = useCallback(() => {
    setError(null);
    setSyncMessage(null);
    startTransition(async () => {
      const res = await syncWatchLaterFromPlaylist();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setVideos(res.videos);
      if (!res.result.ok) {
        setError(res.result.error);
        return;
      }
      const { attempted, added, skipped, errors } = res.result.result;
      const parts = [
        attempted === 0
          ? "Watch Later returned no items."
          : `Checked ${attempted} playlist item(s).`,
        added > 0 ? `Added ${added}.` : null,
        skipped > 0 ? `Skipped ${skipped} (already saved).` : null,
      ].filter(Boolean);
      if (errors.length > 0) {
        parts.push(`Some rows failed: ${errors.slice(0, 3).join("; ")}`);
      }
      setSyncMessage(parts.join(" "));
    });
  }, []);

  const handleAdd = useCallback(() => {
    setError(null);
    setSyncMessage(null);
    startTransition(async () => {
      const result = await saveYoutubeVideo(url, selectedCategory);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const row: DashboardVideo = { ...result.video, isLearned: false };
      setVideos((prev) => [row, ...prev]);
      setUrl("");
    });
  }, [url, selectedCategory]);

  const handleLearnedChange = useCallback((id: string, checked: boolean) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isLearned: checked } : v)),
    );
    startTransition(async () => {
      const res = await setVideoLearned(id, checked);
      if (!res.ok) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, isLearned: !checked } : v,
          ),
        );
        setError(res.error);
      }
    });
  }, []);

  const displayedVentures = ventures.slice(0, 3);

  function eventIcon(event: { entityType: string; eventType: string }) {
    if (event.entityType === "video") return <Video className="size-4 text-cyan-300" aria-hidden />;
    if (event.entityType === "course" || event.entityType === "course_module")
      return <GraduationCap className="size-4 text-violet-300" aria-hidden />;
    if (event.entityType === "project" && event.eventType === "shipped")
      return <Rocket className="size-4 text-emerald-300" aria-hidden />;
    if (event.entityType === "project" || event.entityType === "milestone")
      return <Milestone className="size-4 text-amber-300" aria-hidden />;
    if (event.entityType === "venture")
      return <Lightbulb className="size-4 text-fuchsia-300" aria-hidden />;
    if (event.entityType === "research")
      return <BookOpenText className="size-4 text-blue-300" aria-hidden />;
    return <Sparkles className="size-4 text-zinc-300" aria-hidden />;
  }

  function eventDescription(event: { entityType: string; eventType: string }) {
    if (event.eventType === "completed") return "completed";
    if (event.eventType === "shipped") return "shipped";
    if (event.eventType === "saved") return "saved";
    if (event.eventType === "progressed") return "made progress";
    return event.eventType.replaceAll("_", " ");
  }

  return (
    <div className="space-y-10 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <StreakCard current={streak.current} longest={streak.longest} />
        </div>
        <div className="lg:col-span-3">
          <WeeklySummary
            eventCount={weeklySummary.eventCount}
            xpTotal={weeklySummary.xpTotal}
          />
        </div>
        <div className="lg:col-span-6">
          <ActivityHeatmap activity={activityByDay} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-200">
            <GraduationCap className="size-4 text-cyan-200" aria-hidden />
            Active Courses
          </h2>
          {activeCourses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-4 text-sm text-zinc-500">
              No active courses yet.
            </p>
          ) : (
            <div className="space-y-3">
              {activeCourses.map((course) => {
                const total = Math.max(1, course.totalModules);
                const completed = Math.max(0, Math.min(course.completedModules, total));
                const percent = Math.round((completed / total) * 100);
                return (
                  <article key={course.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-100">{course.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {course.provider || "Self-paced"} · {course.category}
                    </p>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                        <span>Progress</span>
                        <span>
                          {completed}/{total}
                        </span>
                      </div>
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-200">
            <Briefcase className="size-4 text-amber-200" aria-hidden />
            Active Projects
          </h2>
          {activeProjects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-4 text-sm text-zinc-500">
              No active projects yet.
            </p>
          ) : (
            <div className="space-y-3">
              {activeProjects.map((project) => (
                <article key={project.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-zinc-100">{project.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{project.category}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-200">
            <Lightbulb className="size-4 text-fuchsia-200" aria-hidden />
            Ventures
          </h2>
          {displayedVentures.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-4 text-sm text-zinc-500">
              No ventures yet.
            </p>
          ) : (
            <div className="space-y-3">
              {displayedVentures.map((venture) => (
                <article key={venture.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-zinc-100">{venture.name}</p>
                  <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">{venture.stage}</p>
                  {venture.keyMetricLabel ? (
                    <p className="mt-2 text-xs text-zinc-300">
                      {venture.keyMetricLabel}: {venture.keyMetricValue ?? "—"}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-200">
          <Sparkles className="size-4 text-emerald-200" aria-hidden />
          Recent Activity
        </h2>
        {recentEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-4 text-sm text-zinc-500">
            No activity yet. Start by adding a video, course, project, venture, or research topic.
          </p>
        ) : null}
        <ul className="space-y-2">
          {recentEvents.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {eventIcon(event)}
                <p className="truncate text-sm text-zinc-200">
                  <span className="font-medium text-zinc-100">
                    {event.entityTitle || event.entityType}
                  </span>{" "}
                  — {eventDescription(event)} · {event.relativeTimeLabel}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-emerald-300">+{event.xp} XP</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">Recent Videos</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSyncWatchLater}
              disabled={isPending || !watchLaterConfigured}
              className="h-9 border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
            >
              <RefreshCw className={cn("size-4", isPending && "animate-spin")} aria-hidden />
              Sync
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              name="youtube-url"
              inputMode="url"
              enterKeyHint="done"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="h-10 flex-1 border-white/10 bg-black/20"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/20 sm:w-36"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-zinc-900 text-zinc-100">
                  {cat}
                </option>
              ))}
            </select>
            <Button type="button" onClick={handleAdd} disabled={isPending || !url.trim()} className="h-10">
              <Plus className="size-4" aria-hidden />
              Add
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-rose-400/90">{error}</p> : null}
          {syncMessage ? <p className="mt-2 text-sm text-emerald-400/90">{syncMessage}</p> : null}
        </header>

        {videos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-zinc-500 backdrop-blur-sm">
            No recent videos yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {videos.map((video) => (
              <li key={video.id} className="min-w-0 list-none">
                <div
                  className={cn(
                    "group relative rounded-2xl bg-zinc-950/45 text-zinc-50 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/8 backdrop-blur-xl overflow-hidden transition-all duration-300",
                    "hover:shadow-[0_20px_52px_rgba(0,229,255,0.12)]",
                    video.isLearned && "ring-1 ring-emerald-500/25",
                  )}
                >
                  <GlowingEffect color={categoryGlow(video.category)} spread={24} proximity={90} borderWidth={1} />
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-900/80">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className={cn(
                        "object-cover transition-all duration-500",
                        video.isLearned ? "brightness-[0.45] scale-[1.02]" : "group-hover:scale-[1.03]",
                      )}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="p-4 pb-3">
                    <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-100 underline-offset-4 hover:underline"
                      >
                        {video.title}
                      </a>
                    </h3>
                    <span
                      className={cn(
                        "mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                        categoryColor(video.category),
                      )}
                    >
                      {video.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] px-4 py-3">
                    <Label htmlFor={`learned-${video.id}`} className="cursor-pointer text-xs text-zinc-500">
                      Mark as learned
                    </Label>
                    <Switch
                      id={`learned-${video.id}`}
                      checked={video.isLearned}
                      onCheckedChange={(checked) => handleLearnedChange(video.id, checked)}
                      disabled={isPending}
                      className="shrink-0"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
