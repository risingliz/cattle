"use client";

import { secondaryButtonClass } from "@/components/ui/classes";

export function YearFilterForm({
  years,
  selectedYear,
}: {
  years: number[];
  selectedYear: number | null;
}) {
  return (
    <form className="flex items-center gap-2">
      <select
        name="year"
        defaultValue={selectedYear ?? ""}
        className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm dark:border-white/15 dark:bg-black/20"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">전체 연도</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}년
          </option>
        ))}
      </select>
      <button type="submit" className={secondaryButtonClass}>
        적용
      </button>
    </form>
  );
}
