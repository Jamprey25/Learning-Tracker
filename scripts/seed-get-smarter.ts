/**
 * Seeds the DB with "Get Smarter" sessions from data/get-smarter-videos.json.
 * Resolves each title via YouTube Data API search (needs YOUTUBE_API_KEY).
 *
 * Usage (from project root):
 *   npx tsx --tsconfig tsconfig.json scripts/seed-get-smarter.ts
 *
 * Requires DATABASE_URL and YOUTUBE_API_KEY in .env (same Google project as
 * YouTube Data API v3 enabled).
 */

/** Load `.env` before any module that reads `process.env` (e.g. Prisma). */
import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalYoutubeWatchUrl } from "../src/lib/youtube";
import { ingestYoutubeVideo } from "../src/lib/youtube-ingest";
import { prisma } from "../src/lib/prisma";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type Session = { date: string; titles: string[] };
type DataFile = { sessions: Session[] };

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

async function searchFirstVideo(
  apiKey: string,
  q: string,
): Promise<{ videoId: string; title: string; thumbnail: string } | null> {
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  u.searchParams.set("part", "snippet");
  u.searchParams.set("type", "video");
  u.searchParams.set("maxResults", "1");
  u.searchParams.set("q", q);
  u.searchParams.set("key", apiKey);

  const res = await fetch(u.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube search HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { items?: SearchItem[] };
  const item = data.items?.[0];
  const videoId = item?.id?.videoId;
  const title = item?.snippet?.title;
  const thumbs = item?.snippet?.thumbnails;
  const thumbnail =
    thumbs?.high?.url ??
    thumbs?.medium?.url ??
    thumbs?.default?.url ??
    null;
  if (!videoId || !title || !thumbnail) return null;
  return { videoId, title, thumbnail };
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "Missing YOUTUBE_API_KEY in .env. Create a key in Google Cloud (YouTube Data API v3) and add it.",
    );
    process.exit(1);
  }

  const jsonPath = path.join(__dirname, "..", "data", "get-smarter-videos.json");
  const raw = await fs.readFile(jsonPath, "utf8");
  const data = JSON.parse(raw) as DataFile;

  let added = 0;
  let skipped = 0;
  let failed = 0;

  try {
  for (const session of data.sessions) {
    const base = new Date(`${session.date}T12:00:00.000Z`);
    for (let i = 0; i < session.titles.length; i++) {
      const title = session.titles[i];
      const createdAt = new Date(base.getTime() + i * 1000);
      try {
        const found = await searchFirstVideo(apiKey, title);
        await new Promise((r) => setTimeout(r, 120));
        if (!found) {
          console.warn(`No result: "${title}" (${session.date})`);
          failed += 1;
          continue;
        }
        const url = canonicalYoutubeWatchUrl(found.videoId);
        const result = await ingestYoutubeVideo(url, {
          title: found.title,
          thumbnail: found.thumbnail,
          createdAt,
        });
        if (result.ok) {
          console.log(`Added: ${found.title}`);
          added += 1;
        } else if (result.error.includes("already saved")) {
          console.log(`Skip (exists): ${url}`);
          skipped += 1;
        } else {
          console.warn(`Failed: ${title} — ${result.error}`);
          failed += 1;
        }
      } catch (e) {
        console.error(`Error for "${title}":`, e);
        failed += 1;
      }
    }
  }

  console.log(JSON.stringify({ added, skipped, failed }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
