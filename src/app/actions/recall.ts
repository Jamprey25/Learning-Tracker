"use server";

import { prisma } from "@/lib/prisma";
import { recordProgressEvent } from "@/lib/progress";
import { getRecallQueue, rateRecallCard, type RecallQueue } from "@/lib/recall";
import { isRecallRating } from "@/lib/recall-schedule";

export async function loadRecallQueue(): Promise<RecallQueue> {
  return getRecallQueue();
}

export async function revealRecallAnswer(
  cardId: string,
): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  const card = await prisma.recallCard.findUnique({
    where: { id: cardId },
    select: { answer: true },
  });
  if (!card) return { ok: false, error: "Card not found." };
  return { ok: true, answer: card.answer };
}

export async function submitRecallRating(input: {
  cardId: string;
  rating: string;
  response: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isRecallRating(input.rating)) {
    return { ok: false, error: "Unknown rating." };
  }
  return rateRecallCard({
    cardId: input.cardId,
    rating: input.rating,
    response: input.response,
  });
}

export async function completeRecallSession(
  reviewedCount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const count = Math.floor(reviewedCount);
  if (!Number.isFinite(count) || count < 1) {
    return { ok: false, error: "Nothing was reviewed." };
  }

  await recordProgressEvent({
    entityType: "recall",
    entityId: crypto.randomUUID(),
    eventType: "reviewed",
    xp: count,
    note: `Reviewed ${count} card${count === 1 ? "" : "s"}`,
  });

  return { ok: true };
}
