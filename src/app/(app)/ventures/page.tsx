import type { Metadata } from "next";
import { Lightbulb, Sparkles } from "lucide-react";

import { listVentures } from "@/app/actions/venture";
import { VenturesClient } from "@/components/ventures/ventures-client";

export const metadata: Metadata = { title: "Ventures" };
export const dynamic = "force-dynamic";

export default async function VenturesPage() {
  const ventures = await listVentures();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-6 text-cyan-200" aria-hidden />
          <h1 className="text-2xl font-semibold text-zinc-50">Ventures</h1>
          <Sparkles className="size-5 text-fuchsia-300" aria-hidden />
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          Track startup ideas from validation through launch with one key metric each.
        </p>
      </div>

      <VenturesClient initialVentures={ventures} />
    </div>
  );
}
