import { canonicalYoutubeWatchUrl } from "@/lib/youtube";
import { ingestYoutubeVideo } from "@/lib/youtube-ingest";
import {
  fetchWatchLaterPlaylistItems,
  refreshYoutubeAccessToken,
} from "@/lib/youtube-watch-later";

/** Default cap on how many playlist positions we walk (YouTube often appends new saves at the end). */
const DEFAULT_MAX = 2000;
const ABSOLUTE_MAX = 5000;

function resolvedSyncMaxResults(explicit?: number): number {
  if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
    return Math.min(Math.floor(explicit), ABSOLUTE_MAX);
  }
  const raw = process.env.YOUTUBE_SYNC_MAX_RESULTS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(n, ABSOLUTE_MAX);
    }
  }
  return DEFAULT_MAX;
}

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
 * Walks the configured playlist in order (up to a capped number of entries) and inserts
 * videos not already in the DB. New saves are often appended at the end, so the cap must
 * cover enough positions to reach them.
 */
export async function runWatchLaterSync(
  maxResults?: number,
): Promise<WatchLaterSyncOutcome> {
  const limit = resolvedSyncMaxResults(maxResults);
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
    limit,
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
