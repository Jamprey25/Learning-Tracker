"use client";

import { useCallback, useState, useTransition } from "react";
import Image from "next/image";
import { Search } from "lucide-react";

import { setVideoLearned, type DashboardVideo } from "@/app/actions/video";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CATEGORIES, categoryColor } from "@/lib/categories";

const ALL = "All";

type Props = {
  initialVideos: DashboardVideo[];
};

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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
        <span>
          <span className="font-semibold text-zinc-200">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "video" : "videos"}
        </span>
        <span>
          <span className="font-semibold text-emerald-400">{learnedCount}</span>{" "}
          learned
        </span>
        {filtered.length > 0 && (
          <span>
            <span className="font-semibold text-zinc-200">
              {Math.round((learnedCount / filtered.length) * 100)}%
            </span>{" "}
            complete
          </span>
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
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeCategory === cat
                ? "border-white/30 bg-white/10 text-zinc-100"
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
          {filtered.map((video) => (
            <li key={video.id} className="min-w-0 list-none">
              <Card
                className={cn(
                  "overflow-hidden transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
                  video.isLearned && "opacity-90 ring-1 ring-emerald-500/20",
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
                  {video.isLearned && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-medium text-white backdrop-blur-[2px]">
                      Learned
                    </span>
                  )}
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
                  <span
                    className={cn(
                      "mt-1.5 inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                      categoryColor(video.category),
                    )}
                  >
                    {video.category}
                  </span>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
