import Link from "next/link";
import { getManagementNumber } from "@/lib/format";

/** 관리번호(끝 4자리)만 보여주는 링크. */
export function TraceNoLink({ cattleId, traceNo }: { cattleId: string; traceNo: string }) {
  return (
    <Link
      href={`/cattle/${cattleId}`}
      className="font-medium underline decoration-black/30 hover:decoration-black dark:decoration-white/30 dark:hover:decoration-white"
    >
      {getManagementNumber(traceNo)}
    </Link>
  );
}
