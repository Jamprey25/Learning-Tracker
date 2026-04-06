import { Card, CardContent, CardHeader } from "@/components/ui/card";

function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.04]">
      <div className="relative aspect-video w-full animate-pulse bg-zinc-800/90" />
      <CardHeader className="pb-2">
        <div className="h-4 w-[85%] max-w-[18rem] animate-pulse rounded-md bg-zinc-800/90" />
        <div className="mt-2 h-4 w-[65%] max-w-[14rem] animate-pulse rounded-md bg-zinc-800/80" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-4 w-28 animate-pulse rounded-md bg-zinc-800/70" />
        <div className="h-7 w-11 shrink-0 animate-pulse rounded-full bg-zinc-800/70 sm:ml-auto" />
      </CardContent>
    </Card>
  );
}

export default function AppLoading() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="h-8 w-56 max-w-[85vw] animate-pulse rounded-lg bg-zinc-800/80 sm:h-9 sm:w-72" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-zinc-800/60" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-zinc-800/50" />
        <div className="flex flex-wrap gap-3 pt-3">
          <div className="h-9 w-28 animate-pulse rounded-md bg-zinc-800/70" />
        </div>
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:flex-row">
          <div className="h-10 min-h-[44px] flex-1 animate-pulse rounded-xl bg-zinc-800/70" />
          <div className="h-10 min-h-[44px] w-full animate-pulse rounded-xl bg-zinc-800/60 sm:w-28 sm:min-w-[7rem]" />
        </div>
      </header>

      <section aria-hidden className="space-y-8">
        <div className="space-y-3">
          <div className="h-5 w-40 animate-pulse rounded-md bg-zinc-800/70" />
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="min-w-0 list-none">
                <VideoCardSkeleton />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
