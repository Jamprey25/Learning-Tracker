type ActivityPoint = {
  date: string;
  count: number;
  xp: number;
};

type ActivityHeatmapProps = {
  activity: ActivityPoint[];
};

function levelClass(value: number, max: number): string {
  if (value <= 0 || max <= 0) return "bg-white/5";
  const ratio = value / max;
  if (ratio < 0.34) return "bg-emerald-500/30";
  if (ratio < 0.67) return "bg-emerald-500/55";
  return "bg-emerald-400/80";
}

export function ActivityHeatmap({ activity }: ActivityHeatmapProps) {
  const maxCount = activity.reduce((max, day) => Math.max(max, day.count), 0);
  const columns: ActivityPoint[][] = [];

  for (let i = 0; i < activity.length; i += 7) {
    columns.push(activity.slice(i, i + 7));
  }

  return (
    <div className="rounded-2xl bg-zinc-950/45 p-4 ring-1 ring-white/8 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-wider text-zinc-400">
        Activity (last 12 weeks)
      </p>
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {columns.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`size-3 rounded-[3px] ring-1 ring-white/10 ${levelClass(day.count, maxCount)}`}
                title={`${day.date}: ${day.count} event${day.count === 1 ? "" : "s"}, ${day.xp} XP`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
