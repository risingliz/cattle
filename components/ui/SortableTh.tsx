import Link from "next/link";

export function SortableTh({
  label,
  column,
  basePath,
  params,
  activeSort,
  activeDir,
  className,
}: {
  label: string;
  column: string;
  basePath: string;
  params: Record<string, string | undefined>;
  activeSort?: string;
  activeDir?: string;
  className?: string;
}) {
  const isActive = activeSort === column;
  const nextDir = isActive && activeDir === "asc" ? "desc" : "asc";
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) usp.set(key, value);
  }
  usp.set("sort", column);
  usp.set("dir", nextDir);

  return (
    <th className={className}>
      <Link
        href={`${basePath}?${usp.toString()}`}
        className="inline-flex items-center gap-1 hover:text-black dark:hover:text-white"
      >
        {label}
        {isActive && <span className="text-[10px]">{activeDir === "asc" ? "▲" : "▼"}</span>}
      </Link>
    </th>
  );
}
