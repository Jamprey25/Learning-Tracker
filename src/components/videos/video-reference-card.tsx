"use client";

import Image from "next/image";
import { CheckCircle2, ChevronDown } from "lucide-react";

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

      <div className="flex gap-4 p-4">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-900/80 sm:w-56"
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
            sizes="(max-width: 640px) 112px, 224px"
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

        <div className="min-w-0 flex-1 space-y-3">
          <header className="space-y-2">
            <h3 className="text-sm font-medium leading-snug">
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-100 underline-offset-4 hover:underline"
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
          </header>

          <p className="text-sm leading-relaxed text-zinc-300">{study.summary}</p>

          <details className="group/details rounded-xl border border-white/8 bg-white/[0.03]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-zinc-400 [&::-webkit-details-marker]:hidden">
              <span>What to remember, questions, takeaways</span>
              <ChevronDown className="size-3.5 shrink-0 transition-transform group-open/details:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-white/8 px-3 py-3 text-sm text-zinc-300">
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
          </details>

          <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-3">
            <Label
              htmlFor={`learned-${video.id}`}
              className="cursor-pointer text-xs text-zinc-500"
            >
              Mark as learned
            </Label>
            <Switch
              id={`learned-${video.id}`}
              checked={video.isLearned}
              onCheckedChange={(checked) => onLearnedChange(video.id, checked)}
              disabled={isPending}
              className="shrink-0"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
