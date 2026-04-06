import { ingestYoutubeVideo } from "@/lib/youtube-ingest";
import { isAuthorizedSyncRequest } from "@/lib/sync-request-auth";

export const runtime = "nodejs";

type ImportBody = {
  urls?: unknown;
};

/**
 * POST — Import one or more YouTube URLs (e.g. from a text file via scripts/push-links-from-file.mjs).
 * Body: `{ "urls": ["https://...", ...] }`
 * Secured with `Authorization: Bearer <SYNC_SECRET>`.
 */
export async function POST(request: Request) {
  if (!isAuthorizedSyncRequest(request)) {
    return Response.json(
      { error: "Unauthorized. Set SYNC_SECRET and send Authorization: Bearer <SYNC_SECRET>." },
      { status: 401 },
    );
  }

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = body.urls;
  if (!Array.isArray(raw)) {
    return Response.json(
      { error: 'Expected JSON body: { "urls": string[] }' },
      { status: 400 },
    );
  }

  const urls = raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);

  const added: Array<{ id: string; url: string; title: string; thumbnail: string }> = [];
  const skipped: string[] = [];
  const failed: Array<{ url: string; error: string }> = [];

  for (const url of urls) {
    const result = await ingestYoutubeVideo(url);
    if (result.ok) {
      added.push(result.video);
    } else if (result.error.includes("already saved")) {
      skipped.push(url);
    } else {
      failed.push({ url, error: result.error });
    }
  }

  return Response.json({
    ok: true,
    summary: {
      requested: urls.length,
      added: added.length,
      skipped: skipped.length,
      failed: failed.length,
    },
    added,
    skipped,
    failed,
  });
}
