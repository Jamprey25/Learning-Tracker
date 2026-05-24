"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Plus } from "lucide-react";

import type { DashboardMilestone } from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectDetailProps = {
  projectId: string;
  milestones: DashboardMilestone[];
  isPending: boolean;
  onAddMilestone: (projectId: string, title: string) => void;
  onCompleteMilestone: (milestoneId: string) => void;
  onMoveMilestone: (projectId: string, milestoneId: string, direction: "up" | "down") => void;
};

export function ProjectDetail({
  projectId,
  milestones,
  isPending,
  onAddMilestone,
  onCompleteMilestone,
  onMoveMilestone,
}: ProjectDetailProps) {
  const [title, setTitle] = useState("");

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Milestones</p>
        {milestones.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-3 py-4 text-xs text-zinc-500">
            No milestones yet. Add the next concrete step.
          </p>
        ) : (
          <ul className="space-y-2">
            {milestones.map((milestone, index) => (
              <li
                key={milestone.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2"
              >
                <button
                  type="button"
                  onClick={() => onCompleteMilestone(milestone.id)}
                  disabled={isPending || milestone.status === "done"}
                  className="rounded p-1 text-zinc-400 transition-colors hover:text-emerald-300 disabled:opacity-50"
                  aria-label={`Mark ${milestone.title} done`}
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                </button>
                <span
                  className={`flex-1 text-sm ${
                    milestone.status === "done"
                      ? "text-emerald-200 line-through decoration-emerald-500/60"
                      : "text-zinc-200"
                  }`}
                >
                  {milestone.title}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMoveMilestone(projectId, milestone.id, "up")}
                    disabled={isPending || index === 0}
                    className="rounded p-1 text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-40"
                    aria-label="Move milestone up"
                  >
                    <ArrowUp className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveMilestone(projectId, milestone.id, "down")}
                    disabled={isPending || index === milestones.length - 1}
                    className="rounded p-1 text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-40"
                    aria-label="Move milestone down"
                  >
                    <ArrowDown className="size-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add milestone..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 border-white/10 bg-black/20 text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const next = title.trim();
            if (!next) return;
            onAddMilestone(projectId, next);
            setTitle("");
          }}
          disabled={isPending || !title.trim()}
          className="h-9"
        >
          <Plus className="size-3.5" aria-hidden />
          Add
        </Button>
      </div>
    </div>
  );
}
