import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getAllCattleWithProfitability } from "@/lib/queries";
import {
  bestAgeByNetProfit,
  buildAgePerformance,
  projectShipping,
  medianRealizedReturn,
  MIN_SAMPLE,
} from "@/lib/shipTiming";
import { calcMonthsBetween } from "@/lib/calculations";
import { fetchAllGradePricesPerKg, getTueFriForWeeksAgo } from "@/lib/eumseong-api";
import { formatKRW, formatPercent, getManagementNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export default async function ShipTimingPage() {
  const today = new Date();
  const lastWeek = getTueFriForWeeksAgo(today, 0);

  const [{ items, feedCostPeriods }, gradePrices] = await Promise.all([
    getAllCattleWithProfitability(),
    fetchAllGradePricesPerKg(lastWeek.start, lastWeek.end).catch(() => null),
  ]);

  const stats = buildAgePerformance(items);
  const best = bestAgeByNetProfit(stats);
  const maxNet = Math.max(1, ...stats.filter((s) => s.reliable).map((s) => s.avgNetProfit));

  // 사육중 개체별 권장 출하 시점.
  // 초음파 예상등급이 있으면 그 등급의 현재 시세를 써서 개체별로 계산한다.
  const active = items
    .filter(({ cattle }) => cattle.status === "사육중" && cattle.birth_date)
    .map(({ cattle, summary, latestScan }) => {
      const scanGrade = latestScan?.predicted_grade ?? null;
      const scanPrice = scanGrade ? (gradePrices?.get(scanGrade) ?? null) : null;
      return {
        cattle,
        summary,
        latestScan,
        scanPrice,
        rec:
          summary != null
            ? projectShipping(cattle, summary.totalInvestment, stats, feedCostPeriods, today, scanPrice)
            : null,
      };
    })
    .filter((r) => r.rec != null)
    .sort((a, b) => calcMonthsBetween(new Date(b.cattle.birth_date!), today) - calcMonthsBetween(new Date(a.cattle.birth_date!), today));

  // 초음파 예상등급이 있어야 개체별 단가를 쓸 수 있다. 없는 개체는 농장 평균밖에 못 써서 줄마다
  // 같은 값이 반복되므로 표에서 제외한다.
  const scanned = active.filter((a) => a.latestScan?.predicted_grade);

  // 눈금을 읽는 기준점: 권장 월령의 농장 평균 도체중, 그리고 실현 수익률 중앙값
  const refWeight = best?.avgCarcassWeight ?? null;
  const medianReturn = medianRealizedReturn(items);

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

      <Card title={`초음파 측정 개체 (${scanned.length}두 / 사육중 ${active.length}두)`}>
        <p className="mb-4 text-xs text-black/50 dark:text-white/50">
          초음파 예상등급이 있는 개체만 표시합니다. 큰 숫자는{" "}
          <b>농장 {best?.ageMonths}개월 평균 도체중 {refWeight != null && `${Math.round(refWeight)}kg`}</b>로
          나왔을 때의 수익률이고, 막대는 지금까지 출하한 개체의 중앙값
          {medianReturn != null && <> <b>{Math.round(medianReturn)}%</b></>}와 견준 것입니다. 아래 줄은 그
          수익률을 내려면 나와야 하는 도체중입니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {scanned.map(({ cattle, latestScan, rec }) => {
            const price = rec!.best!.expectedPricePerKg;
            const invest = rec!.best!.totalInvestmentAtShip;
            // 농장 평균 도체중으로 나왔을 때의 수익률 — 이 카드의 핵심 숫자
            const expectedReturn =
              refWeight != null && invest > 0 ? ((refWeight * price - invest) / invest) * 100 : null;
            const aboveMedian = expectedReturn != null && medianReturn != null && expectedReturn >= medianReturn;

            return (
              <div
                key={cattle.id}
                className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Link
                      href={`/cattle/${cattle.id}`}
                      className="font-mono text-lg font-bold underline tabular-nums"
                    >
                      {getManagementNumber(cattle.trace_no)}
                    </Link>
                    <span className="rounded bg-black px-1.5 py-1 font-mono text-[11px] leading-none font-semibold text-white dark:bg-white dark:text-black">
                      {latestScan!.predicted_grade}
                    </span>
                    {latestScan!.upgradable_grade && (
                      <span className="text-xs whitespace-nowrap text-black/50 dark:text-white/50">
                        →{latestScan!.upgradable_grade}
                      </span>
                    )}
                  </span>
                  {rec!.best!.isPast ? (
                    <span className="rounded bg-green-50 px-1.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap text-green-700 dark:bg-green-500/15 dark:text-green-300">
                      출하 권장
                    </span>
                  ) : (
                    <span className="text-xs whitespace-nowrap text-black/40 dark:text-white/40">사육 계속</span>
                  )}
                </div>

                <div className="text-xs whitespace-nowrap text-black/50 tabular-nums dark:text-white/50">
                  {rec!.currentAgeMonths}개월
                  {latestScan!.back_fat_mm != null && ` · 등지방 ${latestScan!.back_fat_mm}mm`}
                  {` · kg당 ${formatKRW(price)}`}
                  {` · 투자비 ${formatKRW(invest)}`}
                </div>

                {expectedReturn != null && (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-mono text-3xl font-bold tabular-nums ${
                          aboveMedian ? "text-green-600 dark:text-green-400" : "text-black dark:text-white"
                        }`}
                      >
                        {Math.round(expectedReturn)}%
                      </span>
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {Math.round(refWeight!)}kg 나오면
                      </span>
                    </div>
                    {/* 농장 중앙값과 견주는 막대 */}
                    <div className="relative mt-1.5 h-2 overflow-hidden rounded bg-black/5 dark:bg-white/10">
                      <div
                        className={`h-full rounded ${aboveMedian ? "bg-green-500/70" : "bg-black/50 dark:bg-white/50"}`}
                        style={{ width: `${Math.max(2, Math.min(100, (expectedReturn / 120) * 100))}%` }}
                      />
                      {medianReturn != null && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-black/60 dark:bg-white/60"
                          style={{ left: `${Math.min(100, (medianReturn / 120) * 100)}%` }}
                          title={`농장 중앙값 ${Math.round(medianReturn)}%`}
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-black/5 pt-2 text-xs tabular-nums dark:border-white/10">
                  {rec!.best!.targetWeights.map(({ rate, weight }) => {
                    const reachable = refWeight != null && weight <= refWeight;
                    return (
                      <span
                        key={rate}
                        className={`whitespace-nowrap ${
                          reachable ? "font-semibold" : "text-black/35 dark:text-white/35"
                        }`}
                      >
                        <span className="text-black/50 dark:text-white/50">{Math.round(rate * 100)}%</span>{" "}
                        {Math.round(weight)}kg
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-xs text-black/50 dark:text-white/50">
        출하가격이 입력되지 않은 개체는 음성공판장 시세 기준 추정가로 계산됩니다. 정산서 금액을 입력하실수록
        위 실적과 권장 시점이 정확해집니다.
      </p>
    </div>
  );
}
