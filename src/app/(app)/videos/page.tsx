import { Film } from "lucide-react";

export default function VideosPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Film className="size-6 text-zinc-700 dark:text-zinc-300" aria-hidden />
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Videos
        </h1>
      </div>
      <p className="text-zinc-600 dark:text-zinc-400">
        Connect your database and use{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm dark:bg-zinc-800">
          prisma.video
        </code>{" "}
        here to list and manage saved learning videos.
      </p>
    </div>
  );
}
