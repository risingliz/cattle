export interface BarItem {
  label: string;
  value: number;
  highlight?: boolean;
}

export function HorizontalBarList({
  items,
  unit = "두",
  formatValue,
}: {
  items: BarItem[];
  unit?: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const isNegative = item.value < 0;
        return (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            <div className="w-24 shrink-0 text-black/60 dark:text-white/60">{item.label}</div>
            <div className="h-4 flex-1 overflow-hidden rounded bg-black/5 dark:bg-white/10">
              <div
                className={`h-full rounded ${
                  isNegative ? "bg-red-500" : item.highlight ? "bg-amber-500" : "bg-black/70 dark:bg-white/70"
                }`}
                style={{ width: item.value !== 0 ? `${(Math.abs(item.value) / max) * 100}%` : 0 }}
              />
            </div>
            <div className="w-28 shrink-0 text-right tabular-nums">
              {formatValue ? formatValue(item.value) : `${item.value}${unit}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
