"use server";

import { listVideos } from "@/app/actions/video";
import {
  hydrateSimilarGraph,
  readNeighborCache,
  type SimilarGraph,
} from "@/lib/vault-neighbors";

export async function getSimilarGraph(): Promise<SimilarGraph> {
  const cache = await readNeighborCache();
  let videos: Awaited<ReturnType<typeof listVideos>> = [];
  try {
    videos = await listVideos();
  } catch {
    videos = [];
  }
  return hydrateSimilarGraph(cache, videos);
}
