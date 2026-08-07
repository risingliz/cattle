export interface BarItem {
  label: string;
  value: number;
  highlight?: boolean;
}

export function HorizontalBarList({ items, unit = "두" }: { items: BarItem[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-sm">
          <div className="w-24 shrink-0 text-black/60 dark:text-white/60">{item.label}</div>
          <div className="h-4 flex-1 overflow-hidden rounded bg-black/5 dark:bg-white/10">
            <div
              className={`h-full rounded ${
                item.highlight ? "bg-amber-500" : "bg-black/70 dark:bg-white/70"
              }`}
              style={{ width: item.value > 0 ? `${(item.value / max) * 100}%` : 0 }}
            />
          </div>
          <div className="w-10 shrink-0 text-right tabular-nums">
            {item.value}
            {unit}
          </div>
        </div>
      ))}
    </div>
  );
}
