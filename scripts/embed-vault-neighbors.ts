import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { embedTexts, topKNeighbors } from "./text-embeddings";
import { loadVaultVideoNotes, noteToEmbedText } from "./obsidian-note-parse";
import {
  applyNeighborCache,
  type NeighborCache,
  type NeighborRecord,
} from "./obsidian-neighbors";

const DEFAULT_VAULT =
  "/Users/josephamprey/Documents/Documents - Joseph’s MacBook Air (2)/Obsidian Vault";

function parseArgs(argv: string[]) {
  let vaultDir = process.env.OBSIDIAN_VAULT_PATH?.trim() || DEFAULT_VAULT;
  let k = 5;
  let limit: number | undefined;
  let backend: "local" | "hash" = "local";

  for (const arg of argv) {
    if (arg.startsWith("--vault=")) vaultDir = arg.slice("--vault=".length);
    if (arg === "--hash") backend = "hash";
    if (arg.startsWith("--k=")) {
      const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
      if (Number.isFinite(value) && value > 0) k = value;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
      if (Number.isFinite(value) && value > 0) limit = value;
    }
  }

  return { vaultDir, k, limit, backend };
}

async function main() {
  const { vaultDir, k, limit, backend } = parseArgs(process.argv.slice(2));
  const notes = (await loadVaultVideoNotes(vaultDir)).slice(
    0,
    limit ?? Number.POSITIVE_INFINITY,
  );
  if (notes.length < 2) {
    console.log("Need at least 2 video notes in Learning Tracker/Videos.");
    return;
  }

  const texts = notes.map(noteToEmbedText);
  let model = "Xenova/all-MiniLM-L6-v2";
  let embeddings: number[][];
  try {
    console.log(`Embedding ${notes.length} notes with ${backend} backend...`);
    embeddings = await embedTexts(texts, { backend });
    if (backend === "hash") model = "hash-64";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Local MiniLM failed (${message.slice(0, 160)}). Falling back to hash embeddings.`);
    embeddings = await embedTexts(texts, { backend: "hash" });
    model = "hash-64";
  }

  const records: NeighborRecord[] = notes.map((note, index) => ({
    slug: note.slug,
    title: note.title,
    wiki: note.relWiki,
    learned: note.learned,
    concepts: note.concepts,
    relatedTitles: note.relatedTitles,
    neighbors: topKNeighbors(index, embeddings, k).map((hit) => ({
      slug: notes[hit.index].slug,
      title: notes[hit.index].title,
      wiki: notes[hit.index].relWiki,
      score: hit.score,
    })),
  }));

  const cache: NeighborCache = {
    model,
    k,
    generatedAt: new Date().toISOString(),
    records,
  };

  const cacheDir = path.join(process.cwd(), "data");
  await mkdir(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, "vault-neighbors.json");
  await writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");

  const embeddingsPath = path.join(cacheDir, "vault-embeddings.json");
  await writeFile(
    embeddingsPath,
    JSON.stringify(
      {
        model,
        dimensions: embeddings[0]?.length ?? 0,
        vectors: notes.map((note, index) => ({
          slug: note.slug,
          title: note.title,
          embedding: embeddings[index],
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  const patched = await applyNeighborCache(vaultDir, cache);
  console.log(
    JSON.stringify(
      {
        vaultDir,
        notes: notes.length,
        model,
        k,
        patched,
        cachePath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
