import Anthropic from "@anthropic-ai/sdk";

interface VideoInput {
  title: string;
  url: string;
  category: string;
}

interface GeneratedContent {
  summary: string;
  takeaways: string[];
  tags: string[];
  noteMarkdown: string;
}

function readTrimmedEnv(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeMarkdown(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseGeneratedContent(rawText: string): GeneratedContent | null {
  const trimmed = rawText.trim();
  const fencedMatches = Array.from(
    trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi),
  ).map((match) => match[1]?.trim());
  const fenced = fencedMatches[0];
  const balanced = extractBalancedJsonObject(trimmed);
  const candidates = [trimmed, ...fencedMatches, fenced, balanced].filter(
    (v): v is string => Boolean(v && v.trim()),
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<GeneratedContent>;
      const summary =
        typeof parsed.summary === "string" ? parsed.summary.trim() : "";
      const takeaways = normalizeStringArray(parsed.takeaways).slice(0, 8);
      const tags = normalizeStringArray(parsed.tags)
        .slice(0, 8)
        .map((tag) => tag.toLowerCase().replace(/\s+/g, "-"));
      const noteMarkdown = normalizeMarkdown(
        (parsed as { note_markdown?: unknown; noteMarkdown?: unknown })
          .note_markdown ??
          (parsed as { note_markdown?: unknown; noteMarkdown?: unknown })
            .noteMarkdown,
      );

      if (!summary || takeaways.length === 0 || tags.length === 0) {
        continue;
      }

      return { summary, takeaways, tags, noteMarkdown };
    } catch {
      continue;
    }
  }

  return null;
}

async function coerceToStrictJson(
  client: Anthropic,
  rawText: string,
): Promise<GeneratedContent | null> {
  const repair = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Convert the content below into valid strict JSON.

Output ONLY valid JSON. No markdown. No code fences.

Required keys:
- "summary" (string)
- "takeaways" (array of strings)
- "tags" (array of strings)
- "note_markdown" (string)

Content:
${rawText}`,
      },
    ],
  });

  const repairedText =
    repair.content[0].type === "text" ? repair.content[0].text : "";
  return parseGeneratedContent(repairedText);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatFrontmatter(
  date: string,
  category: string,
  tags: string[]
): string {
  const tagLines = tags.map((t) => `  - ${t}`).join("\n");
  return `---\ndate_learned: ${date}\ncategory: ${category}\ntags:\n${tagLines}\n---`;
}

function toWikiTarget(value: string): string {
  return value.replace(/[\[\]#|]/g, "").trim();
}

export async function createObsidianNote(video: VideoInput): Promise<boolean> {
  const anthropicKey = readTrimmedEnv("ANTHROPIC_API_KEY");
  const obsidianKey = readTrimmedEnv("OBSIDIAN_API_KEY");
  const obsidianBase = (
    readTrimmedEnv("OBSIDIAN_BASE_URL") ?? "http://localhost:27123"
  ).replace(/\/+$/, "");
  const obsidianFolder = (
    readTrimmedEnv("OBSIDIAN_NOTES_FOLDER") ?? "Notes"
  ).replace(/^\/+|\/+$/g, "");

  if (!anthropicKey) {
    console.warn("[obsidian] ANTHROPIC_API_KEY is not set — skipping note creation");
    return false;
  }
  if (!obsidianKey) {
    console.warn("[obsidian] OBSIDIAN_API_KEY is not set — skipping note creation");
    return false;
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a senior engineer who takes obsessive, opinionated study notes. You write like you're explaining to your past self — sharp, specific, zero fluff. No "In this video..." intros. No generic advice. Real tool names, real scenarios, real consequences.

Video title: "${video.title}"
Category: "${video.category}"

Return ONLY valid JSON with these keys:
- "summary": 2-3 punchy sentences. Lead with the core insight. What does understanding this actually unlock?
- "takeaways": 5-7 strings, each starting with an action verb. Specific and opinionated — "Prefer X over Y because...", "Never do Z when..."
- "tags": 3-5 lowercase hyphenated tags
- "note_markdown": Full Obsidian markdown using these conventions:
  - Use Obsidian callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!EXAMPLE], > [!QUESTION]
  - Include ONE mermaid diagram showing concept relationships or a decision flow (wrapped in \`\`\`mermaid ... \`\`\`)
  - Write in first-person opinionated voice: "The trap here is...", "Most tutorials skip...", "The reason this matters..."
  - Name real tools, libraries, or systems where relevant
  - Sections (in this order):
    1. ## The Core Idea — one clear mental model, not a definition list
    2. ## How It Actually Works — mechanism with a mermaid diagram
    3. ## The Part Everyone Gets Wrong — the non-obvious gotcha
    4. ## Real-World Example — concrete named scenario with actual code snippet or command if relevant
    5. ## Quick-Fire Q&A — 4-5 callout blocks using > [!QUESTION]\\n> answer format
    6. ## What To Study Next — 3 specific follow-up topics with a one-line reason each

Example format:
{"summary":"...","takeaways":["Prefer X over Y because..."],"tags":["..."],"note_markdown":"## The Core Idea\\n..."}`,
      },
    ],
  });

  const rawText =
    message.content[0].type === "text" ? message.content[0].text : "";

  const generated =
    parseGeneratedContent(rawText) ?? (await coerceToStrictJson(client, rawText));
  if (!generated) {
    const preview = rawText.replace(/\s+/g, " ").trim().slice(0, 200);
    console.warn(
      `[obsidian] Failed to parse AI response as JSON — skipping note creation. Preview: ${preview || "<empty>"}`,
    );
    return false;
  }

  const today = new Date().toISOString().split("T")[0];
  const slug = slugify(video.title);
  const filename = `${slug}-${today}`;

  const frontmatter = formatFrontmatter(today, video.category, generated.tags);
  const takeawayLines = generated.takeaways.map((t) => `- ${t}`).join("\n");
  const deepDiveMarkdown =
    generated.noteMarkdown ||
    [
      "## How It Works",
      generated.summary,
      "",
      "## Core Concepts",
      generated.takeaways.map((t) => `- ${t}`).join("\n"),
      "",
      "## Practice Questions",
      "- What are the key moving parts in this topic?",
      "- Which assumptions or constraints matter most?",
      "- How would this break in an edge case?",
      "- How would you explain this to a beginner?",
    ].join("\n");
  const categoryLink = `[[Categories/${toWikiTarget(video.category)}]]`;
  const tagLinks = generated.tags
    .map((tag) => `[[Tags/${toWikiTarget(tag)}]]`)
    .join(" ");
  const noteContent = `${frontmatter}

# ${video.title}

## Summary

${generated.summary}

## Key Takeaways

${takeawayLines}

## Deep Dive Notes

${deepDiveMarkdown}

## Vault Links

- Category: ${categoryLink}
- Tags: ${tagLinks}

**Source:** ${video.url}
`;

  const path = [obsidianFolder, `${filename}.md`]
    .filter((part) => part.length > 0)
    .join("/");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const vaultBase = obsidianBase.endsWith("/vault")
    ? obsidianBase
    : `${obsidianBase}/vault`;
  const endpoint = `${vaultBase}/${encodedPath}`;

  const isHttps = obsidianBase.startsWith("https");

  try {
    const requestInit: RequestInit = {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${obsidianKey}`,
        "Content-Type": "text/markdown",
      },
      body: noteContent,
    };

    const response = isHttps
      ? await (async () => {
          const { Agent, fetch: undiciFetch } = await import("undici");
          const dispatcher = new Agent({
            connect: { rejectUnauthorized: false },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return undiciFetch(endpoint, { ...requestInit, dispatcher } as any);
        })()
      : await fetch(endpoint, requestInit);

    if (!response.ok) {
      console.warn(
        `[obsidian] PUT failed: ${response.status} ${response.statusText}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[obsidian] Failed to reach Obsidian REST API:", err);
    return false;
  }
}
