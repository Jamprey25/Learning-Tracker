import { TOPIC_RULES, type TopicRule } from "@/lib/video-reference-rules";

export type VideoReferenceInput = {
  title: string;
  url?: string;
  category?: string;
  isLearned?: boolean;
};

export type VideoReference = {
  summary: string;
  remember: string[];
  questions: string[];
  takeaways: string[];
  concepts: string[];
};

const FALLBACK: TopicRule = {
  test: /.*/,
  concepts: ["Learning Systems"],
  claim:
    "Treat the title as a hypothesis, not a topic label. Extract the mechanism, the incentive, and one constraint.",
  mechanism:
    "A future-you note needs three things: what is being claimed, what would falsify it, and one flashcard you could fail next week without rewatching.",
  remember: [
    "Rewrite the title as a one-sentence claim you could disagree with.",
    "Name who pays if the claim is wrong.",
    "Link this to a project or concept instead of leaving an orphan.",
  ],
  caveats: [
    "Collecting another watch instead of writing a retrieval question.",
  ],
  useWhen: "you would otherwise rewatch from minute zero to remember the point.",
  questions: [
    "What is the core claim, and what evidence would falsify it?",
    "How does this connect to another note or project you already have?",
    "What belongs on a flashcard?",
  ],
  takeaways: [
    "Write one retrieval question before closing the note.",
    "Prefer a short linked note over a second watch.",
  ],
};

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function statusLine(isLearned: boolean): string {
  return isLearned
    ? "You already marked this learned — use the bullets below as a retrieval check instead of a second watch."
    : "Before playing, pick one question below so the watch has a job.";
}

export function composeReferenceSummary(
  title: string,
  rule: TopicRule,
  isLearned: boolean,
): string {
  const remember = rule.remember[0] ?? FALLBACK.remember[0];
  const caveat = rule.caveats[0] ?? FALLBACK.caveats[0];
  return [
    `${rule.claim} The working title is "${title}".`,
    rule.mechanism,
    `The reusable piece: ${remember}`,
    `The usual trap: ${caveat}`,
    `Come back to this when ${rule.useWhen} ${statusLine(isLearned)}`,
  ].join(" ");
}

export function buildVideoReference(input: VideoReferenceInput): VideoReference {
  const title = input.title.trim() || "Untitled video";
  const matched = TOPIC_RULES.filter((rule) => rule.test.test(title));
  const primary = matched[0] ?? FALLBACK;
  const category =
    input.category && input.category !== "General" ? input.category : "";

  const concepts = unique([
    ...matched.flatMap((rule) => rule.concepts),
    ...primary.concepts,
    category,
  ]).slice(0, 4);

  const remember = unique([
    ...primary.remember,
    ...matched.flatMap((rule) => rule.remember),
    ...primary.caveats.map((caveat) => `Watch for: ${caveat}`),
  ]).slice(0, 7);

  const questions = unique([
    ...primary.questions,
    ...matched.flatMap((rule) => rule.questions),
    `What is the core claim of "${title}", and what evidence would falsify it?`,
    "How does this connect to another note already in this vault?",
  ]).slice(0, 6);

  const takeaways = unique([
    ...primary.takeaways,
    ...matched.flatMap((rule) => rule.takeaways),
    "Link this video to at least one concept node before closing the note.",
  ]).slice(0, 6);

  return {
    summary: composeReferenceSummary(title, primary, Boolean(input.isLearned)),
    remember,
    questions,
    takeaways,
    concepts: concepts.length > 0 ? concepts : FALLBACK.concepts,
  };
}
