import type { Metadata } from "next";
import Link from "next/link";
import { Film, GitFork, Sparkles } from "lucide-react";

import { listVideos } from "@/app/actions/video";
import { VideosClient } from "@/components/videos/videos-client";

export const metadata: Metadata = { title: "Videos" };
export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const videos = await listVideos();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2">
          <Film className="size-6 text-violet-200" aria-hidden />
          <h1 className="text-2xl font-semibold text-zinc-50">Videos</h1>
          <Sparkles className="size-5 text-fuchsia-300" aria-hidden />
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          Browse reference summaries you can study later — expand any card for
          what to remember, retrieval questions, and takeaways.
        </p>
        <Link
          href="/similar"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-300 underline-offset-4 hover:underline"
        >
          <GitFork className="size-3.5" aria-hidden />
          Open embedding neighbors
        </Link>
      </div>
      <VideosClient initialVideos={videos} />
    </div>
  );
}
