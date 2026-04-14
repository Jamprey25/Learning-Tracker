"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
  color?: "default" | "blue" | "violet" | "emerald" | "amber" | "pink" | "cyan";
}

const GRADIENTS: Record<NonNullable<GlowingEffectProps["color"]>, string> = {
  default: `repeating-conic-gradient(from calc(var(--start)*1deg) at 50% 50%, #a78bfa 0%, #818cf8 25%, #c084fc 50%, #a78bfa 75%, #a78bfa 100%)`,
  blue:    `repeating-conic-gradient(from calc(var(--start)*1deg) at 50% 50%, #60a5fa 0%, #818cf8 25%, #38bdf8 50%, #60a5fa 75%, #60a5fa 100%)`,
  violet:  `repeating-conic-gradient(from calc(var(--start)*1deg) at 50% 50%, #a78bfa 0%, #c084fc 25%, #818cf8 50%, #a78bfa 75%, #a78bfa 100%)`,
  emerald: `repeating-conic-gradient(from calc(var(--start)*1deg) at 50% 50%, #34d399 0%, #6ee7b7 25%, #10b981 50%, #34d399 75%, #34d399 100%)`,
  amber:   `repeating-conic-gradient(from calc(var(--start)*1deg) at 50% 50%, #fbbf24 0%, #f59e0b 25%, #fcd34d 50%, #fbbf24 75%, #fbbf24 100%)`,
  pink:    `repeating-conic-gradient(from calc(var(--start)*1deg) at 50% 50%, #f472b6 0%, #ec4899 25%, #f9a8d4 50%, #f472b6 75%, #f472b6 100%)`,
  cyan:    `repeating-conic-gradient(from calc(var(--start)*1deg) at 50% 50%, #22d3ee 0%, #67e8f9 25%, #06b6d4 50%, #22d3ee 75%, #22d3ee 100%)`,
};

export const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.65,
    proximity = 80,
    spread = 28,
    glow = false,
    className,
    movementDuration = 1.4,
    borderWidth = 1,
    disabled = false,
    color = "default",
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>(0);

    const handleMove = useCallback(
      (e?: MouseEvent | { x: number; y: number }) => {
        if (!containerRef.current) return;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) return;

          const { left, top, width, height } = el.getBoundingClientRect();
          const mouseX = e?.x ?? lastPosition.current.x;
          const mouseY = e?.y ?? lastPosition.current.y;
          if (e) lastPosition.current = { x: mouseX, y: mouseY };

          const center = [left + width / 2, top + height / 2];
          const dist = Math.hypot(mouseX - center[0], mouseY - center[1]);
          const inactiveR = 0.5 * Math.min(width, height) * inactiveZone;
          if (dist < inactiveR) { el.style.setProperty("--active", "0"); return; }

          const isActive =
            mouseX > left - proximity && mouseX < left + width + proximity &&
            mouseY > top - proximity && mouseY < top + height + proximity;
          el.style.setProperty("--active", isActive ? "1" : "0");
          if (!isActive) return;

          const current = parseFloat(el.style.getPropertyValue("--start")) || 0;
          const target = (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;
          const diff = ((target - current + 180) % 360) - 180;
          animate(current, current + diff, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => el.style.setProperty("--start", String(v)),
          });
        });
      },
      [inactiveZone, proximity, movementDuration],
    );

    useEffect(() => {
      if (disabled) return;
      const onScroll = () => handleMove();
      const onPointer = (e: PointerEvent) => handleMove(e);
      window.addEventListener("scroll", onScroll, { passive: true });
      document.body.addEventListener("pointermove", onPointer, { passive: true });
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        window.removeEventListener("scroll", onScroll);
        document.body.removeEventListener("pointermove", onPointer);
      };
    }, [handleMove, disabled]);

    return (
      <div
        ref={containerRef}
        style={
          {
            "--blur": `${blur}px`,
            "--spread": spread,
            "--start": "0",
            "--active": "0",
            "--bw": `${borderWidth}px`,
            "--gradient": GRADIENTS[color],
          } as React.CSSProperties
        }
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit]",
          blur > 0 && "blur-[var(--blur)]",
          disabled && "hidden",
          className,
        )}
      >
        <div
          className={cn(
            "h-full w-full rounded-[inherit]",
            "after:absolute after:inset-[calc(-1*var(--bw))] after:rounded-[inherit]",
            "after:[border:var(--bw)_solid_transparent]",
            "after:[background:var(--gradient)] after:[background-attachment:fixed]",
            "after:opacity-[var(--active)] after:transition-opacity after:duration-400",
            "after:[mask-clip:padding-box,border-box] after:[mask-composite:intersect]",
            "after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#0000_0deg,#fff,#0000_calc(var(--spread)*2deg))]",
          )}
        />
      </div>
    );
  },
);

GlowingEffect.displayName = "GlowingEffect";
