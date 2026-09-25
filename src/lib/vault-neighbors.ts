import { readFile } from "node:fs/promises";
import path from "node:path";

import type { DashboardVideo } from "@/app/actions/video";
import {
  graphDisagrees,
  titleKey,
  type NeighborCacheFile,
  type SimilarGraph,
} from "@/lib/vault-neighbor-model";

export type {
  NeighborCacheFile,
  SimilarGraph,
  SimilarNeighbor,
  SimilarVideo,
} from "@/lib/vault-neighbor-model";
export { graphDisagrees, titleKey } from "@/lib/vault-neighbor-model";

export async function readNeighborCache(): Promise<NeighborCacheFile | null> {
  try {
    const filePath = path.join(process.cwd(), "data", "vault-neighbors.json");
    return JSON.parse(await readFile(filePath, "utf8")) as NeighborCacheFile;
  } catch {
    return null;
  }
}

export function hydrateSimilarGraph(
  cache: NeighborCacheFile | null,
  videos: DashboardVideo[],
): SimilarGraph {
  if (!cache) {
    return {
      model: "",
      k: 0,
      generatedAt: "",
      videos: [],
      disagreementCount: 0,
    };
  }

  const byTitle = new Map(videos.map((video) => [titleKey(video.title), video]));

  const hydrated = cache.records.map((record) => {
    const self = byTitle.get(titleKey(record.title));
    const related = new Set(record.relatedTitles.map(titleKey));
    const neighbors = record.neighbors.map((hit) => {
      const match = byTitle.get(titleKey(hit.title));
      return {
        slug: hit.slug,
        title: hit.title,
        score: hit.score,
        inGraphRelated: related.has(titleKey(hit.title)),
        thumbnail: match?.thumbnail,
        url: match?.url,
        isLearned: match?.isLearned,
      };
    });
    return {
      slug: record.slug,
      title: record.title,
      learned: record.learned,
      concepts: record.concepts,
      relatedTitles: record.relatedTitles,
      neighbors,
      disagrees: graphDisagrees(
        record.relatedTitles,
        record.neighbors.map((hit) => hit.title),
      ),
      thumbnail: self?.thumbnail,
      url: self?.url,
      videoId: self?.id,
    };
  });

  return {
    model: cache.model,
    k: cache.k,
    generatedAt: cache.generatedAt,
    videos: hydrated,
    disagreementCount: hydrated.filter((video) => video.disagrees).length,
  };
}
