import type { Metadata } from "next";
import { FolderKanban, Sparkles } from "lucide-react";

import { listProjects } from "@/app/actions/project";
import { ProjectsClient } from "@/components/projects/projects-client";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2">
          <FolderKanban className="size-6 text-cyan-200" aria-hidden />
          <h1 className="text-2xl font-semibold text-zinc-50">Projects</h1>
          <Sparkles className="size-5 text-fuchsia-300" aria-hidden />
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          Run your coding projects in stages, close milestones, and earn shipped XP.
        </p>
      </div>

      <ProjectsClient initialProjects={projects} />
    </div>
  );
}
