"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, GitFork, Search, Sparkles } from "lucide-react";

import type { SimilarGraph, SimilarVideo } from "@/lib/vault-neighbor-model";
import { titleKey } from "@/lib/vault-neighbor-model";
import { cn } from "@/lib/utils";

type Filter = "all" | "disagree" | "learned";

type Props = {
  graph: SimilarGraph;
  initialTitle?: string;
};

export function SimilarClient({ graph, initialTitle }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedSlug, setSelectedSlug] = useState(() => {
    if (!initialTitle) return graph.videos[0]?.slug ?? "";
    const match = graph.videos.find(
      (video) => titleKey(video.title) === titleKey(initialTitle),
    );
    return match?.slug ?? graph.videos[0]?.slug ?? "";
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return graph.videos.filter((video) => {
      if (filter === "disagree" && !video.disagrees) return false;
      if (filter === "learned" && !video.learned) return false;
      if (!q) return true;
      return (
        video.title.toLowerCase().includes(q) ||
        video.concepts.some((concept) => concept.toLowerCase().includes(q))
      );
    });
  }, [filter, graph.videos, query]);

  const selected =
    filtered.find((video) => video.slug === selectedSlug) ??
    filtered[0] ??
    graph.videos.find((video) => video.slug === selectedSlug) ??
    null;

  if (graph.videos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-zinc-500">
        No embedding cache yet. Run <code className="text-zinc-300">npm run obsidian:embed</code>{" "}
        to generate nearest neighbors.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-sm">
          <span className="font-semibold text-zinc-100">{graph.videos.length}</span>
          <span className="text-zinc-500"> embedded</span>
        </div>
        <div className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3.5 py-1.5 text-sm">
          <span className="font-semibold text-fuchsia-200">{graph.disagreementCount}</span>
          <span className="text-fuchsia-400/80"> graph ≠ vector</span>
        </div>
        <p className="text-xs text-zinc-500">
          {graph.model} · k={graph.k}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
        <input
          type="search"
          placeholder="Search titles or concepts…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["disagree", "Disagreement"],
            ["learned", "Learned"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
              filter === id
                ? "border-white/30 bg-white/10 text-zinc-100"
                : "border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <ul className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-zinc-500">No matches.</li>
          ) : (
            filtered.map((video) => (
              <li key={video.slug}>
                <button
                  type="button"
                  onClick={() => setSelectedSlug(video.slug)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    selected?.slug === video.slug
                      ? "bg-white/10 text-zinc-50"
                      : "text-zinc-300 hover:bg-white/[0.06]",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{video.title}</span>
                  {video.disagrees && (
                    <span className="shrink-0 rounded-full bg-fuchsia-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200">
                      gap
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>

        {selected ? <SelectedPanel video={selected} onSelect={setSelectedSlug} /> : null}
      </div>
    </div>
  );
}

function SelectedPanel({
  video,
  onSelect,
}: {
  video: SimilarVideo;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/45 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      {video.thumbnail ? (
        <div className="relative aspect-video w-full bg-zinc-900">
          <Image
            src={video.thumbnail}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        </div>
      ) : null}

      <div className="space-y-5 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-50">{video.title}</h2>
            {video.learned && (
              <CheckCircle2 className="size-4 text-emerald-400" aria-label="Learned" />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {video.concepts.map((concept) => (
              <span
                key={concept}
                className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-xs text-violet-200"
              >
                {concept}
              </span>
            ))}
            {video.disagrees && (
              <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-2 py-0.5 text-xs text-fuchsia-200">
                <Sparkles className="size-3" aria-hidden />
                vector ≠ wiki graph
              </span>
            )}
          </div>
          {video.url ? (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-cyan-300 underline-offset-4 hover:underline"
            >
              Open on YouTube
            </a>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Wiki-link related
            </p>
            <ul className="space-y-1.5 text-sm text-zinc-300">
              {video.relatedTitles.length === 0 ? (
                <li className="text-zinc-500">None recorded</li>
              ) : (
                video.relatedTitles.map((title) => <li key={title}>{title}</li>)
              )}
            </ul>
          </div>
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-400/80">
              <GitFork className="size-3" aria-hidden />
              Embedding neighbors
            </p>
            <ul className="space-y-2">
              {video.neighbors.map((hit) => (
                <li key={hit.slug}>
                  <button
                    type="button"
                    onClick={() => onSelect(hit.slug)}
                    className="w-full rounded-xl border border-white/8 bg-white/[0.04] p-2.5 text-left transition-colors hover:bg-white/[0.08]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-zinc-100">{hit.title}</span>
                      <span className="shrink-0 text-xs tabular-nums text-cyan-200">
                        {hit.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                        style={{ width: `${Math.max(8, Math.min(100, hit.score * 100))}%` }}
                      />
                    </div>
                    {hit.inGraphRelated ? (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-emerald-400/80">
                        also in wiki graph
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-fuchsia-300/70">
                        vector only
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
