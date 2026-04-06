import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canonicalYoutubeWatchUrl,
  extractYoutubeVideoId,
} from "@/lib/youtube";

export type SaveYoutubeVideoResult =
  | {
      ok: true;
      video: {
        id: string;
        url: string;
        title: string;
        thumbnail: string;
        createdAt: string;
      };
    }
  | { ok: false; error: string };

type OEmbedResponse = {
  title: string;
  thumbnail_url: string;
};

async function fetchYoutubeOEmbed(pageUrl: string): Promise<OEmbedResponse> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", pageUrl);
  endpoint.searchParams.set("format", "json");

  const res = await fetch(endpoint.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const detail =
      res.status === 404
        ? "Video not found or not embeddable."
        : `oEmbed request failed (${res.status}).`;
    throw new Error(detail);
  }

  const data = (await res.json()) as Partial<OEmbedResponse>;
  if (!data.title || !data.thumbnail_url) {
    throw new Error("oEmbed response missing title or thumbnail.");
  }

  return { title: data.title, thumbnail_url: data.thumbnail_url };
}

export type IngestYoutubeOptions = {
  /** When set (e.g. from YouTube Data API), skips oEmbed. */
  title?: string;
  thumbnail?: string;
  /** Override row timestamp (e.g. historical watch sessions). */
  createdAt?: Date;
};

/**
 * Fetches title/thumbnail via oEmbed unless provided, then stores a {@link Video} row.
 * Duplicate URLs are rejected using a normalized watch URL per video ID.
 */
export async function ingestYoutubeVideo(
  inputUrl: string,
  opts?: IngestYoutubeOptions,
): Promise<SaveYoutubeVideoResult> {
  const videoId = extractYoutubeVideoId(inputUrl);
  if (!videoId) {
    return { ok: false, error: "Invalid or unsupported YouTube URL." };
  }

  const canonicalUrl = canonicalYoutubeWatchUrl(videoId);

  const existing = await prisma.video.findUnique({ where: { url: canonicalUrl } });
  if (existing) {
    return { ok: false, error: "That video is already saved." };
  }

  let title: string;
  let thumbnail: string;

  if (opts?.title && opts?.thumbnail) {
    title = opts.title;
    thumbnail = opts.thumbnail;
  } else {
    try {
      const oembed = await fetchYoutubeOEmbed(canonicalUrl);
      title = oembed.title;
      thumbnail = oembed.thumbnail_url;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load video metadata.";
      return { ok: false, error: message };
    }
  }

  try {
    const video = await prisma.video.create({
      data: {
        url: canonicalUrl,
        title,
        thumbnail,
        ...(opts?.createdAt ? { createdAt: opts.createdAt } : {}),
      },
      select: { id: true, url: true, title: true, thumbnail: true, createdAt: true },
    });
    return {
      ok: true,
      video: { ...video, createdAt: video.createdAt.toISOString() },
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "That video is already saved." };
    }
    throw e;
  }
}
