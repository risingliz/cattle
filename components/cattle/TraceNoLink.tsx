import Link from "next/link";
import { getManagementNumber } from "@/lib/format";

/** 관리번호(끝 4자리)를 크게, 전체 이력번호를 작게 함께 보여주는 링크. */
export function TraceNoLink({ cattleId, traceNo }: { cattleId: string; traceNo: string }) {
  return (
    <Link href={`/cattle/${cattleId}`} className="group inline-flex flex-col leading-tight">
      <span className="font-medium underline decoration-black/30 group-hover:decoration-black dark:decoration-white/30 dark:group-hover:decoration-white">
        {getManagementNumber(traceNo)}
      </span>
      <span className="text-xs text-black/40 dark:text-white/40">{traceNo}</span>
    </Link>
  );
}
