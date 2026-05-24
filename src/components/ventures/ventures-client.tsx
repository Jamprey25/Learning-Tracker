"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, TrendingUp } from "lucide-react";

import {
  addVenture,
  updateVentureMetric,
  updateVentureStage,
  type DashboardVenture,
} from "@/app/actions/venture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type VenturesClientProps = {
  initialVentures: DashboardVenture[];
};

const STAGES = ["idea", "validating", "building", "launched"] as const;

const STAGE_STYLES: Record<string, string> = {
  idea: "border-violet-300/25 bg-violet-400/10 text-violet-200",
  validating: "border-amber-300/25 bg-amber-400/10 text-amber-200",
  building: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
  launched: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
};

export function VenturesClient({ initialVentures }: VenturesClientProps) {
  const [ventures, setVentures] = useState<DashboardVenture[]>(initialVentures);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const [metricValue, setMetricValue] = useState("");

  const sortedVentures = useMemo(() => {
    return [...ventures].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [ventures]);

  function updateLocalVenture(ventureId: string, updater: (venture: DashboardVenture) => DashboardVenture) {
    setVentures((prev) => prev.map((venture) => (venture.id === ventureId ? updater(venture) : venture)));
  }

  function handleAddVenture() {
    setError(null);
    startTransition(async () => {
      const res = await addVenture({
        name,
        oneLiner,
        keyMetricLabel: metricLabel,
        keyMetricValue: metricValue.trim() ? Number(metricValue) : undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setVentures((prev) => [res.data, ...prev]);
      setName("");
      setOneLiner("");
      setMetricLabel("");
      setMetricValue("");
    });
  }

  function handleStageChange(ventureId: string, stage: string) {
    const previous = ventures.find((venture) => venture.id === ventureId);
    if (!previous || previous.stage === stage) return;

    setError(null);
    updateLocalVenture(ventureId, (venture) => ({ ...venture, stage }));
    startTransition(async () => {
      const res = await updateVentureStage({ ventureId, stage });
      if (!res.ok) {
        updateLocalVenture(ventureId, () => previous);
        setError(res.error);
        return;
      }
      updateLocalVenture(ventureId, () => res.data);
    });
  }

  function handleMetricUpdate(ventureId: string, label: string, value: string) {
    const previous = ventures.find((venture) => venture.id === ventureId);
    if (!previous) return;

    const parsedValue = value.trim() ? Number(value) : undefined;
    if (value.trim() && !Number.isFinite(parsedValue)) {
      setError("Metric value must be a valid number.");
      return;
    }

    setError(null);
    updateLocalVenture(ventureId, (venture) => ({
      ...venture,
      keyMetricLabel: label.trim() || null,
      keyMetricValue: typeof parsedValue === "number" ? parsedValue : venture.keyMetricValue,
      keyMetricUpdatedAt: new Date().toISOString(),
    }));

    startTransition(async () => {
      const res = await updateVentureMetric({
        ventureId,
        keyMetricLabel: label,
        keyMetricValue: typeof parsedValue === "number" ? parsedValue : undefined,
      });
      if (!res.ok) {
        updateLocalVenture(ventureId, () => previous);
        setError(res.error);
        return;
      }
      updateLocalVenture(ventureId, () => res.data);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-white/15 bg-black/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Venture name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
          <Input
            placeholder="One-liner"
            value={oneLiner}
            onChange={(e) => setOneLiner(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
          <Input
            placeholder="Metric label (MRR, Users...)"
            value={metricLabel}
            onChange={(e) => setMetricLabel(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
          <Input
            placeholder="Metric value"
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Capture venture momentum and stage transitions.</p>
          <Button type="button" onClick={handleAddVenture} disabled={isPending || !name.trim()}>
            <Plus className="size-4" aria-hidden />
            Add Venture
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-400/90">{error}</p> : null}

      {sortedVentures.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-zinc-500">
          No ventures yet. Add your first one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedVentures.map((venture) => (
            <VentureCard
              key={venture.id}
              venture={venture}
              isPending={isPending}
              onStageChange={handleStageChange}
              onMetricUpdate={handleMetricUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VentureCard({
  venture,
  isPending,
  onStageChange,
  onMetricUpdate,
}: {
  venture: DashboardVenture;
  isPending: boolean;
  onStageChange: (ventureId: string, stage: string) => void;
  onMetricUpdate: (ventureId: string, label: string, value: string) => void;
}) {
  const [labelDraft, setLabelDraft] = useState(venture.keyMetricLabel ?? "");
  const [valueDraft, setValueDraft] = useState(
    venture.keyMetricValue === null ? "" : String(venture.keyMetricValue),
  );

  return (
    <article className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/45 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/8 backdrop-blur-xl">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-100">{venture.name}</h3>
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest",
              STAGE_STYLES[venture.stage] ?? "border-white/15 bg-white/10 text-zinc-200",
            )}
          >
            {venture.stage}
          </span>
        </div>
        {venture.oneLiner ? <p className="text-sm text-zinc-300">{venture.oneLiner}</p> : null}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={venture.stage}
          onChange={(e) => onStageChange(venture.id, e.target.value)}
          disabled={isPending}
          className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400">
          <TrendingUp className="size-3.5" aria-hidden />
          Key Metric
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            placeholder="Label"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            className="h-9 border-white/10 bg-black/20 text-sm"
          />
          <Input
            placeholder="Value"
            value={valueDraft}
            onChange={(e) => setValueDraft(e.target.value)}
            className="h-9 border-white/10 bg-black/20 text-sm"
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => onMetricUpdate(venture.id, labelDraft, valueDraft)}
            disabled={isPending}
            className="h-8"
          >
            Save Metric
          </Button>
        </div>
      </div>
    </article>
  );
}
