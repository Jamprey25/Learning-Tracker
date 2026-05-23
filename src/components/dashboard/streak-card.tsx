import { Flame } from "lucide-react";

type StreakCardProps = {
  current: number;
  longest: number;
};

export function StreakCard({ current, longest }: StreakCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-300/20 backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-amber-300/20 blur-2xl" />
      <p className="text-xs uppercase tracking-wider text-amber-200/80">Streak</p>
      <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-amber-100">
        <Flame className="size-6" aria-hidden />
        <span>{current} day{current === 1 ? "" : "s"}</span>
      </div>
      <p className="mt-1 text-xs text-amber-200/70">
        Longest: {longest} day{longest === 1 ? "" : "s"}
      </p>
    </div>
  );
}
