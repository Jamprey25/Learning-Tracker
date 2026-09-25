import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type VaultVideoNote = {
  absPath: string;
  relWiki: string;
  slug: string;
  title: string;
  category: string;
  learned: boolean;
  source: string;
  concepts: string[];
  summary: string;
  relatedTitles: string[];
  body: string;
};

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;

function parseFrontmatter(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = raw.split("\n");
  let listKey: string | null = null;
  const lists = new Map<string, string[]>();

  for (const line of lines) {
    const listItem = line.match(/^(\s+)-\s+(.*)$/);
    if (listItem && listKey) {
      const value = listItem[2].replace(/^["']|["']$/g, "").trim();
      const bucket = lists.get(listKey) ?? [];
      bucket.push(value);
      lists.set(listKey, bucket);
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    listKey = null;
    const key = kv[1];
    const value = kv[2].trim();
    if (value === "") {
      listKey = key;
      lists.set(key, []);
      continue;
    }
    if (value === "true" || value === "false") {
      out[key] = value === "true";
      continue;
    }
    out[key] = value
      .replace(/^["']|["']$/g, "")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }

  for (const [key, values] of lists) out[key] = values;
  return out;
}

function section(body: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(
    new RegExp(`^#{2,3} ${escaped}\\s*\\n([\\s\\S]*?)(?=^#{2,3} |$)`, "m"),
  );
  return match?.[1]?.trim() ?? "";
}

function wikiLabels(markdown: string): string[] {
  return [...markdown.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].map(
    (match) => (match[2] ?? match[1].split("/").pop() ?? match[1]).trim(),
  );
}

export function noteToEmbedText(note: VaultVideoNote): string {
  return [
    note.title,
    `category: ${note.category}`,
    `concepts: ${note.concepts.join(", ")}`,
    note.summary,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseVaultVideoNote(
  absPath: string,
  vaultDir: string,
  markdown: string,
): VaultVideoNote | null {
  const fmMatch = markdown.match(FRONTMATTER);
  const fm = fmMatch ? parseFrontmatter(fmMatch[1]) : {};
  const body = fmMatch ? markdown.slice(fmMatch[0].length) : markdown;
  const title =
    (typeof fm.title === "string" && fm.title) ||
    body.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
    "";
  if (!title) return null;

  const rel = path.relative(vaultDir, absPath).split(path.sep).join("/");
  const slug = path.basename(absPath, ".md");
  const concepts = Array.isArray(fm.concepts)
    ? fm.concepts.filter((item): item is string => typeof item === "string")
    : [];
  const related = section(body, "Related videos");

  return {
    absPath,
    relWiki: rel.replace(/\.md$/, ""),
    slug,
    title,
    category: typeof fm.category === "string" ? fm.category : "General",
    learned: fm.learned === true,
    source: typeof fm.source === "string" ? fm.source : "",
    concepts,
    summary: section(body, "Summary"),
    relatedTitles: wikiLabels(related),
    body: markdown,
  };
}

export async function loadVaultVideoNotes(
  vaultDir: string,
): Promise<VaultVideoNote[]> {
  const videosDir = path.join(vaultDir, "Learning Tracker", "Videos");
  const names = await readdir(videosDir);
  const notes: VaultVideoNote[] = [];
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const absPath = path.join(videosDir, name);
    const markdown = await readFile(absPath, "utf8");
    const note = parseVaultVideoNote(absPath, vaultDir, markdown);
    if (note) notes.push(note);
  }
  return notes.sort((a, b) => a.title.localeCompare(b.title));
}
