"use server";

import { listVideos, type DashboardVideo } from "@/app/actions/video";
import { runWatchLaterSync, type WatchLaterSyncOutcome } from "@/lib/watch-later-sync";

export type SyncWatchLaterActionResult =
  | { ok: true; result: WatchLaterSyncOutcome; videos: DashboardVideo[] }
  | { ok: false; error: string };

/**
 * Server action for the dashboard "Sync Now" button: pulls Watch Later via OAuth and returns the updated list.
 */
export async function syncWatchLaterFromPlaylist(): Promise<SyncWatchLaterActionResult> {
  try {
    const outcome = await runWatchLaterSync();
    const videos = await listVideos();
    return { ok: true, result: outcome, videos };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return { ok: false, error: message };
  }
}
