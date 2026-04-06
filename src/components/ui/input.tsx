import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-50 shadow-inner shadow-black/20 outline-none backdrop-blur-md transition-[color,box-shadow] placeholder:text-zinc-500 focus-visible:border-white/20 focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
