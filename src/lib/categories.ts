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

type GlowColor = "default" | "blue" | "violet" | "emerald" | "amber" | "pink" | "cyan";

const GLOW_MAP: Record<Category, GlowColor> = {
  General:     "default",
  Programming: "blue",
  Mathematics: "violet",
  Science:     "emerald",
  Language:    "amber",
  History:     "amber",
  Design:      "pink",
  Business:    "cyan",
  Other:       "default",
};

export function categoryGlow(category: string): GlowColor {
  return GLOW_MAP[category as Category] ?? "default";
}

const TINT_MAP: Record<Category, string> = {
  General:     "border-zinc-400/25 bg-zinc-500/8 ring-zinc-400/15",
  Programming: "border-blue-400/30 bg-blue-500/8 ring-blue-400/20",
  Mathematics: "border-violet-400/30 bg-violet-500/8 ring-violet-400/20",
  Science:     "border-emerald-400/30 bg-emerald-500/8 ring-emerald-400/20",
  Language:    "border-amber-400/30 bg-amber-500/8 ring-amber-400/20",
  History:     "border-orange-400/30 bg-orange-500/8 ring-orange-400/20",
  Design:      "border-pink-400/30 bg-pink-500/8 ring-pink-400/20",
  Business:    "border-cyan-400/30 bg-cyan-500/8 ring-cyan-400/20",
  Other:       "border-zinc-400/25 bg-zinc-500/8 ring-zinc-400/15",
};

const BAR_MAP: Record<Category, string> = {
  General:     "border-l-zinc-400",
  Programming: "border-l-blue-400",
  Mathematics: "border-l-violet-400",
  Science:     "border-l-emerald-400",
  Language:    "border-l-amber-400",
  History:     "border-l-orange-400",
  Design:      "border-l-pink-400",
  Business:    "border-l-cyan-400",
  Other:       "border-l-zinc-400",
};

const HEADING_MAP: Record<Category, string> = {
  General:     "border-zinc-400/25 bg-zinc-500/10 text-zinc-200",
  Programming: "border-blue-400/30 bg-blue-500/10 text-blue-200",
  Mathematics: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  Science:     "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  Language:    "border-amber-400/30 bg-amber-500/10 text-amber-200",
  History:     "border-orange-400/30 bg-orange-500/10 text-orange-200",
  Design:      "border-pink-400/30 bg-pink-500/10 text-pink-200",
  Business:    "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  Other:       "border-zinc-400/25 bg-zinc-500/10 text-zinc-200",
};

const PILL_IDLE_MAP: Record<Category, string> = {
  General:     "border-zinc-400/25 bg-zinc-400/8 text-zinc-400",
  Programming: "border-blue-400/25 bg-blue-400/8 text-blue-300/80",
  Mathematics: "border-violet-400/25 bg-violet-400/8 text-violet-300/80",
  Science:     "border-emerald-400/25 bg-emerald-400/8 text-emerald-300/80",
  Language:    "border-amber-400/25 bg-amber-400/8 text-amber-300/80",
  History:     "border-orange-400/25 bg-orange-400/8 text-orange-300/80",
  Design:      "border-pink-400/25 bg-pink-400/8 text-pink-300/80",
  Business:    "border-cyan-400/25 bg-cyan-400/8 text-cyan-300/80",
  Other:       "border-zinc-400/25 bg-zinc-400/8 text-zinc-400",
};

export function categoryTint(category: string): string {
  return TINT_MAP[category as Category] ?? TINT_MAP.General;
}

export function categoryBar(category: string): string {
  return BAR_MAP[category as Category] ?? BAR_MAP.General;
}

export function categoryHeading(category: string): string {
  return HEADING_MAP[category as Category] ?? HEADING_MAP.General;
}

export function categoryPillIdle(category: string): string {
  return PILL_IDLE_MAP[category as Category] ?? PILL_IDLE_MAP.General;
}
