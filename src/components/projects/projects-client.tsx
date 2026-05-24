"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";

import {
  addMilestone,
  addProject,
  completeMilestone,
  reorderMilestones,
  updateProjectStatus,
  type DashboardProject,
} from "@/app/actions/project";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectsClientProps = {
  initialProjects: DashboardProject[];
};

const COLUMNS = ["planning", "active", "shipped", "shelved"] as const;

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const [projects, setProjects] = useState<DashboardProject[]>(initialProjects);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [category, setCategory] = useState("General");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(q) ||
        (project.description || "").toLowerCase().includes(q) ||
        (project.repoUrl || "").toLowerCase().includes(q) ||
        project.category.toLowerCase().includes(q)
      );
    });
  }, [projects, query]);

  const projectsByStatus = useMemo(() => {
    return COLUMNS.reduce<Record<(typeof COLUMNS)[number], DashboardProject[]>>(
      (acc, status) => {
        acc[status] = filtered.filter((project) => project.status === status);
        return acc;
      },
      { planning: [], active: [], shipped: [], shelved: [] },
    );
  }, [filtered]);

  function updateLocalProject(projectId: string, updater: (project: DashboardProject) => DashboardProject) {
    setProjects((prev) => prev.map((project) => (project.id === projectId ? updater(project) : project)));
  }

  function handleAddProject() {
    setError(null);
    startTransition(async () => {
      const res = await addProject({ name, description, repoUrl, category });
      if (!res.ok) {
        setError(res.error);
        return;
      }

      setProjects((prev) => [res.data, ...prev]);
      setName("");
      setDescription("");
      setRepoUrl("");
      setCategory("General");
    });
  }

  function handleSetStatus(projectId: string, status: string) {
    const previous = projects.find((project) => project.id === projectId);
    if (!previous || previous.status === status) return;

    setError(null);
    updateLocalProject(projectId, (project) => ({
      ...project,
      status,
      shippedAt:
        status === "shipped" ? project.shippedAt ?? new Date().toISOString() : status === "active" ? null : project.shippedAt,
    }));

    startTransition(async () => {
      const res = await updateProjectStatus({ projectId, status });
      if (!res.ok) {
        updateLocalProject(projectId, () => previous);
        setError(res.error);
        return;
      }
      updateLocalProject(projectId, () => res.data);
    });
  }

  function handleAddMilestone(projectId: string, title: string) {
    const previous = projects.find((project) => project.id === projectId);
    if (!previous) return;

    setError(null);
    startTransition(async () => {
      const res = await addMilestone({ projectId, title });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      updateLocalProject(projectId, () => res.data);
    });
  }

  function handleCompleteMilestone(milestoneId: string) {
    const project = projects.find((item) => item.milestones.some((milestone) => milestone.id === milestoneId));
    if (!project) return;
    const previous = project;

    setError(null);
    updateLocalProject(project.id, (current) => ({
      ...current,
      milestones: current.milestones.map((milestone) =>
        milestone.id === milestoneId
          ? { ...milestone, status: "done", completedAt: milestone.completedAt ?? new Date().toISOString() }
          : milestone,
      ),
    }));

    startTransition(async () => {
      const res = await completeMilestone({ milestoneId });
      if (!res.ok) {
        updateLocalProject(project.id, () => previous);
        setError(res.error);
        return;
      }
      updateLocalProject(project.id, () => res.data);
    });
  }

  function handleMoveMilestone(projectId: string, milestoneId: string, direction: "up" | "down") {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const ordered = [...project.milestones].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = ordered.findIndex((milestone) => milestone.id === milestoneId);
    if (currentIndex < 0) return;

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= ordered.length) return;

    const swapped = [...ordered];
    [swapped[currentIndex], swapped[nextIndex]] = [swapped[nextIndex], swapped[currentIndex]];
    const reorderedIds = swapped.map((milestone) => milestone.id);
    const previous = project;

    updateLocalProject(projectId, (current) => ({
      ...current,
      milestones: swapped.map((milestone, index) => ({ ...milestone, orderIndex: index })),
    }));

    startTransition(async () => {
      const res = await reorderMilestones({ projectId, milestoneIds: reorderedIds });
      if (!res.ok) {
        updateLocalProject(projectId, () => previous);
        setError(res.error);
        return;
      }
      updateLocalProject(projectId, () => res.data);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-white/15 bg-black/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
          <Input
            placeholder="https://github.com/..."
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
          <Input
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Keep projects moving from planning to shipped.</p>
          <Button type="button" onClick={handleAddProject} disabled={isPending || !name.trim()}>
            <Plus className="size-4" aria-hidden />
            Add Project
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          placeholder="Search projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      {error ? <p className="text-sm text-rose-400/90">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {COLUMNS.map((status) => (
          <section
            key={status}
            className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
            aria-label={`${status} projects`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{status}</h2>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-300">
                {projectsByStatus[status].length}
              </span>
            </div>

            {projectsByStatus[status].length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-3 py-6 text-center text-xs text-zinc-500">
                No projects
              </p>
            ) : (
              <div className="space-y-3">
                {projectsByStatus[status].map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isPending={isPending}
                    onSetStatus={handleSetStatus}
                    onAddMilestone={handleAddMilestone}
                    onCompleteMilestone={handleCompleteMilestone}
                    onMoveMilestone={handleMoveMilestone}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
