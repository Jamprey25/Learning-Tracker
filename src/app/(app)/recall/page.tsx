import type { Metadata } from "next";
import { Brain } from "lucide-react";

import { loadRecallQueue } from "@/app/actions/recall";
import { RecallSession } from "@/components/recall/recall-session";

export const metadata: Metadata = { title: "Recall" };
export const dynamic = "force-dynamic";

export default async function RecallPage() {
  const queue = await loadRecallQueue();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-4">
        <div className="flex items-center gap-2">
          <Brain className="size-6 text-violet-200" aria-hidden />
          <h1 className="text-2xl font-semibold text-zinc-50">Recall</h1>
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          A short mixed review of ideas from videos you marked learned. Weak cards come back sooner.
        </p>
      </div>
      <RecallSession initialCards={queue.cards} source={queue.source} />
    </div>
  );
}
