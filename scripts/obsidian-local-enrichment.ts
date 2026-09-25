import { buildVideoReference } from "../src/lib/video-reference";
import type { GeneratedNote, VideoRow } from "./obsidian-vault-types";

export function enrichFromTitle(video: VideoRow): GeneratedNote {
  const reference = buildVideoReference(video);
  return {
    url: video.url,
    summary: reference.summary,
    remember: reference.remember,
    discussionQuestions: reference.questions,
    concepts: reference.concepts,
    takeaways: reference.takeaways,
  };
}
