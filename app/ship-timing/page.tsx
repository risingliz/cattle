import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getAllCattleWithProfitability } from "@/lib/queries";
import {
  bestAgeByNetProfit,
  buildAgePerformance,
  projectShipping,
  MIN_SAMPLE,
} from "@/lib/shipTiming";
import { calcMonthsBetween } from "@/lib/calculations";
import { formatKRW, formatPercent, getManagementNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function netClass(v: number): string {
  return v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

export default async function ShipTimingPage() {
  const { items, feedCostPeriods } = await getAllCattleWithProfitability();
  const today = new Date();

  const stats = buildAgePerformance(items);
  const best = bestAgeByNetProfit(stats);
  const maxNet = Math.max(1, ...stats.filter((s) => s.reliable).map((s) => s.avgNetProfit));

  // 사육중 개체별 권장 출하 시점
  const active = items
    .filter(({ cattle }) => cattle.status === "사육중" && cattle.birth_date)
    .map(({ cattle, summary }) => ({
      cattle,
      summary,
      rec:
        summary != null
          ? projectShipping(cattle, summary.totalInvestment, stats, feedCostPeriods, today)
          : null,
    }))
    .filter((r) => r.rec != null)
    .sort((a, b) => calcMonthsBetween(new Date(b.cattle.birth_date!), today) - calcMonthsBetween(new Date(a.cattle.birth_date!), today));

  const overdueCount = active.filter((a) => a.rec!.overdue).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">출하 적기</h1>

      {best ? (
        <Card title="농장 실적 기준 권장 출하 월령">
          <p className="text-4xl font-semibold">
            {best.ageMonths}개월
            <span className="ml-2 text-base font-normal text-black/50 dark:text-white/50">
              평균 순수익 {formatKRW(best.avgNetProfit)}
            </span>
          </p>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            출하완료 개체의 실제 성적에서 <b>한 마리당 순수익이 가장 높았던 월령</b>입니다. 표본{" "}
            {best.count}두 기준이며, 우방을 바로 채우지 않는 운영을 전제로 순수익 기준으로 골랐습니다.
          </p>
          {overdueCount > 0 && (
            <p className="mt-3 border-t border-black/5 pt-3 text-sm dark:border-white/10">
              사육중 개체 중 <span className="font-semibold text-red-600 dark:text-red-400">{overdueCount}두</span>가
              이미 이 시점을 지났습니다.
            </p>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-black/60 dark:text-white/60">
            출하 실적이 부족해 아직 권장 월령을 계산할 수 없습니다. (월령별 {MIN_SAMPLE}두 이상 필요)
          </p>
        </Card>
      )}

      <Card title="출하월령별 실적">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/60 dark:text-white/60">
                <th className="pb-2 pr-4">출하월령</th>
                <th className="pb-2 pr-4">두수</th>
                <th className="pb-2 pr-4">도체중</th>
                <th className="pb-2 pr-4">근내지방도</th>
                <th className="pb-2 pr-4">1++비율</th>
                <th className="pb-2 pr-4">kg당 실현단가</th>
                <th className="pb-2 pr-4">평균 순수익</th>
                <th className="pb-2">연환산</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const isBest = best?.ageMonths === s.ageMonths;
                return (
                  <tr
                    key={s.ageMonths}
                    className={`border-t border-black/5 dark:border-white/10 ${
                      isBest ? "bg-green-50/60 dark:bg-green-500/10" : ""
                    } ${s.reliable ? "" : "text-black/40 dark:text-white/40"}`}
                  >
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">
                      {s.ageMonths}개월
                      {isBest && (
                        <span className="ml-1.5 rounded bg-green-600 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white">
                          권장
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                      {s.count}두{!s.reliable && <span className="ml-1 text-xs">(표본 부족)</span>}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                      {Math.round(s.avgCarcassWeight)}kg
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                      {s.avgInsfat != null ? s.avgInsfat.toFixed(1) : "-"}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{pct(s.plusPlusRate)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                      {formatKRW(s.avgPricePerKg)}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-2 rounded bg-black/70 dark:bg-white/70"
                          style={{ width: `${Math.max(2, (s.avgNetProfit / maxNet) * 72)}px` }}
                        />
                        {formatKRW(s.avgNetProfit)}
                      </span>
                    </td>
                    <td className="py-2 whitespace-nowrap tabular-nums">
                      {s.avgAnnualReturn != null ? formatPercent(s.avgAnnualReturn) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-black/50 dark:text-white/50">
          <b>해석 주의.</b> 이 표는 상관관계일 뿐 인과가 아닙니다. 잘 자란 개체를 먼저 출하하고 덜 자란
          개체를 남기셨다면, 높은 월령 구간은 &quot;오래 키워서 나빠진 개체&quot;가 아니라 &quot;원래 성적이
          낮아 남은 개체&quot;일 수 있습니다. 사육중 개체의 유전등급과 실제 출하등급이 쌓이면 이 구분이
          가능해집니다.
        </p>
      </Card>

      <Card title={`사육중 개체별 권장 시점 (${active.length}두)`}>
        <p className="mb-3 text-xs text-black/50 dark:text-white/50">
          예상 판매가 = 해당 월령의 농장 평균 도체중 × 평균 실현 kg당 단가. 예상 순수익은 여기서 현재까지
          투자비와 그 시점까지 더 들어갈 사료비를 뺀 값입니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/60 dark:text-white/60">
                <th className="pb-2 pr-4">관리번호</th>
                <th className="pb-2 pr-4">현재 월령</th>
                <th className="pb-2 pr-4">현재 투자비</th>
                <th className="pb-2 pr-4">권장 시점</th>
                <th className="pb-2 pr-4">예상 순수익</th>
                <th className="pb-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {active.map(({ cattle, summary, rec }) => (
                <tr key={cattle.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/cattle/${cattle.id}`}
                      className="font-mono font-semibold underline tabular-nums"
                    >
                      {getManagementNumber(cattle.trace_no)}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                    {rec!.currentAgeMonths}개월
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                    {formatKRW(summary?.totalInvestment)}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                    {rec!.best!.isPast ? "지금" : `${rec!.best!.ageMonths}개월 (${rec!.best!.targetDate})`}
                  </td>
                  <td className={`py-2 pr-4 whitespace-nowrap tabular-nums ${netClass(rec!.best!.expectedNetProfit)}`}>
                    {formatKRW(rec!.best!.expectedNetProfit)}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    {rec!.overdue ? (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                        적기 지남
                      </span>
                    ) : rec!.best!.isPast ? (
                      <span className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300">
                        출하 권장
                      </span>
                    ) : (
                      <span className="text-xs text-black/40 dark:text-white/40">사육 계속</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-black/50 dark:text-white/50">
        출하가격이 입력되지 않은 개체는 음성공판장 시세 기준 추정가로 계산됩니다. 정산서 금액을 입력하실수록
        위 실적과 권장 시점이 정확해집니다.
      </p>
    </div>
  );
}
