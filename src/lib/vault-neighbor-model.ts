export type NeighborCacheFile = {
  model: string;
  k: number;
  generatedAt: string;
  records: Array<{
    slug: string;
    title: string;
    learned: boolean;
    concepts: string[];
    relatedTitles: string[];
    neighbors: Array<{ slug: string; title: string; score: number }>;
  }>;
};

export type SimilarNeighbor = {
  slug: string;
  title: string;
  score: number;
  inGraphRelated: boolean;
  thumbnail?: string;
  url?: string;
  isLearned?: boolean;
};

export type SimilarVideo = {
  slug: string;
  title: string;
  learned: boolean;
  concepts: string[];
  relatedTitles: string[];
  neighbors: SimilarNeighbor[];
  disagrees: boolean;
  thumbnail?: string;
  url?: string;
  videoId?: string;
};

export type SimilarGraph = {
  model: string;
  k: number;
  generatedAt: string;
  videos: SimilarVideo[];
  disagreementCount: number;
};

export function titleKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function graphDisagrees(
  relatedTitles: string[],
  neighborTitles: string[],
): boolean {
  if (relatedTitles.length === 0) return true;
  const related = new Set(relatedTitles.map(titleKey));
  return neighborTitles.every((title) => !related.has(titleKey(title)));
}
