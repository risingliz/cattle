import { Card, StatTile } from "@/components/ui/Card";
import { TraceNoLink } from "@/components/cattle/TraceNoLink";
import { HorizontalBarList } from "@/components/ui/HorizontalBarList";
import { YearFilterForm } from "@/components/shipments/YearFilterForm";
import { formatDate, formatKRW, formatPercent } from "@/lib/format";
import { getAllCattleWithProfitability } from "@/lib/queries";
import type { Cattle } from "@/lib/types";
import { calcYearlyCashFlow, type ProfitabilitySummary } from "@/lib/calculations";

export const dynamic = "force-dynamic";

const GRADE_ORDER = [
  "1++A",
  "1++B",
  "1++C",
  "1+A",
  "1+B",
  "1+C",
  "1A",
  "1B",
  "1C",
  "2A",
  "2B",
  "2C",
  "3A",
  "3B",
  "3C",
  "등외",
];

function exitDate(cattle: Cattle): string | null {
  return cattle.status === "폐사" ? cattle.death_date : cattle.shipment_date;
}

function exitYear(cattle: Cattle): number | null {
  const date = exitDate(cattle);
  return date ? Number(date.slice(0, 4)) : null;
}

function gradeDisplay(cattle: Cattle): string {
  if (!cattle.grade_nm) return "-";
  if (cattle.grade_nm.startsWith("1++") && cattle.insfat != null) {
    return `${cattle.grade_nm} (${cattle.insfat})`;
  }
  return cattle.grade_nm;
}

function ProfitCell({ summary }: { summary: ProfitabilitySummary | null | undefined }) {
  if (!summary || summary.netProfit == null) return <span>-</span>;
  const positive = summary.netProfit >= 0;
  return (
    <span className={positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
      {formatKRW(summary.netProfit)}
      {summary.usedEstimatedPrice && <span className="text-black/40 dark:text-white/40">(추정)</span>}
      {summary.annualizedReturnPct != null && ` (${formatPercent(summary.annualizedReturnPct)})`}
    </span>
  );
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const { items, extraByCattle, feedCostPeriods } = await getAllCattleWithProfitability();

  const yearlyCashFlow = calcYearlyCashFlow(
    items.map((i) => i.cattle),
    extraByCattle,
    feedCostPeriods,
    new Date()
  );

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
  const returns = shippedOnly
    .map(({ summary }) => summary?.annualizedReturnPct)
    .filter((v): v is number => v != null);
  const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
  const totalNetProfit = filtered.reduce((sum, { summary }) => sum + (summary?.netProfit ?? 0), 0);
  const hasEstimated = filtered.some(({ summary }) => summary?.usedEstimatedPrice);

  const gradeCounts = new Map<string, number>();
  for (const { cattle } of shippedOnly) {
    const grade = cattle.grade_nm ?? "미확인";
    gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);
  }
  const knownGrades = GRADE_ORDER.filter((g) => gradeCounts.has(g)).map((g) => ({
    label: g,
    value: gradeCounts.get(g) ?? 0,
  }));
  const otherGrades = Array.from(gradeCounts.entries())
    .filter(([g]) => !GRADE_ORDER.includes(g))
    .map(([label, value]) => ({ label, value }));
  const gradeItems = [...knownGrades, ...otherGrades];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">출하 목록</h1>
        <YearFilterForm years={years} selectedYear={selectedYear} />
      </div>

      {yearlyCashFlow.length > 0 && (
        <Card
          title="연도별 현금흐름"
          className="border-l-4 border-l-black/20 dark:border-l-white/20"
        >
          <p className="mb-4 text-xs text-black/50 dark:text-white/50">
            그 해에 실제로 오간 돈 기준입니다 (사육중 개체의 사료비도 해당 연도만큼 포함, 출하 여부와 무관).
          </p>
          <div className="mb-4">
            <HorizontalBarList
              items={yearlyCashFlow.map((y) => ({ label: `${y.year}년`, value: y.netCashFlow }))}
              formatValue={formatKRW}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">연도</th>
                  <th className="pb-2 pr-4">입식비용</th>
                  <th className="pb-2 pr-4">사육비</th>
                  <th className="pb-2 pr-4">기타비용</th>
                  <th className="pb-2 pr-4">출하대금</th>
                  <th className="pb-2">순현금흐름</th>
                </tr>
              </thead>
              <tbody>
                {yearlyCashFlow.map((y) => (
                  <tr key={y.year} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4">{y.year}년</td>
                    <td className="py-2 pr-4">{formatKRW(y.intakeCost)}</td>
                    <td className="py-2 pr-4">{formatKRW(y.feedCost)}</td>
                    <td className="py-2 pr-4">{formatKRW(y.extraCost)}</td>
                    <td className="py-2 pr-4">{formatKRW(y.shipmentRevenue)}</td>
                    <td className="py-2">
                      <span
                        className={
                          y.netCashFlow >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {formatKRW(y.netCashFlow)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="출하 두수 (폐사 포함)" value={`${filtered.length}두`} />
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

      {gradeItems.length > 0 && (
        <Card title="등급별 분포 (출하완료)">
          <HorizontalBarList items={gradeItems} />
        </Card>
      )}

      <Card>
        {sorted.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">해당 조건의 개체가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">관리번호</th>
                  <th className="pb-2 pr-4">등급</th>
                  <th className="pb-2 pr-4">도체중</th>
                  <th className="pb-2 pr-4">출하일</th>
                  <th className="pb-2">순수익(수익률)</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ cattle, summary }) => (
                  <tr
                    key={cattle.id}
                    className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="py-2 pr-4">
                      <TraceNoLink cattleId={cattle.id} traceNo={cattle.trace_no} />
                    </td>
                    <td className="py-2 pr-4">{gradeDisplay(cattle)}</td>
                    <td className="py-2 pr-4">
                      {cattle.carcass_weight != null ? `${cattle.carcass_weight}kg` : "-"}
                    </td>
                    <td className="py-2 pr-4">{formatDate(exitDate(cattle))}</td>
                    <td className="py-2">
                      <ProfitCell summary={summary} />
                    </td>
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
