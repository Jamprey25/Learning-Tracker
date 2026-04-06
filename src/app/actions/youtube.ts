"use server";

import { ingestYoutubeVideo, type SaveYoutubeVideoResult } from "@/lib/youtube-ingest";

/**
 * Fetches title and thumbnail via YouTube's oEmbed API and stores a {@link Video} row.
 * Duplicate URLs are rejected using a normalized watch URL per video ID.
 */
export async function saveYoutubeVideo(
  inputUrl: string,
  category?: string,
): Promise<SaveYoutubeVideoResult> {
  return ingestYoutubeVideo(inputUrl, { category });
}
