"use client";

export default function CattleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <p className="font-medium">오류가 발생했습니다</p>
      <p className="mt-1">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md border border-red-300 px-3 py-1.5 text-sm hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-500/20"
      >
        다시 시도
      </button>
    </div>
  );
}
