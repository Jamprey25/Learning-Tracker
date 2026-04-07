const YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export { YOUTUBE_READONLY_SCOPE };

type TokenResponse = {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

export async function refreshYoutubeAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `OAuth token refresh failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    throw new Error("OAuth response missing access_token.");
  }
  return data.access_token;
}

export type WatchLaterItem = {
  videoId: string;
  title: string;
  thumbnail: string;
};

type PlaylistItemsResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      resourceId?: { videoId?: string };
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
  nextPageToken?: string;
  error?: { message?: string };
};

/**
 * Fetches latest entries from a user-owned playlist.
 * Requires OAuth with `youtube.readonly` and a refresh token with that scope.
 */
export async function fetchWatchLaterPlaylistItems(
  accessToken: string,
  playlistId: string,
  maxResults: number,
): Promise<WatchLaterItem[]> {
  const items: WatchLaterItem[] = [];
  const limit = Math.max(1, maxResults);
  let pageToken: string | null = null;

  while (items.length < limit) {
    const pageSize = Math.min(50, limit - items.length);
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", String(pageSize));
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });

    const data = (await res.json()) as PlaylistItemsResponse;

    if (!res.ok) {
      const msg = data.error?.message ?? "Unknown YouTube API error.";
      throw new Error(`YouTube playlistItems failed (${res.status}): ${msg}`);
    }

    for (const row of data.items ?? []) {
      const snippet = row.snippet;
      const videoId = snippet?.resourceId?.videoId;
      if (!videoId) continue;

      const title = snippet?.title?.trim() || "Untitled";
      const thumb =
        snippet?.thumbnails?.high?.url ??
        snippet?.thumbnails?.medium?.url ??
        snippet?.thumbnails?.default?.url ??
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      items.push({ videoId, title, thumbnail: thumb });
      if (items.length >= limit) break;
    }

    pageToken = data.nextPageToken ?? null;
    if (!pageToken) break;
  }

  return items;
}
