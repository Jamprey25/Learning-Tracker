import type { Metadata } from "next";
import { Beaker, Sparkles } from "lucide-react";

import { listResearchTopics } from "@/app/actions/research";
import { ResearchClient } from "@/components/research/research-client";

export const metadata: Metadata = { title: "Research" };
export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const topics = await listResearchTopics();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2">
          <Beaker className="size-6 text-cyan-200" aria-hidden />
          <h1 className="text-2xl font-semibold text-zinc-50">Research</h1>
          <Sparkles className="size-5 text-fuchsia-300" aria-hidden />
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          Advance research from planning to publication-ready with clear phase checkpoints.
        </p>
      </div>

      <ResearchClient initialTopics={topics} />
    </div>
  );
}
