export const CATEGORIES = [
  "General",
  "Programming",
  "Mathematics",
  "Science",
  "Language",
  "History",
  "Design",
  "Business",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const COLOR_MAP: Record<Category, string> = {
  General:     "bg-zinc-500/20 text-zinc-400",
  Programming: "bg-blue-500/20 text-blue-300",
  Mathematics: "bg-violet-500/20 text-violet-300",
  Science:     "bg-emerald-500/20 text-emerald-300",
  Language:    "bg-amber-500/20 text-amber-300",
  History:     "bg-orange-500/20 text-orange-300",
  Design:      "bg-pink-500/20 text-pink-300",
  Business:    "bg-cyan-500/20 text-cyan-300",
  Other:       "bg-zinc-500/20 text-zinc-400",
};

export function categoryColor(category: string): string {
  return COLOR_MAP[category as Category] ?? "bg-zinc-500/20 text-zinc-400";
}
