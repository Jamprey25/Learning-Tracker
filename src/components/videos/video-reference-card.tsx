"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { BookOpen, CheckCircle2, X } from "lucide-react";

import type { DashboardVideo } from "@/app/actions/video";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import { categoryBar, categoryColor, categoryGlow, categoryTint } from "@/lib/categories";
import type { VideoReference } from "@/lib/video-reference";

type Props = {
  video: DashboardVideo;
  study: VideoReference;
  priority?: boolean;
  isPending: boolean;
  onLearnedChange: (id: string, checked: boolean) => void;
};

export function VideoReferenceCard({
  video,
  study,
  priority,
  isPending,
  onLearnedChange,
}: Props) {
  const glow = categoryGlow(video.category);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-l-4 text-zinc-50 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 backdrop-blur-xl",
        categoryTint(video.category),
        categoryBar(video.category),
        video.isLearned && "ring-emerald-500/30",
      )}
    >
      <GlowingEffect color={glow} spread={24} proximity={90} borderWidth={1} />

      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video w-full overflow-hidden bg-zinc-900/80"
      >
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          priority={priority}
          className={cn(
            "object-cover transition-all duration-500",
            video.isLearned ? "brightness-[0.45]" : "group-hover:scale-[1.03]",
          )}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {video.isLearned ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/20">
            <CheckCircle2 className="size-6 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
              Learned
            </span>
          </div>
        ) : null}
      </a>

      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-medium leading-snug">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-100 underline-offset-4 hover:underline"
          >
            {video.title}
          </a>
        </h3>

        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
              categoryColor(video.category),
            )}
          >
            {video.category}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              aria-label={`Study notes for ${video.title}`}
              title="Study notes"
              className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
            >
              <BookOpen className="size-3.5" aria-hidden />
            </button>
            <Switch
              id={`learned-${video.id}`}
              aria-label="Mark as learned"
              checked={video.isLearned}
              onCheckedChange={(checked) => onLearnedChange(video.id, checked)}
              disabled={isPending}
              className="shrink-0"
            />
          </div>
        </div>
      </div>

      {notesOpen && (
        <StudyNotesModal
          video={video}
          study={study}
          isPending={isPending}
          onLearnedChange={onLearnedChange}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </article>
  );
}

type ModalProps = {
  video: DashboardVideo;
  study: VideoReference;
  isPending: boolean;
  onLearnedChange: (id: string, checked: boolean) => void;
  onClose: () => void;
};

function StudyNotesModal({
  video,
  study,
  isPending,
  onLearnedChange,
  onClose,
}: ModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Study notes for ${video.title}`}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-l-4 border-white/10 bg-zinc-900 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.6)]",
          categoryBar(video.category),
        )}
      >
        <header className="flex items-start gap-4 border-b border-white/10 p-5 pr-4">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-zinc-950"
          >
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              className="object-cover"
              sizes="128px"
            />
          </a>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-base font-semibold leading-snug">
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-50 underline-offset-4 hover:underline"
              >
                {video.title}
              </a>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                  categoryColor(video.category),
                )}
              >
                {video.category}
              </span>
              {study.concepts.map((concept) => (
                <span
                  key={concept}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close study notes"
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-sm text-zinc-300">
          <p className="leading-relaxed">{study.summary}</p>

          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-fuchsia-200">
              Remember
            </h4>
            <ul className="list-disc space-y-1 pl-4">
              {study.remember.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-200">
              Check yourself
            </h4>
            <ol className="list-decimal space-y-1 pl-4">
              {study.questions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
              Takeaways
            </h4>
            <ul className="list-disc space-y-1 pl-4">
              {study.takeaways.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-3">
          <Label
            htmlFor={`learned-modal-${video.id}`}
            className="cursor-pointer text-xs text-zinc-500"
          >
            Mark as learned
          </Label>
          <Switch
            id={`learned-modal-${video.id}`}
            checked={video.isLearned}
            onCheckedChange={(checked) => onLearnedChange(video.id, checked)}
            disabled={isPending}
            className="shrink-0"
          />
        </footer>
      </div>
    </div>,
    document.body,
  );
}
