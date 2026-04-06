const YOUTUBE_ID_RE = /^[\w-]{11}$/;

/** Resolves common YouTube URL shapes to a stable watch URL for storage and deduplication. */
export function canonicalYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function extractYoutubeVideoId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) {
      return null;
    }

    if (u.pathname === "/watch" || u.pathname.startsWith("/watch/")) {
      const v = u.searchParams.get("v");
      return v && YOUTUBE_ID_RE.test(v) ? v : null;
    }

    const embed = u.pathname.match(/^\/embed\/([\w-]{11})/);
    if (embed) return embed[1];

    const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})/);
    if (shorts) return shorts[1];

    return null;
  } catch {
    return null;
  }
}
