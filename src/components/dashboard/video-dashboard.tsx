"use client";

import { useCallback, useState, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Flame,
  LibraryBig,
} from "lucide-react";

import { saveYoutubeVideo } from "@/app/actions/youtube";
import { syncWatchLaterFromPlaylist } from "@/app/actions/sync";
import { setVideoLearned, type DashboardVideo } from "@/app/actions/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import { CATEGORIES, categoryColor, categoryGlow } from "@/lib/categories";

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayHeading(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

function groupVideosByDay(videos: DashboardVideo[]) {
  const groups: { key: string; label: string; items: DashboardVideo[] }[] = [];
  for (const v of videos) {
    const key = dayKey(v.createdAt);
    const label = dayHeading(v.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(v);
    } else {
      groups.push({ key, label, items: [v] });
    }
  }
  return groups;
}

type VideoDashboardProps = {
  initialVideos: DashboardVideo[];
  watchLaterConfigured: boolean;
};

export function VideoDashboard({
  initialVideos,
  watchLaterConfigured,
}: VideoDashboardProps) {
  const [url, setUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [videos, setVideos] = useState<DashboardVideo[]>(initialVideos);
  const [animateInIds, setAnimateInIds] = useState<Set<string>>(() => new Set());
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
      setAnimateInIds((prev) => new Set(prev).add(row.id));
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

  const groups = groupVideosByDay(videos);
  const learnedCount = videos.filter((v) => v.isLearned).length;
  const completion =
    videos.length > 0 ? Math.round((learnedCount / videos.length) * 100) : 0;

  return (
    <div className="space-y-10 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-5 shadow-[0_24px_72px_rgba(0,229,255,0.08)] ring-1 ring-white/8 backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-200">
            <Sparkles className="size-3.5" aria-hidden />
            Learning Vault
          </span>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            What IV&apos;s Watching
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
          Paste a YouTube link to save it with a thumbnail and title. Mark videos
          as learned as you finish them.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-zinc-950/40 p-3 ring-1 ring-white/8 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-5 -top-6 size-20 rounded-full bg-cyan-400/15 blur-xl" />
            <p className="text-xs text-zinc-400">Vault Size</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold text-zinc-100">
              <LibraryBig className="size-5 text-cyan-300" aria-hidden />
              {videos.length}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-emerald-500/10 p-3 ring-1 ring-emerald-300/20 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-5 -top-6 size-20 rounded-full bg-emerald-300/20 blur-xl" />
            <p className="text-xs text-emerald-300/80">Learned</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold text-emerald-200">
              <CheckCircle2 className="size-5" aria-hidden />
              {learnedCount}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-amber-500/10 p-3 ring-1 ring-amber-300/20 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-5 -top-6 size-20 rounded-full bg-amber-200/20 blur-xl" />
            <p className="text-xs text-amber-200/80">Completion</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold text-amber-100">
              <Flame className="size-5" aria-hidden />
              {completion}%
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSyncWatchLater}
            disabled={isPending || !watchLaterConfigured}
            className="min-h-[44px] touch-manipulation border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
            title={
              watchLaterConfigured
                ? "Scan your playlist for new videos (default up to 2000 positions; set YOUTUBE_SYNC_MAX_RESULTS to raise the cap)"
                : "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, and YOUTUBE_SYNC_PLAYLIST_ID"
            }
          >
            <RefreshCw
              className={cn("size-4", isPending && "animate-spin")}
              aria-hidden
            />
            Sync Now
          </Button>
          {!watchLaterConfigured ? (
            <span className="text-xs text-zinc-500">
              YouTube playlist sync needs OAuth env vars — run{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-zinc-300">
                npm run youtube:oauth
              </code>
              {" "}and set{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-zinc-300">
                YOUTUBE_SYNC_PLAYLIST_ID
              </code>
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/15 bg-black/20 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
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
              className="min-h-[44px] flex-1 border-white/10 bg-black/20 text-base sm:text-sm"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "add-error" : undefined}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-h-[44px] shrink-0 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/20 sm:w-36"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-zinc-900 text-zinc-100">
                  {cat}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !url.trim()}
              className="min-h-[44px] shrink-0 touch-manipulation sm:min-w-[7rem]"
            >
              <Plus className="size-4" aria-hidden />
              Add
            </Button>
          </div>
        </div>
        {error ? (
          <p
            id="add-error"
            role="alert"
            className="text-sm text-rose-400/90"
          >
            {error}
          </p>
        ) : null}
        {syncMessage ? (
          <p className="text-sm text-emerald-400/90" role="status">
            {syncMessage}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="videos-heading" className="space-y-4">
        <h2 id="videos-heading" className="sr-only">
          Saved videos
        </h2>
        {videos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-zinc-500 backdrop-blur-sm">
            No videos yet. Add a link above to get started.
          </p>
        ) : (
          <div className="space-y-10">
            <AnimatePresence initial={false}>
              {groups.map((group, groupIndex) => (
                <section
                  key={group.key}
                  className="space-y-4"
                  aria-labelledby={`day-${group.key}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-fuchsia-400/40 to-transparent" />
                    <div className="flex items-center gap-2 rounded-full bg-black/30 px-2 py-1 ring-1 ring-white/10">
                      <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                      <h3
                        id={`day-${group.key}`}
                        className="text-xs font-medium uppercase tracking-wider text-zinc-300"
                      >
                        {group.label}
                      </h3>
                      <span className="text-[10px] text-zinc-500">({group.items.length})</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-cyan-400/40 to-transparent" />
                  </div>
                  <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((video, videoIndex) => (
                      <motion.li
                        key={video.id}
                        layout
                        initial={
                          animateInIds.has(video.id)
                            ? { opacity: 0, y: 12, scale: 0.98 }
                            : false
                        }
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 28,
                        }}
                        onAnimationComplete={() => {
                          setAnimateInIds((prev) => {
                            if (!prev.has(video.id)) return prev;
                            const next = new Set(prev);
                            next.delete(video.id);
                            return next;
                          });
                        }}
                        className="min-w-0 list-none"
                      >
                        <div
                          className={cn(
                            "group relative rounded-2xl bg-zinc-950/45 text-zinc-50 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/8 backdrop-blur-xl overflow-hidden transition-all duration-300",
                            "hover:shadow-[0_20px_52px_rgba(0,229,255,0.12)]",
                            video.isLearned && "ring-1 ring-emerald-500/25",
                          )}
                        >
                          <GlowingEffect
                            color={categoryGlow(video.category)}
                            spread={24}
                            proximity={90}
                            borderWidth={1}
                          />
                          <div className="relative aspect-video w-full overflow-hidden bg-zinc-900/80">
                            <Image
                              src={video.thumbnail}
                              alt={video.title}
                              fill
                              priority={groupIndex === 0 && videoIndex === 0}
                              className={cn(
                                "object-cover transition-all duration-500",
                                video.isLearned
                                  ? "brightness-[0.45] scale-[1.02]"
                                  : "group-hover:scale-[1.03]",
                              )}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            {video.isLearned ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 backdrop-blur-[1px]">
                                <CheckCircle2 className="size-8 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                                <span className="text-xs font-semibold tracking-widest text-emerald-300 uppercase">
                                  Learned
                                </span>
                              </div>
                            ) : null}
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
                            <Label
                              htmlFor={`learned-${video.id}`}
                              className="cursor-pointer text-xs text-zinc-500"
                            >
                              Mark as learned
                            </Label>
                            <Switch
                              id={`learned-${video.id}`}
                              checked={video.isLearned}
                              onCheckedChange={(checked) =>
                                handleLearnedChange(video.id, checked)
                              }
                              disabled={isPending}
                              className="shrink-0"
                            />
                          </div>
                        </div>
                        </motion.li>
                      ))}
                    </ul>
                  </section>
                ))}
              </AnimatePresence>
            </div>
        )}
      </section>
    </div>
  );
}
