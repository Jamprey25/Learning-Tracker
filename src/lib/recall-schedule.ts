export const RECALL_RATINGS = ["again", "hard", "good", "easy"] as const;

export type RecallRating = (typeof RECALL_RATINGS)[number];

export type RecallCardKind = "mechanism" | "failure" | "connection";

const SESSION_LIMIT = 5;

export function isRecallRating(value: string): value is RecallRating {
  return (RECALL_RATINGS as readonly string[]).includes(value);
}

/**
 * Again resets to tomorrow. Hard is a miss and shrinks the gap.
 * Good doubles it. Easy stretches further. A brand-new card (0 days)
 * treats 1 day as the base so the first Good is 2 days, not 0.
 */
export function nextIntervalDays(currentDays: number, rating: RecallRating): number {
  const base = Math.max(1, Math.floor(currentDays));
  switch (rating) {
    case "again":
      return 1;
    case "hard":
      return Math.max(1, Math.round(base * 0.6));
    case "good":
      return Math.max(1, Math.round(base * 2));
    case "easy":
      return Math.max(1, Math.round(base * 3.5));
  }
}

export function dueAfter(from: Date, intervalDays: number): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + intervalDays);
  return next;
}

export type Interleavable = {
  concept: string;
  dueAt: Date;
};

/** Round-robin across concepts so two cards from the same topic are not adjacent when another topic is waiting. */
export function interleaveByConcept<T extends Interleavable>(cards: T[], limit = SESSION_LIMIT): T[] {
  const groups = new Map<string, T[]>();
  const ordered = [...cards].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  for (const card of ordered) {
    const bucket = groups.get(card.concept) ?? [];
    bucket.push(card);
    groups.set(card.concept, bucket);
  }

  const queues = [...groups.values()];
  const mixed: T[] = [];
  while (mixed.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (mixed.length >= limit) break;
      const next = queue.shift();
      if (next) mixed.push(next);
    }
  }
  return mixed;
}

export function sessionLimit(): number {
  return SESSION_LIMIT;
}

export type StudyMaterial = {
  summary: string;
  takeaways: string[];
  concepts: string[];
};

export type RecallDraft = {
  kind: RecallCardKind;
  prompt: string;
  answer: string;
  concept: string;
};

export function draftsFromStudy(title: string, material: StudyMaterial): RecallDraft[] {
  const concepts = material.concepts.map((item) => item.trim()).filter(Boolean);
  const topic = concepts.length > 0 ? concepts : ["General"];
  const takeaways = material.takeaways.map((item) => item.trim()).filter(Boolean);
  const claims = takeaways.length > 0 ? takeaways : [material.summary.trim()];
  const conceptAt = (index: number) => topic[index % topic.length] ?? "General";
  const related = topic.join(", ");

  return [
    {
      kind: "mechanism",
      concept: conceptAt(0),
      prompt: `How does "${title}" actually work?`,
      answer: material.summary.trim(),
    },
    {
      kind: "failure",
      concept: conceptAt(1),
      prompt: `What breaks, or what do people get wrong, in "${title}"?`,
      answer: claims[0] ?? material.summary.trim(),
    },
    {
      kind: "connection",
      concept: conceptAt(Math.min(2, topic.length - 1)),
      prompt: `What other idea does "${title}" sit next to?`,
      answer:
        claims.length > 1
          ? `${claims[claims.length - 1]} Related concepts: ${related}.`
          : `Related concepts: ${related}.`,
    },
  ];
}
