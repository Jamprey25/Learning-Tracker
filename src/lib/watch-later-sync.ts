import { canonicalYoutubeWatchUrl } from "@/lib/youtube";
import { ingestYoutubeVideo } from "@/lib/youtube-ingest";
import {
  fetchWatchLaterPlaylistItems,
  refreshYoutubeAccessToken,
} from "@/lib/youtube-watch-later";

const DEFAULT_MAX = 50;

export type WatchLaterSyncResult = {
  attempted: number;
  added: number;
  skipped: number;
  errors: string[];
};

export type WatchLaterSyncOutcome =
  | { ok: true; result: WatchLaterSyncResult }
  | { ok: false; error: string };

function getEnv(): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  playlistId: string;
} | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim();
  const playlistId = process.env.YOUTUBE_SYNC_PLAYLIST_ID?.trim();
  if (!clientId || !clientSecret || !refreshToken || !playlistId) return null;
  return { clientId, clientSecret, refreshToken, playlistId };
}

export function isWatchLaterConfigured(): boolean {
  return getEnv() !== null;
}

/**
 * Pulls the latest N videos from Watch Later and inserts any that are not already in the DB.
 */
export async function runWatchLaterSync(
  maxResults: number = DEFAULT_MAX,
): Promise<WatchLaterSyncOutcome> {
  const env = getEnv();
  if (!env) {
    return {
      ok: false,
      error:
        "YouTube sync is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, and YOUTUBE_SYNC_PLAYLIST_ID.",
    };
  }

  const accessToken = await refreshYoutubeAccessToken(
    env.clientId,
    env.clientSecret,
    env.refreshToken,
  );

  if (env.playlistId === "WL") {
    return {
      ok: false,
      error:
        "YouTube Data API does not reliably expose Watch Later (WL). Create a regular playlist (can be Private), set YOUTUBE_SYNC_PLAYLIST_ID to its playlist ID (starts with PL...), then sync again.",
    };
  }

  const items = await fetchWatchLaterPlaylistItems(
    accessToken,
    env.playlistId,
    maxResults,
  );

  const result: WatchLaterSyncResult = {
    attempted: items.length,
    added: 0,
    skipped: 0,
    errors: [],
  };

  for (const item of items) {
    const url = canonicalYoutubeWatchUrl(item.videoId);
    const ingest = await ingestYoutubeVideo(url, {
      title: item.title,
      thumbnail: item.thumbnail,
    });

    if (ingest.ok) {
      result.added += 1;
    } else if (ingest.error.includes("already saved")) {
      result.skipped += 1;
    } else {
      result.errors.push(`${item.videoId}: ${ingest.error}`);
    }
  }

  return { ok: true, result };
}
