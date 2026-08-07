import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { primaryButtonClass } from "@/components/ui/classes";
import { formatDate, formatMonthsAndDays, formatKRW } from "@/lib/format";
import { getAllCattleWithProfitability } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CattleListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const { items, pens } = await getAllCattleWithProfitability();
  const penNameById = new Map(pens.map((p) => [p.id, p.name]));

  const active = items.filter(({ cattle }) => {
    if (cattle.status !== "사육중") return false;
    if (q && !cattle.trace_no.includes(q)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">사육 목록 ({active.length}두)</h1>
        <div className="flex gap-2">
          <form className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="이력번호 검색"
              className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm dark:border-white/15 dark:bg-black/20"
            />
            <button
              type="submit"
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
            >
              검색
            </button>
          </form>
          <Link href="/cattle/new" className={primaryButtonClass}>
            + 개체 등록
          </Link>
        </div>
      </div>

      <Card>
        {active.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">사육중인 개체가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">이력번호</th>
                  <th className="pb-2 pr-4">우방</th>
                  <th className="pb-2 pr-4">상태</th>
                  <th className="pb-2 pr-4">입식일</th>
                  <th className="pb-2 pr-4">사육일수</th>
                  <th className="pb-2">누적 투자비용</th>
                </tr>
              </thead>
              <tbody>
                {active.map(({ cattle, summary }) => (
                  <tr
                    key={cattle.id}
                    className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="py-2 pr-4">
                      <Link href={`/cattle/${cattle.id}`} className="underline">
                        {cattle.trace_no}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      {cattle.pen_id ? (penNameById.get(cattle.pen_id) ?? "-") : "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={cattle.status} />
                    </td>
                    <td className="py-2 pr-4">{formatDate(cattle.intake_date)}</td>
                    <td className="py-2 pr-4">
                      {formatMonthsAndDays(summary?.monthsHeld, summary?.daysHeld)}
                    </td>
                    <td className="py-2">{formatKRW(summary?.totalInvestment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
