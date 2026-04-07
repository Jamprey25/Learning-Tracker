import type { Category } from "@/lib/categories";

const CATEGORY_KEYWORDS: Record<Exclude<Category, "General">, readonly string[]> = {
  Programming: [
    "coding",
    "code",
    "programming",
    "programmer",
    "software",
    "web app",
    "application",
    "docker",
    "api",
    "environment variable",
    "engineer",
    "architecture",
  ],
  Mathematics: [
    "mathematics",
    "math",
    "algebra",
    "calculus",
    "geometry",
    "statistics",
    "probability",
    "linear algebra",
    "theorem",
  ],
  Science: [
    "science",
    "physics",
    "quantum",
    "semiconductor",
    "chip",
    "gpu",
    "ram",
    "machine learning",
    "deep learning",
    "generative ai",
  ],
  Language: [
    "language",
    "linguistics",
    "grammar",
    "vocabulary",
    "english",
    "spanish",
    "french",
    "german",
  ],
  History: [
    "history",
    "doctrine",
    "empire",
    "war",
    "ancient",
    "geopolitics",
    "monroe",
  ],
  Design: ["design", "ui", "ux", "figma", "typography", "color theory"],
  Business: [
    "business",
    "startup",
    "economy",
    "economic",
    "banking",
    "investing",
    "market",
    "capital allocation",
    "credit",
    "data center",
    "oracle",
    "palantir",
    "anduril",
    "oil",
    "petrodollar",
    "j.p. morgan",
    "africa",
    "trump",
    "china debt",
  ],
  Other: ["philosophy", "productivity", "motivation"],
};

const CATEGORY_PRIORITY: readonly Exclude<Category, "General">[] = [
  "Programming",
  "Science",
  "Mathematics",
  "Business",
  "History",
  "Language",
  "Design",
  "Other",
];

function scoreTitle(title: string, keywords: readonly string[]) {
  let score = 0;
  for (const keyword of keywords) {
    if (title.includes(keyword)) score += 1;
  }
  return score;
}

/**
 * Lightweight heuristic classifier for existing seeded titles.
 * Returns "General" when no category has a positive match score.
 */
export function inferCategoryFromTitle(title: string): Category {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return "General";

  let bestCategory: Exclude<Category, "General"> | null = null;
  let bestScore = 0;

  for (const category of CATEGORY_PRIORITY) {
    const score = scoreTitle(normalized, CATEGORY_KEYWORDS[category]);
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory ?? "General";
}

