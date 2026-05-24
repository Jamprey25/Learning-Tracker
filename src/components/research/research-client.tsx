"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, Plus } from "lucide-react";

import {
  addResearchTopic,
  updateResearchPhase,
  type DashboardResearchTopic,
} from "@/app/actions/research";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ResearchClientProps = {
  initialTopics: DashboardResearchTopic[];
};

const PHASES = [
  "planning",
  "lit_review",
  "methodology",
  "data",
  "writing",
  "done",
] as const;

const PHASE_STYLES: Record<string, string> = {
  planning: "border-violet-300/25 bg-violet-400/10 text-violet-200",
  lit_review: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
  methodology: "border-amber-300/25 bg-amber-400/10 text-amber-200",
  data: "border-blue-300/25 bg-blue-400/10 text-blue-200",
  writing: "border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200",
  done: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
};

export function ResearchClient({ initialTopics }: ResearchClientProps) {
  const [topics, setTopics] = useState<DashboardResearchTopic[]>(initialTopics);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [notesUrl, setNotesUrl] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [topics]);

  function updateLocalTopic(topicId: string, updater: (topic: DashboardResearchTopic) => DashboardResearchTopic) {
    setTopics((prev) => prev.map((topic) => (topic.id === topicId ? updater(topic) : topic)));
  }

  function handleAddTopic() {
    setError(null);
    startTransition(async () => {
      const res = await addResearchTopic({ title, notesUrl, targetDate });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTopics((prev) => [res.data, ...prev]);
      setTitle("");
      setNotesUrl("");
      setTargetDate("");
    });
  }

  function handlePhaseChange(topicId: string, phase: string) {
    const previous = topics.find((topic) => topic.id === topicId);
    if (!previous || previous.phase === phase) return;

    setError(null);
    updateLocalTopic(topicId, (topic) => ({ ...topic, phase }));
    startTransition(async () => {
      const res = await updateResearchPhase({ topicId, phase });
      if (!res.ok) {
        updateLocalTopic(topicId, () => previous);
        setError(res.error);
        return;
      }
      updateLocalTopic(topicId, () => res.data);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-white/15 bg-black/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input
            placeholder="Research topic title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
          <Input
            placeholder="Notes URL (Notion/Obsidian)"
            value={notesUrl}
            onChange={(e) => setNotesUrl(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Move topics from planning to done with explicit phase updates.</p>
          <Button type="button" onClick={handleAddTopic} disabled={isPending || !title.trim()}>
            <Plus className="size-4" aria-hidden />
            Add Topic
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-400/90">{error}</p> : null}

      {sortedTopics.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-zinc-500">
          No research topics yet. Add one above to start tracking.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedTopics.map((topic) => (
            <article
              key={topic.id}
              className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/45 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/8 backdrop-blur-xl"
            >
              <header className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-zinc-100">{topic.title}</h3>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest",
                      PHASE_STYLES[topic.phase] ?? "border-white/15 bg-white/10 text-zinc-200",
                    )}
                  >
                    {topic.phase}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {topic.targetDate ? (
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-zinc-300">
                      Target {new Date(topic.targetDate).toLocaleDateString()}
                    </span>
                  ) : null}
                  {topic.notesUrl ? (
                    <a
                      href={topic.notesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-cyan-200 hover:bg-cyan-400/20"
                    >
                      <BookOpen className="size-3" aria-hidden />
                      Notes
                    </a>
                  ) : null}
                </div>
              </header>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={topic.phase}
                  onChange={(e) => handlePhaseChange(topic.id, e.target.value)}
                  disabled={isPending}
                  className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  {PHASES.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
