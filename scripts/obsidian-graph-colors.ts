import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type GraphColor = { a: number; rgb: number };
type ColorGroup = { query: string; color: GraphColor };

function rgb(r: number, g: number, b: number): number {
  return (r << 16) + (g << 8) + b;
}

/** Same palette as `src/lib/categories.ts` / the /videos groups. */
const VIDEO_CATEGORY_COLORS: Array<{ tag: string; rgb: number }> = [
  { tag: "programming", rgb: rgb(96, 165, 250) },
  { tag: "science", rgb: rgb(52, 211, 153) },
  { tag: "mathematics", rgb: rgb(167, 139, 250) },
  { tag: "history", rgb: rgb(251, 146, 60) },
  { tag: "business", rgb: rgb(34, 211, 238) },
  { tag: "design", rgb: rgb(244, 114, 182) },
  { tag: "language", rgb: rgb(251, 191, 36) },
  { tag: "general", rgb: rgb(125, 211, 252) },
  { tag: "other", rgb: rgb(129, 140, 248) },
];

export function learningTrackerColorGroups(videosPath: string): ColorGroup[] {
  const quoted = videosPath.includes(" ") ? `"${videosPath}"` : videosPath;
  const conceptsPath = videosPath.replace(/Videos$/, "Concepts");
  const categoriesPath = videosPath.replace(/Videos$/, "Categories");
  const quotedConcepts = conceptsPath.includes(" ") ? `"${conceptsPath}"` : conceptsPath;
  const quotedCategories = categoriesPath.includes(" ")
    ? `"${categoriesPath}"`
    : categoriesPath;

  return [
    ...VIDEO_CATEGORY_COLORS.map((row) => ({
      query: `path:${quoted} tag:#${row.tag}`,
      color: { a: 1, rgb: row.rgb },
    })),
    {
      query: `path:${quotedConcepts}`,
      color: { a: 1, rgb: rgb(192, 132, 252) },
    },
    {
      query: `path:${quotedCategories}`,
      color: { a: 1, rgb: rgb(245, 158, 11) },
    },
    {
      query: 'file:"Learning Tracker"',
      color: { a: 1, rgb: rgb(255, 255, 255) },
    },
    {
      query: `path:${quoted}`,
      color: { a: 1, rgb: rgb(56, 189, 248) },
    },
  ];
}

const FALLBACK: ColorGroup[] = [
  {
    query: 'path:"Learning Tracker"',
    color: { a: 1, rgb: rgb(56, 189, 248) },
  },
  {
    query: "tag:#video",
    color: { a: 1, rgb: rgb(56, 189, 248) },
  },
  {
    query: "tag:#learned",
    color: { a: 1, rgb: rgb(52, 211, 153) },
  },
  {
    query: "tag:#unwatched",
    color: { a: 1, rgb: rgb(251, 191, 36) },
  },
  {
    query: "tag:",
    color: { a: 1, rgb: rgb(192, 132, 252) },
  },
  {
    query: "file:",
    color: { a: 1, rgb: rgb(56, 189, 248) },
  },
  {
    query: "",
    color: { a: 1, rgb: rgb(56, 189, 248) },
  },
];

export function colorGroupsForVaultRoot(): ColorGroup[] {
  return [
    ...learningTrackerColorGroups("Learning Tracker/Videos"),
    ...learningTrackerColorGroups("Videos"),
    ...FALLBACK,
  ];
}

export async function applyGraphColorGroups(obsidianDir: string): Promise<void> {
  const graphPath = path.join(obsidianDir, "graph.json");
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await readFile(graphPath, "utf8")) as Record<string, unknown>;
  } catch {
    existing = {};
  }

  const next = {
    ...existing,
    showTags: false,
    showAttachments: false,
    hideUnresolved: true,
    "collapse-color-groups": false,
    colorGroups: colorGroupsForVaultRoot(),
  };

  await mkdir(obsidianDir, { recursive: true });
  await writeFile(graphPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}
