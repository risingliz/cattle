import Link from "next/link";

export interface SortOption {
  label: string;
  column: string;
}

/**
 * 좁은 화면용 정렬 컨트롤. SortableTh와 완전히 같은 URL 규약(?sort=&dir=)을 쓰므로
 * 정렬 계산 로직은 그대로 두고 "누르는 곳"만 표 머리글에서 이 칩으로 옮긴 것이다.
 */
export function SortChips({
  options,
  basePath,
  params,
  activeSort,
  activeDir,
}: {
  options: SortOption[];
  basePath: string;
  params: Record<string, string | undefined>;
  activeSort?: string;
  activeDir?: string;
}) {
  return (
    <div className="-mx-1 mb-3 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
      <span className="shrink-0 pr-0.5 text-[10px] font-semibold tracking-wider text-black/40 dark:text-white/40">
        정렬
      </span>
      {options.map((option) => {
        const isActive = activeSort === option.column;
        const nextDir = isActive && activeDir === "asc" ? "desc" : "asc";

        const usp = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value) usp.set(key, value);
        }
        usp.set("sort", option.column);
        usp.set("dir", nextDir);

        return (
          <Link
            key={option.column}
            href={`${basePath}?${usp.toString()}`}
            aria-current={isActive ? "true" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-semibold ${
              isActive
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/15 text-black/60 dark:border-white/15 dark:text-white/60"
            }`}
          >
            {option.label}
            {isActive && <span className="text-[9px]">{activeDir === "asc" ? "▲" : "▼"}</span>}
          </Link>
        );
      })}
    </div>
  );
}
