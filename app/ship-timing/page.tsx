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
import { fetchAllGradePricesPerKg, getTueFriForWeeksAgo } from "@/lib/eumseong-api";
import { formatKRW, formatPercent, getManagementNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** 농가가 읽기 쉬운 만원 단위. 6,644,331 -> "664만원" */
function manwon(v: number): string {
  const sign = v < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(v / 10000)).toLocaleString("ko-KR")}만원`;
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

  // 기준점: 권장 월령의 농장 평균 도체중
  const refWeight = best?.avgCarcassWeight ?? null;
  // 도체중이 얼마 나오느냐에 따라 남는 돈이 어떻게 달라지는지 보여줄 눈금.
  // 농장 실제 출하 도체중이 328~677kg이라 그 안쪽으로 잡는다.
  const weightLadder = Array.from(
    new Set([450, refWeight != null ? Math.round(refWeight) : 520, 600])
  ).sort((a, b) => a - b);

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
          초음파 예상등급이 있는 개체만 표시합니다. 도체중이 얼마나 나올지는 미리 알 수 없으니,{" "}
          <b>도체중별로 남는 돈</b>을 나열했습니다 — 계산은 <code>도체중 × kg당 단가 − 투자비</code> 뿐입니다.
          {refWeight != null && (
            <>
              {" "}
              가운데 <b>{Math.round(refWeight)}kg</b>은 농장 {best?.ageMonths}개월 평균 도체중입니다.
            </>
          )}{" "}
          kg당 단가는 초음파 예상등급의 지난주 음성공판장 시세입니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {scanned.map(({ cattle, latestScan, rec }) => {
            const price = rec!.best!.expectedPricePerKg;
            const invest = rec!.best!.totalInvestmentAtShip;

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
                  {` · kg당 ${formatKRW(price)} · 투자비 ${formatKRW(invest)}`}
                </div>

                {/* 도체중이 얼마 나오면 얼마 남는지 — 계산이 그대로 드러나게 */}
                <div className="border-t border-black/5 pt-2 dark:border-white/10">
                  <div className="mb-1 text-xs text-black/50 dark:text-white/50">
                    도체중이 이만큼 나오면 남는 돈
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    {weightLadder.map((w) => {
                      const profit = w * price - invest;
                      const isRef = refWeight != null && w === Math.round(refWeight);
                      return (
                        <div key={w} className="flex flex-col items-center">
                          <span
                            className={`font-mono font-semibold whitespace-nowrap tabular-nums ${
                              isRef ? "text-xl" : "text-sm text-black/60 dark:text-white/60"
                            } ${profit < 0 ? "text-red-600 dark:text-red-400" : ""}`}
                          >
                            {manwon(profit)}
                          </span>
                          <span
                            className={`mt-0.5 text-[11px] whitespace-nowrap tabular-nums ${
                              isRef
                                ? "font-semibold text-black/70 dark:text-white/70"
                                : "text-black/40 dark:text-white/40"
                            }`}
                          >
                            {w}kg{isRef && " 평균"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
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
