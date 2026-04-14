"use client";

import { useCallback, useState, useTransition } from "react";
import Image from "next/image";
import { Search, CheckCircle2, Sparkles } from "lucide-react";

import { setVideoLearned, type DashboardVideo } from "@/app/actions/video";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import { CATEGORIES, categoryColor, categoryGlow } from "@/lib/categories";

const ALL = "All";

const PILL_ACTIVE: Record<string, string> = {
  All:         "border-white/30 bg-white/10 text-zinc-100",
  General:     "border-zinc-400/40 bg-zinc-400/15 text-zinc-200",
  Programming: "border-blue-400/40 bg-blue-400/15 text-blue-200",
  Mathematics: "border-violet-400/40 bg-violet-400/15 text-violet-200",
  Science:     "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  Language:    "border-amber-400/40 bg-amber-400/15 text-amber-200",
  History:     "border-orange-400/40 bg-orange-400/15 text-orange-200",
  Design:      "border-pink-400/40 bg-pink-400/15 text-pink-200",
  Business:    "border-cyan-400/40 bg-cyan-400/15 text-cyan-200",
  Other:       "border-zinc-400/40 bg-zinc-400/15 text-zinc-200",
};

type Props = { initialVideos: DashboardVideo[] };

export function VideosClient({ initialVideos }: Props) {
  const [videos, setVideos] = useState<DashboardVideo[]>(initialVideos);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [isPending, startTransition] = useTransition();

  const handleLearnedChange = useCallback(
    (id: string, checked: boolean) => {
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, isLearned: checked } : v)),
      );
      startTransition(async () => {
        const res = await setVideoLearned(id, checked);
        if (!res.ok) {
          setVideos((prev) =>
            prev.map((v) => (v.id === id ? { ...v, isLearned: !checked } : v)),
          );
        }
      });
    },
    [],
  );

  const q = search.trim().toLowerCase();
  const filtered = videos.filter((v) => {
    const matchSearch = !q || v.title.toLowerCase().includes(q);
    const matchCat = activeCategory === ALL || v.category === activeCategory;
    return matchSearch && matchCat;
  });

  const presentCategories = CATEGORIES.filter((c) =>
    videos.some((v) => v.category === c),
  );
  const filterOptions = [ALL, ...presentCategories];

  const learnedCount = filtered.filter((v) => v.isLearned).length;
  const pct = filtered.length > 0 ? Math.round((learnedCount / filtered.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-cyan-400/10 px-4 py-3 ring-1 ring-white/8">
        <p className="text-sm font-medium text-zinc-100">Video Knowledge Vault</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-fuchsia-200">
          <Sparkles className="size-3" aria-hidden />
          curated
        </span>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-sm">
          <span className="font-semibold text-zinc-100">{filtered.length}</span>
          <span className="text-zinc-500">{filtered.length === 1 ? "video" : "videos"}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-sm">
          <CheckCircle2 className="size-3.5 text-emerald-400" />
          <span className="font-semibold text-emerald-300">{learnedCount}</span>
          <span className="text-emerald-500/70">learned</span>
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-1 items-center gap-3 min-w-[140px]">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-zinc-400">{pct}%</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
        <input
          type="search"
          placeholder="Search videos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
              activeCategory === cat
                ? (PILL_ACTIVE[cat] ?? "border-white/30 bg-white/10 text-zinc-100")
                : "border-white/10 bg-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-zinc-500">
          {search || activeCategory !== ALL
            ? "No videos match your filters."
            : "No videos yet. Add one from the dashboard."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((video, index) => {
            const glow = categoryGlow(video.category);
            return (
              <li key={video.id} className="min-w-0 list-none">
                <div
                  className={cn(
                    "group relative rounded-2xl bg-zinc-950/45 text-zinc-50 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/8 backdrop-blur-xl overflow-hidden transition-all duration-300",
                    "hover:shadow-[0_20px_52px_rgba(0,229,255,0.12)]",
                    video.isLearned && "ring-1 ring-emerald-500/25",
                  )}
                >
                  <GlowingEffect color={glow} spread={24} proximity={90} borderWidth={1} />

                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-900/80">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      priority={index === 0}
                      className={cn(
                        "object-cover transition-all duration-500",
                        video.isLearned
                          ? "brightness-[0.45] scale-[1.02]"
                          : "group-hover:scale-[1.03]",
                      )}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {video.isLearned && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 backdrop-blur-[1px]">
                        <CheckCircle2 className="size-8 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                        <span className="text-xs font-semibold tracking-widest text-emerald-300 uppercase">
                          Learned
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
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

                  {/* Footer */}
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
