import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const NEIGHBOR_START = "<!-- embeddings-neighbors:start -->";
export const NEIGHBOR_END = "<!-- embeddings-neighbors:end -->";

export type NeighborHit = {
  slug: string;
  title: string;
  wiki: string;
  score: number;
};

export type NeighborRecord = {
  slug: string;
  title: string;
  wiki: string;
  learned: boolean;
  concepts: string[];
  relatedTitles: string[];
  neighbors: NeighborHit[];
};

export type NeighborCache = {
  model: string;
  k: number;
  generatedAt: string;
  records: NeighborRecord[];
};

export function renderNeighborSection(record: NeighborRecord): string {
  const lines = record.neighbors.map(
    (hit) =>
      `- [[${hit.wiki}|${hit.title}]] — ${hit.score.toFixed(2)}`,
  );
  return `${NEIGHBOR_START}
## Similar (embeddings)

Neighbors by **meaning** (sentence embeddings), not shared wiki-links. Compare this list to **Related videos**. Disagreement is the interesting part.

${lines.join("\n")}
${NEIGHBOR_END}
`;
}

export function upsertNeighborSection(markdown: string, section: string): string {
  const block = `${section.trim()}\n`;
  if (markdown.includes(NEIGHBOR_START) && markdown.includes(NEIGHBOR_END)) {
    return markdown.replace(
      new RegExp(`${NEIGHBOR_START}[\\s\\S]*?${NEIGHBOR_END}\\n?`),
      block,
    );
  }
  if (/^## Key Takeaways/m.test(markdown)) {
    return markdown.replace(/^## Key Takeaways/m, `${block}\n## Key Takeaways`);
  }
  return `${markdown.trimEnd()}\n\n${block}`;
}

export function disagreement(record: NeighborRecord): boolean {
  if (record.relatedTitles.length === 0) return true;
  const related = new Set(record.relatedTitles.map((title) => title.toLowerCase()));
  return record.neighbors.every((hit) => !related.has(hit.title.toLowerCase()));
}

export function renderNeighborHub(cache: NeighborCache): string {
  const interesting = cache.records.filter(disagreement).slice(0, 40);
  return `---
type: moc
tags:
  - embeddings
  - moc
---

# Embedding Neighbors

Nearest neighbors from \`${cache.model}\` (k=${cache.k}), generated ${cache.generatedAt.slice(0, 10)}.

Graph **Related videos** = shared concept wiki-links. **Similar (embeddings)** = cosine nearest neighbors on title + summary. When the two lists disagree, the note is doing real work.

## High disagreement

${interesting
  .map((record) => {
    const hits = record.neighbors
      .map((hit) => `[[${hit.wiki}|${hit.title}]]`)
      .join(", ");
    return `- [[${record.wiki}|${record.title}]] → ${hits}`;
  })
  .join("\n")}

## All notes

${cache.records
  .map(
    (record) =>
      `- [[${record.wiki}|${record.title}]]${record.learned ? " ✅" : ""}`,
  )
  .join("\n")}
`;
}

export async function applyNeighborCache(
  vaultDir: string,
  cache: NeighborCache,
): Promise<number> {
  let written = 0;
  for (const record of cache.records) {
    const abs = path.join(vaultDir, `${record.wiki}.md`);
    try {
      const current = await readFile(abs, "utf8");
      const next = upsertNeighborSection(current, renderNeighborSection(record));
      if (next !== current) {
        await writeFile(abs, next, "utf8");
        written += 1;
      }
    } catch {
      // note missing after a partial export
    }
  }
  await mkdir(path.join(vaultDir, "Learning Tracker"), { recursive: true });
  await writeFile(
    path.join(vaultDir, "Learning Tracker", "Embedding Neighbors.md"),
    renderNeighborHub(cache),
    "utf8",
  );
  return written;
}

export async function loadNeighborCache(
  filePath: string,
): Promise<NeighborCache | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as NeighborCache;
  } catch {
    return null;
  }
}
