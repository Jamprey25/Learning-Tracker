import { isAuthorizedSyncRequest } from "@/lib/sync-request-auth";
import { runWatchLaterSync } from "@/lib/watch-later-sync";

export const runtime = "nodejs";

/**
 * POST — Pull recent Watch Later entries (default 50) into the database.
 * Secured with `Authorization: Bearer <SYNC_SECRET>` for cron jobs and scripts.
 */
export async function POST(request: Request) {
  if (!isAuthorizedSyncRequest(request)) {
    return Response.json(
      { error: "Unauthorized. Set SYNC_SECRET and send Authorization: Bearer <SYNC_SECRET>." },
      { status: 401 },
    );
  }

  try {
    const outcome = await runWatchLaterSync();
    return Response.json({ ok: true, outcome });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
