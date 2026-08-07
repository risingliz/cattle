import Link from "next/link";
import { Card, StatTile } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { YearFilterForm } from "@/components/shipments/YearFilterForm";
import { formatDate, formatMonthsAndDays, formatKRW, formatPercent } from "@/lib/format";
import { getAllCattleWithProfitability } from "@/lib/queries";
import type { Cattle } from "@/lib/types";

export const dynamic = "force-dynamic";

function exitDate(cattle: Cattle): string | null {
  return cattle.status === "폐사" ? cattle.death_date : cattle.shipment_date;
}

function exitYear(cattle: Cattle): number | null {
  const date = exitDate(cattle);
  return date ? Number(date.slice(0, 4)) : null;
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const { items } = await getAllCattleWithProfitability();

  const exited = items.filter(({ cattle }) => cattle.status === "출하완료" || cattle.status === "폐사");

  const years = Array.from(new Set(exited.map(({ cattle }) => exitYear(cattle)).filter((y): y is number => y != null))).sort(
    (a, b) => b - a
  );

  const selectedYear = params.year ? Number(params.year) : null;
  const filtered = selectedYear
    ? exited.filter(({ cattle }) => exitYear(cattle) === selectedYear)
    : exited;

  const sorted = [...filtered].sort((a, b) => (exitDate(b.cattle) ?? "").localeCompare(exitDate(a.cattle) ?? ""));

  const shippedOnly = filtered.filter(({ cattle }) => cattle.status === "출하완료");
  const deadOnly = filtered.filter(({ cattle }) => cattle.status === "폐사");
  const returns = shippedOnly
    .map(({ summary }) => summary?.annualizedReturnPct)
    .filter((v): v is number => v != null);
  const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
  const totalNetProfit = filtered.reduce((sum, { summary }) => sum + (summary?.netProfit ?? 0), 0);
  const hasEstimated = filtered.some(({ summary }) => summary?.usedEstimatedPrice);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">출하 목록</h1>
        <YearFilterForm years={years} selectedYear={selectedYear} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="출하완료" value={`${shippedOnly.length}두`} />
        <StatTile label="폐사" value={`${deadOnly.length}두`} />
        <StatTile
          label="평균 연환산 수익률 (출하완료)"
          value={
            <span className={(avgReturn ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {formatPercent(avgReturn)}
            </span>
          }
        />
        <StatTile
          label="순손익 합계"
          value={
            <span className={totalNetProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {formatKRW(totalNetProfit)}
            </span>
          }
        />
      </div>

      {hasEstimated && (
        <p className="text-xs text-black/50 dark:text-white/50">
          * (추정) 표시된 개체는 출하가격이 아직 입력되지 않아 음성공판장 등급별 낙찰가 기준 추정값으로 계산되었습니다.
        </p>
      )}

      <Card>
        {sorted.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">해당 조건의 개체가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">이력번호</th>
                  <th className="pb-2 pr-4">상태</th>
                  <th className="pb-2 pr-4">종료일</th>
                  <th className="pb-2 pr-4">사육일수</th>
                  <th className="pb-2 pr-4">총투자비용</th>
                  <th className="pb-2 pr-4">순수익</th>
                  <th className="pb-2">연환산 수익률</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ cattle, summary }) => (
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
                      <StatusBadge status={cattle.status} />
                    </td>
                    <td className="py-2 pr-4">{formatDate(exitDate(cattle))}</td>
                    <td className="py-2 pr-4">
                      {formatMonthsAndDays(summary?.monthsHeld, summary?.daysHeld)}
                    </td>
                    <td className="py-2 pr-4">{formatKRW(summary?.totalInvestment)}</td>
                    <td className="py-2 pr-4">
                      {formatKRW(summary?.netProfit)}
                      {summary?.usedEstimatedPrice && (
                        <span className="ml-1 text-xs text-black/40 dark:text-white/40">(추정)</span>
                      )}
                    </td>
                    <td className="py-2">{formatPercent(summary?.annualizedReturnPct)}</td>
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
