import type { Metadata } from "next";
import { GitFork, Sparkles } from "lucide-react";

import { getSimilarGraph } from "@/app/actions/similar";
import { SimilarClient } from "@/components/similar/similar-client";

export const metadata: Metadata = { title: "Similar" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ title?: string }>;
};

export default async function SimilarPage({ searchParams }: Props) {
  const [{ title }, graph] = await Promise.all([searchParams, getSimilarGraph()]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2">
          <GitFork className="size-6 text-cyan-200" aria-hidden />
          <h1 className="text-2xl font-semibold text-zinc-50">Similar</h1>
          <Sparkles className="size-5 text-fuchsia-300" aria-hidden />
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          Nearest neighbors from sentence embeddings. Compare them to wiki-link
          related videos — disagreement is the interesting part.
        </p>
      </div>
      <SimilarClient graph={graph} initialTitle={title} />
    </div>
  );
}
