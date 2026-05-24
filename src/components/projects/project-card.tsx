"use client";

import { Rocket, Wrench } from "lucide-react";

import type { DashboardProject } from "@/app/actions/project";
import { Button } from "@/components/ui/button";
import { ProjectDetail } from "@/components/projects/project-detail";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: DashboardProject;
  isPending: boolean;
  onSetStatus: (projectId: string, status: string) => void;
  onAddMilestone: (projectId: string, title: string) => void;
  onCompleteMilestone: (milestoneId: string) => void;
  onMoveMilestone: (projectId: string, milestoneId: string, direction: "up" | "down") => void;
};

const STATUS_STYLES: Record<string, string> = {
  planning: "border-violet-300/25 bg-violet-400/10 text-violet-200",
  active: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
  shipped: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
  shelved: "border-zinc-300/20 bg-zinc-300/10 text-zinc-300",
};

export function ProjectCard({
  project,
  isPending,
  onSetStatus,
  onAddMilestone,
  onCompleteMilestone,
  onMoveMilestone,
}: ProjectCardProps) {
  const completedMilestones = project.milestones.filter((m) => m.status === "done").length;

  return (
    <article className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/45 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/8 backdrop-blur-xl">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-zinc-100">
            {project.repoUrl ? (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {project.name}
              </a>
            ) : (
              project.name
            )}
          </h3>
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest",
              STATUS_STYLES[project.status] ?? "border-white/15 bg-white/10 text-zinc-200",
            )}
          >
            {project.status}
          </span>
        </div>
        {project.description ? <p className="text-sm text-zinc-300">{project.description}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-2 py-1 text-fuchsia-200">
            {project.category}
          </span>
          <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-zinc-300">
            {completedMilestones}/{project.milestones.length} milestones done
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onSetStatus(project.id, "active")}
          disabled={isPending || project.status === "active"}
          className="min-h-[36px] border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
        >
          <Wrench className="size-4" aria-hidden />
          Active
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onSetStatus(project.id, "shipped")}
          disabled={isPending || project.status === "shipped"}
          className="min-h-[36px] border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
        >
          <Rocket className="size-4" aria-hidden />
          Ship
        </Button>
        <select
          value={project.status}
          onChange={(e) => onSetStatus(project.id, e.target.value)}
          disabled={isPending}
          className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="shipped">Shipped</option>
          <option value="shelved">Shelved</option>
        </select>
      </div>

      <ProjectDetail
        projectId={project.id}
        milestones={project.milestones}
        isPending={isPending}
        onAddMilestone={onAddMilestone}
        onCompleteMilestone={onCompleteMilestone}
        onMoveMilestone={onMoveMilestone}
      />
    </article>
  );
}
