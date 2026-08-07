import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="text-xs text-black/60 dark:text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-black/50 dark:text-white/50">{hint}</div>}
    </div>
  );
}
