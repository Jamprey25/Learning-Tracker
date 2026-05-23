import { Sparkles } from "lucide-react";

type WeeklySummaryProps = {
  eventCount: number;
  xpTotal: number;
};

export function WeeklySummary({ eventCount, xpTotal }: WeeklySummaryProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-violet-500/10 p-4 ring-1 ring-violet-300/20 backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-violet-300/20 blur-2xl" />
      <p className="text-xs uppercase tracking-wider text-violet-200/80">Last 7 days</p>
      <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-violet-100">
        <Sparkles className="size-6" aria-hidden />
        <span>+{xpTotal} XP</span>
      </div>
      <p className="mt-1 text-xs text-violet-200/70">
        {eventCount} event{eventCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
