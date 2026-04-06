import Link from "next/link";
import { BookOpen, Video } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: BookOpen },
  { href: "/videos", label: "Videos", icon: Video },
] as const;

export function AppNav() {
  return (
    <header className="border-b border-white/10 bg-white/[0.04] pt-[max(0px,env(safe-area-inset-top))] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-[44px] min-w-0 items-center gap-2 py-2 pr-1 font-semibold text-zinc-50 touch-manipulation"
        >
          <BookOpen className="size-5 shrink-0" aria-hidden />
          <span className="truncate sm:whitespace-normal">Learning Tracker</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-50 sm:min-w-0 sm:gap-2 sm:px-3"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
