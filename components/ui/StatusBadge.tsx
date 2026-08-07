import type { CattleStatus } from "@/lib/types";

const STYLES: Record<CattleStatus, string> = {
  사육중: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  출하완료: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
  폐사: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

export function StatusBadge({ status }: { status: CattleStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {status}
    </span>
  );
}
