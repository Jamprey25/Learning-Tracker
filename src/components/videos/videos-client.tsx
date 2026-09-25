"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Search, CheckCircle2, Sparkles } from "lucide-react";

import { setVideoLearned, type DashboardVideo } from "@/app/actions/video";
import { VideoReferenceCard } from "@/components/videos/video-reference-card";
import { cn } from "@/lib/utils";
import { CATEGORIES, categoryHeading, categoryPillIdle } from "@/lib/categories";
import { buildVideoReference } from "@/lib/video-reference";

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

  const studies = useMemo(
    () =>
      new Map(
        videos.map((video) => [
          video.id,
          buildVideoReference({
            title: video.title,
            url: video.url,
            category: video.category,
            isLearned: video.isLearned,
          }),
        ]),
      ),
    [videos],
  );

  const q = search.trim().toLowerCase();
  const filtered = videos.filter((v) => {
    const study = studies.get(v.id);
    const hay = [
      v.title,
      study?.summary,
      ...(study?.remember ?? []),
      ...(study?.concepts ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const matchSearch = !q || hay.includes(q);
    const matchCat = activeCategory === ALL || v.category === activeCategory;
    return matchSearch && matchCat;
  });

  const presentCategories = CATEGORIES.filter((c) =>
    videos.some((v) => v.category === c),
  );
  const filterOptions = [ALL, ...presentCategories];

  const learnedCount = filtered.filter((v) => v.isLearned).length;
  const pct = filtered.length > 0 ? Math.round((learnedCount / filtered.length) * 100) : 0;

  const groups = useMemo(() => {
    const known = new Set<string>(CATEGORIES);
    const order = [
      ...CATEGORIES.filter((category) =>
        filtered.some((video) => video.category === category),
      ),
      ...[...new Set(filtered.map((video) => video.category))].filter(
        (category) => !known.has(category),
      ),
    ];
    return order.map((category) => ({
      category,
      videos: filtered.filter((video) => video.category === category),
    }));
  }, [filtered]);

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
          aria-label="Search titles, summaries, or concepts"
          placeholder="Search titles, summaries, or concepts…"
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
                : cat === ALL
                  ? "border-white/10 bg-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                  : cn(categoryPillIdle(cat), "hover:brightness-125"),
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Reference list */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-zinc-500">
          {search || activeCategory !== ALL
            ? "No videos match your filters."
            : "No videos yet. Add one from the dashboard."}
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group, groupIndex) => (
            <section key={group.category} className="space-y-3">
              <h2
                className={cn(
                  "sticky top-2 z-10 flex items-center justify-between rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur-xl",
                  categoryHeading(group.category),
                )}
              >
                <span>{group.category}</span>
                <span className="font-medium normal-case tracking-normal opacity-70">
                  {group.videos.length} {group.videos.length === 1 ? "video" : "videos"}
                </span>
              </h2>
              <ul className="space-y-4">
                {group.videos.map((video, index) => {
                  const study = studies.get(video.id);
                  if (!study) return null;
                  return (
                    <li key={video.id} className="min-w-0 list-none">
                      <VideoReferenceCard
                        video={video}
                        study={study}
                        priority={groupIndex === 0 && index === 0}
                        isPending={isPending}
                        onLearnedChange={handleLearnedChange}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
