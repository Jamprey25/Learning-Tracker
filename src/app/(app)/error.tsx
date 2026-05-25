"use client";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-100">
      <h2 className="text-base font-semibold text-rose-50">Dashboard failed to load</h2>
      <p className="mt-2 text-rose-100/90">
        {process.env.NODE_ENV === "development"
          ? error.message
          : "Check /api/health and /api/health/dashboard on your deployment for the exact database error."}
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-rose-200/70">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-50"
      >
        Try again
      </button>
    </div>
  );
}
