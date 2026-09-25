import { prisma } from "@/lib/prisma";
import { generateStudyNote, writeObsidianNote } from "@/lib/obsidian";
import { buildVideoReference } from "@/lib/video-reference";
import {
  draftsFromStudy,
  dueAfter,
  interleaveByConcept,
  nextIntervalDays,
  sessionLimit,
  type RecallRating,
  type StudyMaterial,
} from "@/lib/recall-schedule";

export type RecallQueueCard = {
  id: string;
  videoId: string;
  videoTitle: string;
  kind: string;
  prompt: string;
  concept: string;
};

export type RecallQueue = {
  source: "due" | "neglected" | "empty";
  cards: RecallQueueCard[];
};

async function studyMaterialFor(video: {
  title: string;
  url: string;
  category: string;
}): Promise<{ material: StudyMaterial; generated: Awaited<ReturnType<typeof generateStudyNote>> }> {
  const generated = await generateStudyNote(video);
  if (generated) {
    return {
      generated,
      material: {
        summary: generated.summary,
        takeaways: generated.takeaways,
        concepts: generated.tags,
      },
    };
  }

  const local = buildVideoReference({
    title: video.title,
    url: video.url,
    category: video.category,
    isLearned: true,
  });
  return {
    generated: null,
    material: {
      summary: local.summary,
      takeaways: local.takeaways,
      concepts: local.concepts,
    },
  };
}

export async function persistLearnedRecall(video: {
  id: string;
  title: string;
  url: string;
  category: string;
}): Promise<void> {
  const { material, generated } = await studyMaterialFor(video);

  await prisma.videoNote.upsert({
    where: { videoId: video.id },
    create: {
      videoId: video.id,
      summary: material.summary,
      takeaways: material.takeaways,
      concepts: material.concepts,
    },
    update: {
      summary: material.summary,
      takeaways: material.takeaways,
      concepts: material.concepts,
    },
  });

  const existing = await prisma.recallCard.count({ where: { videoId: video.id } });
  if (existing === 0) {
    const now = new Date();
    await prisma.recallCard.createMany({
      data: draftsFromStudy(video.title, material).map((draft) => ({
        videoId: video.id,
        kind: draft.kind,
        prompt: draft.prompt,
        answer: draft.answer,
        concept: draft.concept,
        intervalDays: 0,
        dueAt: now,
      })),
    });
  }

  if (generated) {
    try {
      await writeObsidianNote(video, generated);
    } catch (err) {
      console.warn("[persistLearnedRecall] Obsidian note creation failed:", err);
    }
  }
}

function toQueueCard(card: {
  id: string;
  videoId: string;
  kind: string;
  prompt: string;
  answer: string;
  concept: string;
  video: { title: string };
}): RecallQueueCard {
  return {
    id: card.id,
    videoId: card.videoId,
    videoTitle: card.video.title,
    kind: card.kind,
    prompt: card.prompt,
    concept: card.concept,
  };
}

export async function backfillMissingRecall(now = new Date()): Promise<number> {
  const missing = await prisma.video.findMany({
    where: { isLearned: true, recallCards: { none: {} } },
    select: { id: true, title: true, url: true, category: true },
  });
  if (missing.length === 0) return 0;

  const notes = missing.map((video) => {
    const local = buildVideoReference({
      title: video.title,
      url: video.url,
      category: video.category,
      isLearned: true,
    });
    return {
      videoId: video.id,
      summary: local.summary,
      takeaways: local.takeaways,
      concepts: local.concepts,
    };
  });

  const cards = missing.flatMap((video) => {
    const note = notes.find((item) => item.videoId === video.id);
    if (!note) return [];
    return draftsFromStudy(video.title, {
      summary: note.summary,
      takeaways: note.takeaways,
      concepts: note.concepts,
    }).map((draft) => ({
      videoId: video.id,
      kind: draft.kind,
      prompt: draft.prompt,
      answer: draft.answer,
      concept: draft.concept,
      intervalDays: 0,
      dueAt: now,
    }));
  });

  await prisma.$transaction([
    prisma.videoNote.createMany({ data: notes }),
    prisma.recallCard.createMany({ data: cards }),
  ]);

  return missing.length;
}

export async function getRecallQueue(now = new Date()): Promise<RecallQueue> {
  await backfillMissingRecall(now);
  const due = await prisma.recallCard.findMany({
    where: { dueAt: { lte: now }, video: { isLearned: true } },
    include: { video: { select: { title: true } } },
    orderBy: { dueAt: "asc" },
  });

  if (due.length > 0) {
    const mixed = interleaveByConcept(due, sessionLimit());
    return { source: "due", cards: mixed.map(toQueueCard) };
  }

  const neglected = await prisma.recallCard.findFirst({
    where: { video: { isLearned: true } },
    include: { video: { select: { title: true } } },
    orderBy: [{ lastReviewedAt: { sort: "asc", nulls: "first" } }, { dueAt: "asc" }],
  });

  if (!neglected) return { source: "empty", cards: [] };
  return { source: "neglected", cards: [toQueueCard(neglected)] };
}

export async function rateRecallCard(input: {
  cardId: string;
  rating: RecallRating;
  response: string | null;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const card = await prisma.recallCard.findUnique({ where: { id: input.cardId } });
  if (!card) return { ok: false, error: "Card not found." };

  const now = input.now ?? new Date();
  const intervalDays = nextIntervalDays(card.intervalDays, input.rating);
  const response = input.response?.trim() ? input.response.trim() : null;

  await prisma.$transaction([
    prisma.recallAttempt.create({
      data: {
        cardId: card.id,
        rating: input.rating,
        response,
        reviewedAt: now,
      },
    }),
    prisma.recallCard.update({
      where: { id: card.id },
      data: {
        intervalDays,
        dueAt: dueAfter(now, intervalDays),
        lastRating: input.rating,
        lastReviewedAt: now,
      },
    }),
  ]);

  return { ok: true };
}
