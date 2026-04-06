#!/usr/bin/env node
/**
 * Reads a text file (one YouTube URL per line) and POSTs them to /api/videos/import.
 *
 * Requires the app running (e.g. npm run dev) and in `.env`:
 *   SYNC_SECRET
 *   IMPORT_BASE_URL (optional, default http://localhost:3000)
 *
 * Usage:
 *   node scripts/push-links-from-file.mjs ./links.txt
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: node scripts/push-links-from-file.mjs <path-to-links.txt>");
  process.exit(1);
}

const secret = process.env.SYNC_SECRET?.trim();
if (!secret) {
  console.error("Missing SYNC_SECRET in .env");
  process.exit(1);
}

const base = (process.env.IMPORT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const endpoint = `${base}/api/videos/import`;

async function main() {
  const raw = await fs.readFile(path.resolve(fileArg), "utf8");
  const urls = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (urls.length === 0) {
    console.log("No non-empty lines in file.");
    return;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ urls }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Request failed (${res.status}):`, data);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
