export function InlineBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-3 w-32 overflow-hidden rounded bg-black/5 dark:bg-white/10">
      <div className="h-full rounded bg-black/70 dark:bg-white/70" style={{ width: `${width}%` }} />
    </div>
  );
}
