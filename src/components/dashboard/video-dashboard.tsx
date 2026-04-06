"use client";

import { useCallback, useState, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, RefreshCw } from "lucide-react";

import { saveYoutubeVideo } from "@/app/actions/youtube";
import { syncWatchLaterFromPlaylist } from "@/app/actions/sync";
import { setVideoLearned, type DashboardVideo } from "@/app/actions/video";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
      const result = await saveYoutubeVideo(url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const row: DashboardVideo = { ...result.video, isLearned: false };
      setVideos((prev) => [row, ...prev]);
      setAnimateInIds((prev) => new Set(prev).add(row.id));
      setUrl("");
    });
  }, [url]);

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

  return (
    <div className="space-y-10 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Learning dashboard
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Paste a YouTube link to save it with a thumbnail and title. Mark videos
          as learned as you finish them.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSyncWatchLater}
            disabled={isPending || !watchLaterConfigured}
            className="min-h-[44px] touch-manipulation border-white/15 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.08]"
            title={
              watchLaterConfigured
                ? "Import the latest 5 videos from your YouTube Watch Later playlist"
                : "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN (see npm run youtube:oauth)"
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
              Watch Later sync needs OAuth env vars — run{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-zinc-300">
                npm run youtube:oauth
              </code>
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:flex-row sm:items-stretch",
          )}
        >
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
              {groups.map((group) => (
                <section
                  key={group.key}
                  className="space-y-4"
                  aria-labelledby={`day-${group.key}`}
                >
                  <h3
                    id={`day-${group.key}`}
                    className="text-sm font-medium tracking-wide text-zinc-500"
                  >
                    {group.label}
                  </h3>
                  <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((video) => (
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
                        <Card
                          className={cn(
                            "overflow-hidden transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
                            video.isLearned &&
                              "opacity-90 ring-1 ring-emerald-500/20",
                          )}
                        >
                          <div className="relative aspect-video w-full overflow-hidden bg-zinc-900/80">
                            <Image
                              src={video.thumbnail}
                              alt={video.title}
                              fill
                              className={cn(
                                "object-cover transition-[filter] duration-300",
                                video.isLearned && "brightness-[0.65]",
                              )}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                      {video.isLearned ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-medium text-white backdrop-blur-[2px]">
                          Learned
                        </span>
                      ) : null}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-2 text-base font-medium leading-snug">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-100 underline-offset-4 hover:underline"
                        >
                          {video.title}
                        </a>
                      </CardTitle>
                    </CardHeader>
                            <CardContent className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                              <Label
                                htmlFor={`learned-${video.id}`}
                                className="cursor-pointer text-sm text-zinc-400 sm:min-w-0 sm:flex-1"
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
                                className="shrink-0 self-end sm:self-center"
                              />
                            </CardContent>
                          </Card>
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
