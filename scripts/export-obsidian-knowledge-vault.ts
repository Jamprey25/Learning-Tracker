import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import { applyGraphColorGroups } from "./obsidian-graph-colors";
import { enrichFromTitle } from "./obsidian-local-enrichment";
import { applyNeighborCache, loadNeighborCache } from "./obsidian-neighbors";
import type { GeneratedNote, VideoRow } from "./obsidian-vault-types";

type EnrichedVideo = VideoRow & {
  slug: string;
  generated: GeneratedNote;
};

const DEFAULT_VAULT =
  "/Users/josephamprey/Documents/Documents - Joseph’s MacBook Air (2)/Obsidian Vault";

const PREFERRED_CONCEPTS = [
  "Quantum Computing",
  "Machine Learning",
  "Large Language Models",
  "AI Agents",
  "System Design",
  "Cloud Computing",
  "Semiconductors",
  "GPUs",
  "Startups",
  "Investing",
  "Markets",
  "Macroeconomics",
  "Energy",
  "Geopolitics",
  "Programming",
  "Authentication",
  "Private Equity",
  "Hedge Funds",
  "Bonds",
  "Options Trading",
  "Data Centers",
  "Nuclear Energy",
  "Deep Work",
  "Obsidian",
];

function parseArgs(argv: string[]) {
  let fromJson = "/tmp/learning-tracker-videos.json";
  let vaultDir = process.env.OBSIDIAN_VAULT_PATH?.trim() || DEFAULT_VAULT;
  let limit: number | undefined;
  let concurrency = 3;
  let useLlm = false;

  for (const arg of argv) {
    if (arg.startsWith("--from-json=")) fromJson = arg.slice("--from-json=".length);
    if (arg.startsWith("--vault=")) vaultDir = arg.slice("--vault=".length);
    if (arg === "--llm") useLlm = true;
    if (arg.startsWith("--limit=")) {
      const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
      if (Number.isFinite(value) && value > 0) limit = value;
    }
    if (arg.startsWith("--concurrency=")) {
      const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
      if (Number.isFinite(value) && value > 0) concurrency = Math.min(value, 6);
    }
  }

  return { fromJson, vaultDir, limit, concurrency, useLlm };
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return slug || "untitled-video";
}

function toWikiTarget(value: string): string {
  return value.replace(/[\[\]#|]/g, "").trim();
}

function uniqueSlugs(videos: VideoRow[]): EnrichedVideo[] {
  const used = new Map<string, number>();
  return videos.map((video) => {
    const base = slugify(video.title);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const slug = n === 1 ? base : `${base}-${n}`;
    return {
      ...video,
      slug,
      generated: enrichFromTitle(video),
    };
  });
}

function fallbackGenerated(video: VideoRow): GeneratedNote {
  return enrichFromTitle(video);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function extractJsonArray(text: string): unknown[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeGenerated(raw: unknown, video: VideoRow): GeneratedNote {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const strings = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const fallback = fallbackGenerated(video);
  const summary =
    typeof row.summary === "string" && row.summary.trim()
      ? row.summary.trim()
      : fallback.summary;
  const concepts = strings(row.concepts)
    .slice(0, 4)
    .map((concept) => toWikiTarget(concept))
    .filter(Boolean);
  const remember = strings(row.remember ?? row.reference_notes).slice(0, 8);
  return {
    url: video.url,
    summary,
    remember: remember.length > 0 ? remember : fallback.remember,
    discussionQuestions: strings(
      row.discussion_questions ?? row.discussionQuestions,
    ).slice(0, 6),
    concepts: concepts.length > 0 ? concepts : fallback.concepts,
    takeaways: strings(row.takeaways).slice(0, 6),
  };
}

async function generateBatch(
  client: Anthropic,
  batch: EnrichedVideo[],
): Promise<void> {
  const payload = batch.map((video, index) => ({
    index,
    title: video.title,
    category: video.category,
    url: video.url,
    learned: video.isLearned,
  }));

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are writing Obsidian study notes from video titles only. Be specific, opinionated, and useful to a CS student who also studies markets, energy, and geopolitics. Write so a future-you can skip the rewatch.

Preferred concept names (reuse these when they fit; otherwise invent a short Title Case concept):
${PREFERRED_CONCEPTS.join(", ")}

Return ONLY a JSON array. One object per video, same order, with keys:
- "index" (number)
- "summary" (5-8 sentences a future-you can study from. Cover: core claim, mechanism, named terms, main caveat, and when to reuse the idea. No "this video". Weave in the actual title subject — Palantir, Grover, the Fed — not a generic topic blurb.)
- "remember" (5-7 specific facts, definitions, or formulas you would look up later)
- "discussion_questions" (4 strings that force retrieval and transfer)
- "concepts" (2-4 Title Case strings)
- "takeaways" (3 strings starting with an action verb)

Videos:
${JSON.stringify(payload)}`,
      },
    ],
  });

  const text =
    message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonArray(text);
  if (!parsed) return;

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const index = (item as { index?: unknown }).index;
    if (typeof index !== "number" || !batch[index]) continue;
    const generated = normalizeGenerated(item, batch[index]);
    if (generated.discussionQuestions.length === 0) {
      generated.discussionQuestions = fallbackGenerated(batch[index]).discussionQuestions;
    }
    if (generated.takeaways.length === 0) {
      generated.takeaways = fallbackGenerated(batch[index]).takeaways;
    }
    if (generated.remember.length === 0) {
      generated.remember = fallbackGenerated(batch[index]).remember;
    }
    batch[index].generated = generated;
  }
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

function videoPath(slug: string): string {
  return `Learning Tracker/Videos/${slug}`;
}

function conceptPath(concept: string): string {
  return `Learning Tracker/Concepts/${toWikiTarget(concept)}`;
}

function categoryPath(category: string): string {
  return `Learning Tracker/Categories/${toWikiTarget(category)}`;
}

function wiki(target: string, label?: string): string {
  return label && label !== target ? `[[${target}|${label}]]` : `[[${target}]]`;
}

function yamlList(values: string[]): string {
  return values.map((value) => `  - ${JSON.stringify(value)}`).join("\n");
}

function renderVideoNote(video: EnrichedVideo, related: EnrichedVideo[]): string {
  const concepts = video.generated.concepts;
  const questions = video.generated.discussionQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");
  const remember = video.generated.remember.map((t) => `- ${t}`).join("\n");
  const takeaways = video.generated.takeaways.map((t) => `- ${t}`).join("\n");
  const conceptLinks = concepts
    .map((concept) => `  - ${wiki(conceptPath(concept), concept)}`)
    .join("\n");
  const relatedLinks =
    related.length > 0
      ? related
          .map((item) => `- ${wiki(videoPath(item.slug), item.title)}`)
          .join("\n")
      : "- _No overlapping concept notes yet — add a link when you notice one._";
  const quantumCourse =
    concepts.includes("Quantum Computing")
      ? `\n  - Course notes: ${wiki("Understanding Quantum Information and Computation/Single Systems Lesson 01")}`
      : "";

  return `---
type: video
title: ${JSON.stringify(video.title)}
category: ${JSON.stringify(video.category)}
learned: ${video.isLearned}
source: ${JSON.stringify(video.url)}
concepts:
${yamlList(concepts)}
tags:
  - video
  - ${slugify(video.category)}
  - ${video.isLearned ? "learned" : "unwatched"}
---

# ${video.title}

## Summary

${video.generated.summary}

## What to remember

${remember || "- _Write one fact you would look up later._"}

## Discussion Questions

${questions}

## Knowledge Graph

- Hub: ${wiki("Learning Tracker")}
- Category: ${wiki(categoryPath(video.category), video.category)}
- Concepts:
${conceptLinks}${quantumCourse}

### Related videos

${relatedLinks}

## Key Takeaways

${takeaways}

**Source:** ${video.url}
`;
}

function renderConceptNote(concept: string, videos: EnrichedVideo[]): string {
  const learned = videos.filter((v) => v.isLearned).length;
  const links = videos
    .map((video) => `- ${wiki(videoPath(video.slug), video.title)}${video.isLearned ? " ✅" : ""}`)
    .join("\n");
  return `---
type: concept
concept: ${JSON.stringify(concept)}
video_count: ${videos.length}
learned_count: ${learned}
tags:
  - concept
---

# ${concept}

A shared node in the Learning Tracker graph. ${videos.length} video note${videos.length === 1 ? "" : "s"} point here (${learned} marked learned).

## Videos

${links}

## Hub

${wiki("Learning Tracker")}
`;
}

function renderCategoryNote(category: string, videos: EnrichedVideo[]): string {
  const learned = videos.filter((v) => v.isLearned).length;
  const links = videos
    .map((video) => `- ${wiki(videoPath(video.slug), video.title)}${video.isLearned ? " ✅" : ""}`)
    .join("\n");
  return `---
type: category
category: ${JSON.stringify(category)}
video_count: ${videos.length}
learned_count: ${learned}
tags:
  - category
---

# ${category}

${videos.length} videos in this category. ${learned} marked learned.

${links}

${wiki("Learning Tracker")}
`;
}

function renderHub(videos: EnrichedVideo[], concepts: Map<string, EnrichedVideo[]>): string {
  const learned = videos.filter((v) => v.isLearned).length;
  const categories = [...new Set(videos.map((v) => v.category))].sort();
  const topConcepts = [...concepts.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 18);

  const categoryMermaid = categories
    .map((category) => `  LT --> ${JSON.stringify(category)}`)
    .join("\n");
  const conceptMermaid = topConcepts
    .map(([concept], index) => `  LT --> C${index}[${JSON.stringify(concept)}]`)
    .join("\n");

  return `---
type: moc
video_count: ${videos.length}
learned_count: ${learned}
tags:
  - moc
  - learning-tracker
---

# Learning Tracker

Obsidian knowledge vault for What IV's Watching. ${videos.length} video notes, ${learned} marked learned, ${concepts.size} concept nodes.

Open **Graph view** and search \`path:Learning Tracker\` to see the web. Every video links here, to a category, and to shared concepts — that is the graph.

Vector neighbors (meaning, not wiki-links): ${wiki("Learning Tracker/Embedding Neighbors")}.

## Knowledge graph

\`\`\`mermaid
graph LR
  LT[Learning Tracker]
${categoryMermaid}
\`\`\`

### Highest-degree concepts

\`\`\`mermaid
graph LR
  LT[Learning Tracker]
${conceptMermaid}
\`\`\`

## Categories

${categories.map((category) => `- ${wiki(categoryPath(category), category)} (${videos.filter((v) => v.category === category).length})`).join("\n")}

## Concept index

${topConcepts.map(([concept, rows]) => `- ${wiki(conceptPath(concept), concept)} (${rows.length})`).join("\n")}

## All videos

${videos.map((video) => `- ${wiki(videoPath(video.slug), video.title)}${video.isLearned ? " ✅" : ""}`).join("\n")}
`;
}

async function writeNote(vaultDir: string, relPath: string, contents: string) {
  const abs = path.join(vaultDir, `${relPath}.md`);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, contents, "utf8");
}

async function main() {
  const { fromJson, vaultDir, limit, concurrency, useLlm } = parseArgs(
    process.argv.slice(2),
  );
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const raw = JSON.parse(await readFile(fromJson, "utf8")) as VideoRow[];
  const videos = uniqueSlugs(limit ? raw.slice(0, limit) : raw);

  if (videos.length === 0) {
    console.log("No videos to export.");
    return;
  }

  if (useLlm && anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const batches = chunk(videos, 6);
    console.log(`Generating LLM notes for ${videos.length} videos in ${batches.length} batches...`);
    await mapPool(batches, concurrency, async (batch, index) => {
      try {
        await generateBatch(client, batch);
        console.log(`batch ${index + 1}/${batches.length} ok`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`batch ${index + 1} failed; keeping local enrichment (${message.slice(0, 140)})`);
      }
    });
  } else {
    console.log(`Writing local concept-graph notes for ${videos.length} videos.`);
  }

  const byConcept = new Map<string, EnrichedVideo[]>();
  const byCategory = new Map<string, EnrichedVideo[]>();
  for (const video of videos) {
    const categoryRows = byCategory.get(video.category) ?? [];
    categoryRows.push(video);
    byCategory.set(video.category, categoryRows);
    for (const concept of video.generated.concepts) {
      const rows = byConcept.get(concept) ?? [];
      rows.push(video);
      byConcept.set(concept, rows);
    }
  }

  for (const video of videos) {
    const related = video.generated.concepts
      .flatMap((concept) => byConcept.get(concept) ?? [])
      .filter((item) => item.url !== video.url);
    const unique = [...new Map(related.map((item) => [item.url, item])).values()]
      .sort((a, b) => Number(b.isLearned) - Number(a.isLearned))
      .slice(0, 6);
    await writeNote(vaultDir, videoPath(video.slug), renderVideoNote(video, unique));
  }

  for (const [concept, rows] of byConcept) {
    await writeNote(vaultDir, conceptPath(concept), renderConceptNote(concept, rows));
  }
  for (const [category, rows] of byCategory) {
    await writeNote(vaultDir, categoryPath(category), renderCategoryNote(category, rows));
  }
  await writeNote(vaultDir, "Learning Tracker", renderHub(videos, byConcept));

  const neighborCache = await loadNeighborCache(
    path.join(process.cwd(), "data", "vault-neighbors.json"),
  );
  if (neighborCache) {
    const patched = await applyNeighborCache(vaultDir, neighborCache);
    console.log(`Re-applied embedding neighbor sections to ${patched} notes.`);
  }

  await applyGraphColorGroups(path.join(vaultDir, ".obsidian"));
  await applyGraphColorGroups(path.join(vaultDir, "Learning Tracker", ".obsidian"));
  console.log("Re-applied Obsidian graph color groups.");

  console.log(
    JSON.stringify(
      {
        vaultDir,
        videos: videos.length,
        learned: videos.filter((v) => v.isLearned).length,
        concepts: byConcept.size,
        categories: byCategory.size,
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
