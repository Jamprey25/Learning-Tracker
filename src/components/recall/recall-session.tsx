"use client";

import { useState } from "react";
import Link from "next/link";

import { completeRecallSession, submitRecallRating, revealRecallAnswer } from "@/app/actions/recall";
import { Button } from "@/components/ui/button";
import type { RecallQueueCard } from "@/lib/recall";

const RATINGS = [
  { id: "again", label: "Again" },
  { id: "hard", label: "Hard" },
  { id: "good", label: "Good" },
  { id: "easy", label: "Easy" },
] as const;

export function RecallSession({
  initialCards,
  source,
}: {
  initialCards: RecallQueueCard[];
  source: "due" | "neglected" | "empty";
}) {
  const [cards] = useState(initialCards);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const card = cards[index];

  async function finish(count: number) {
    const result = await completeRecallSession(count);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFinished(true);
  }

  async function reveal() {
    if (!card || pending || answer !== null) return;
    setPending(true);
    setError(null);
    const result = await revealRecallAnswer(card.id);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAnswer(result.answer);
  }

  async function rate(rating: (typeof RATINGS)[number]["id"]) {
    if (!card || pending) return;
    setPending(true);
    setError(null);
    const result = await submitRecallRating({
      cardId: card.id,
      rating,
      response,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const nextReviewed = reviewed + 1;
    setReviewed(nextReviewed);
    setResponse("");
    setAnswer(null);

    if (index + 1 >= cards.length) {
      await finish(nextReviewed);
      return;
    }
    setIndex(index + 1);
  }

  if (cards.length === 0 || !card) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-zinc-300">
        <p>No learned videos have recall cards yet.</p>
        <Link href="/videos" className="mt-3 inline-block text-cyan-300 underline-offset-4 hover:underline">
          Mark a video learned
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-lg font-semibold text-zinc-50">Session done</h2>
        <p className="mt-2 text-sm text-zinc-300">
          {`You recalled ${reviewed} ${reviewed === 1 ? "card" : "cards"}. Each rating sets when that idea comes back.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        {source === "neglected"
          ? "Nothing is due. One neglected idea, so the library does not go cold."
          : `Card ${index + 1} of ${cards.length}`}
        <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-300">
          {card.concept}
        </span>
      </p>
      <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{card.videoTitle}</p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-50">{card.prompt}</h2>
        <label className="mt-4 block text-sm text-zinc-400" htmlFor="recall-response">
          Answer in a sentence, or skip if you do not remember.
        </label>
        <textarea
          id="recall-response"
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          rows={4}
          disabled={answer !== null || pending}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        />
        {answer !== null ? (
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-zinc-200">
            <p className="text-xs uppercase tracking-wide text-emerald-200/80">From the note</p>
            <p className="mt-2 whitespace-pre-wrap">{answer}</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void reveal()} disabled={pending}>
              Show the takeaway
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setResponse("");
                void reveal();
              }}
              disabled={pending}
            >
              I don&apos;t remember
            </Button>
          </div>
        )}
        {answer !== null ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {RATINGS.map((rating) => (
              <Button
                key={rating.id}
                type="button"
                variant={rating.id === "again" ? "secondary" : "default"}
                disabled={pending}
                onClick={() => rate(rating.id)}
              >
                {rating.label}
              </Button>
            ))}
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </article>
    </div>
  );
}
