"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Plus } from "lucide-react";

import { addCourse, type DashboardCourse } from "@/app/actions/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AddCourseFormProps = {
  onCreated: (course: DashboardCourse) => void;
};

export function AddCourseForm({ onCreated }: AddCourseFormProps) {
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [url, setUrl] = useState("");
  const [totalModules, setTotalModules] = useState("1");
  const [category, setCategory] = useState("General");
  const [targetCompletionDate, setTargetCompletionDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await addCourse({
        title,
        provider,
        url,
        totalModules: Number(totalModules),
        category,
        targetCompletionDate: targetCompletionDate || undefined,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      onCreated(res.data);
      setTitle("");
      setProvider("");
      setUrl("");
      setTotalModules("1");
      setCategory("General");
      setTargetCompletionDate("");
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/15 bg-black/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-[44px] border-white/10 bg-black/20"
        />
        <Input
          placeholder="Provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="min-h-[44px] border-white/10 bg-black/20"
        />
        <Input
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-h-[44px] border-white/10 bg-black/20"
        />
        <Input
          type="number"
          min={1}
          placeholder="Modules"
          value={totalModules}
          onChange={(e) => setTotalModules(e.target.value)}
          className="min-h-[44px] border-white/10 bg-black/20"
        />
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="date"
            value={targetCompletionDate}
            onChange={(e) => setTargetCompletionDate(e.target.value)}
            className="min-h-[44px] border-white/10 bg-black/20 pl-8"
          />
        </div>
        <Input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-[44px] border-white/10 bg-black/20"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">Add a course and track module progress inline.</p>
        <Button type="button" onClick={onSubmit} disabled={isPending || !title.trim()}>
          <Plus className="size-4" aria-hidden />
          Add Course
        </Button>
      </div>
      {error ? <p className="text-sm text-rose-400/90">{error}</p> : null}
    </div>
  );
}
