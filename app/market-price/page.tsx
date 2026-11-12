import { Card } from "@/components/ui/Card";
import { InlineBar } from "@/components/ui/InlineBar";
import { WeeklyPriceLineChart } from "@/components/charts/WeeklyPriceLineChart";
import {
  fetchAllGradePricesPerKg,
  fetchWeeklyGradePriceHistory,
  getCurrentPartialWeek,
  getTueFriForWeeksAgo,
} from "@/lib/eumseong-api";

export const dynamic = "force-dynamic";

const GRADE = "1++B";
const WEEKS_BACK = 12;
const LONG_TERM_WEEKS_BACK = 104; // 약 2년
const CARCASS_WEIGHT_KG = 500;

/** 표에 보여줄 등급 (음성공판장 응답의 gradeNm 표기와 동일해야 한다). */
const TABLE_GRADES = ["1++A", "1++B", "1++C", "1+A", "1+B", "1+C", "1A", "1B", "1C"];

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatPct(v: number | null): string {
  if (v == null) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function formatWon(v: number | null): string {
  if (v == null) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(v))}원`;
}

function formatCarcassTotal(pricePerKg: number | null): string {
  if (pricePerKg == null) return "-";
  return formatWon(pricePerKg * CARCASS_WEIGHT_KG);
}

function pctClass(v: number | null): string {
  if (v == null) return "";
  return v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

/** "2026-11-10 ~ 11-12 (화~목)" 형태로 구간을 표기한다. */
function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const endShort = endIso.slice(5).replace("-", "-");
  return `${startIso} ~ ${endShort} (${WEEKDAY_KO[start.getDay()]}~${WEEKDAY_KO[end.getDay()]})`;
}

function diffPct(current: number | null | undefined, base: number | null | undefined): number | null {
  if (current == null || base == null || base === 0) return null;
  return ((current - base) / base) * 100;
}

export default async function MarketPricePage() {
  const today = new Date();
  const lastWeekRange = getTueFriForWeeksAgo(today, 0);
  const partialRange = getCurrentPartialWeek(today);

  // 2년치 추이 + 등급별 표를 함께 조회한다. 응답은 1시간 캐싱되므로 같은 구간은 재요청되지 않는다.
  const [fullAsc, lastWeekGrades, partialGrades] = await Promise.all([
    fetchWeeklyGradePriceHistory(GRADE, LONG_TERM_WEEKS_BACK, today, true),
    fetchAllGradePricesPerKg(lastWeekRange.start, lastWeekRange.end),
    partialRange
      ? fetchAllGradePricesPerKg(partialRange.start, partialRange.end)
      : Promise.resolve(null),
  ]);

  const withDeltas = fullAsc.map((w, i) => {
    const prevWeek = fullAsc[i - 1];
    const prevMonth = fullAsc[i - 4];
    return {
      ...w,
      wow: diffPct(w.pricePerKg, prevWeek?.pricePerKg),
      mom: diffPct(w.pricePerKg, prevMonth?.pricePerKg),
    };
  });

  const recentWithDeltas = withDeltas.slice(-WEEKS_BACK);
  const chronologicalDesc = [...recentWithDeltas].reverse();
  const known = recentWithDeltas.filter((w) => w.pricePerKg != null);
  const knownLongTerm = withDeltas.filter((w) => w.pricePerKg != null);
  const maxPrice = Math.max(1, ...known.map((w) => w.pricePerKg ?? 0));

  const currentWeek = withDeltas.at(-1)?.isPartial ? withDeltas.at(-1)! : null;
  const lastCompleted = [...withDeltas].reverse().find((w) => !w.isPartial && w.pricePerKg != null);
  const headline = currentWeek ?? lastCompleted;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">한우 거세 출하단가 (음성공판장)</h1>

      {headline?.pricePerKg != null && (
        <Card
          title={currentWeek ? `금주 ${GRADE} 단가 (진행중)` : `최근 주 ${GRADE} 단가`}
        >
          <p className="text-4xl font-semibold">
            {formatWon(headline.pricePerKg)}
            <span className="ml-2 text-base font-normal text-black/50 dark:text-white/50">/kg</span>
          </p>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            {formatRange(headline.weekStart, headline.weekEnd)} · 전주대비{" "}
            <span className={pctClass(headline.wow)}>{formatPct(headline.wow)}</span> · 전월대비{" "}
            <span className={pctClass(headline.mom)}>{formatPct(headline.mom)}</span>
          </p>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            도체중 {CARCASS_WEIGHT_KG}kg 기준 약{" "}
            <span className="font-medium">{formatCarcassTotal(headline.pricePerKg)}</span>
          </p>

          {currentWeek && lastCompleted?.pricePerKg != null && (
            <p className="mt-3 border-t border-black/5 pt-3 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
              지난주 확정{" "}
              <span className="font-medium text-black dark:text-white">
                {formatWon(lastCompleted.pricePerKg)}
              </span>
              <span className="ml-1 text-xs">
                ({formatRange(lastCompleted.weekStart, lastCompleted.weekEnd)})
              </span>
            </p>
          )}
        </Card>
      )}

      <Card title="등급별 단가">
        <p className="mb-3 text-xs text-black/50 dark:text-white/50">
          지난주 확정 구간: {formatRange(lastWeekRange.start.toISOString().slice(0, 10), lastWeekRange.end.toISOString().slice(0, 10))}
          {partialRange && (
            <>
              {" · "}금주 진행중 구간:{" "}
              {formatRange(
                partialRange.start.toISOString().slice(0, 10),
                partialRange.end.toISOString().slice(0, 10)
              )}
            </>
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/60 dark:text-white/60">
                <th className="pb-2 pr-4">등급</th>
                <th className="pb-2 pr-4">지난주</th>
                {partialGrades && <th className="pb-2 pr-4">금주 (진행중)</th>}
                {partialGrades && <th className="pb-2 pr-4">전주대비</th>}
                <th className="pb-2">{CARCASS_WEIGHT_KG}kg 환산 (지난주)</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_GRADES.map((grade) => {
                const last = lastWeekGrades.get(grade) ?? null;
                const now = partialGrades?.get(grade) ?? null;
                const delta = diffPct(now, last);
                return (
                  <tr key={grade} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 font-mono font-semibold whitespace-nowrap">{grade}</td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatWon(last)}</td>
                    {partialGrades && (
                      <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatWon(now)}</td>
                    )}
                    {partialGrades && (
                      <td className={`py-2 pr-4 whitespace-nowrap tabular-nums ${pctClass(delta)}`}>
                        {formatPct(delta)}
                      </td>
                    )}
                    <td className="py-2 whitespace-nowrap tabular-nums">{formatCarcassTotal(last)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {known.length > 0 && (
        <Card title={`최근 ${WEEKS_BACK}주 ${GRADE} 추이`}>
          <WeeklyPriceLineChart data={recentWithDeltas} carcassWeightKg={CARCASS_WEIGHT_KG} />
          {currentWeek && (
            <p className="mt-2 text-xs text-black/50 dark:text-white/50">
              점선 구간은 아직 끝나지 않은 금주로, 거래된 날짜까지만 평균한 값입니다.
            </p>
          )}
        </Card>
      )}

      {knownLongTerm.length > 0 && (
        <Card title={`최근 ${Math.round(LONG_TERM_WEEKS_BACK / 52)}년 ${GRADE} 추이`}>
          <WeeklyPriceLineChart
            data={withDeltas}
            showAllPoints={false}
            xLabelEvery={8}
            xLabelFormat="month"
            carcassWeightKg={CARCASS_WEIGHT_KG}
          />
        </Card>
      )}

      <Card title={`최근 ${WEEKS_BACK}주 ${GRADE} 상세`}>
        {known.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">해당 기간 거래 데이터가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">주 (화~금)</th>
                  <th className="pb-2 pr-4">추이</th>
                  <th className="pb-2 pr-4">kg당 단가</th>
                  <th className="pb-2 pr-4">{CARCASS_WEIGHT_KG}kg 환산</th>
                  <th className="pb-2 pr-4">전주대비</th>
                  <th className="pb-2">전월대비</th>
                </tr>
              </thead>
              <tbody>
                {chronologicalDesc.map((w) => (
                  <tr key={w.weekStart} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {w.weekStart} ~ {w.weekEnd.slice(5)}
                      {w.isPartial && (
                        <span className="ml-1 rounded bg-black/5 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-black/60 dark:bg-white/10 dark:text-white/60">
                          진행중
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {w.pricePerKg != null ? (
                        <InlineBar value={w.pricePerKg} max={maxPrice} />
                      ) : (
                        <span className="text-black/30 dark:text-white/30">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatWon(w.pricePerKg)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                      {formatCarcassTotal(w.pricePerKg)}
                    </td>
                    <td className={`py-2 pr-4 whitespace-nowrap tabular-nums ${pctClass(w.wow)}`}>
                      {formatPct(w.wow)}
                    </td>
                    <td className={`py-2 whitespace-nowrap tabular-nums ${pctClass(w.mom)}`}>
                      {formatPct(w.mom)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-black/50 dark:text-white/50">
        데이터 출처: 축산물품질평가원 음성공판장(한우 거세 기준). 경매는 화~금에 열리며, 확정 주는 화~금 4일
        평균입니다. &quot;진행중&quot;으로 표시된 금주는 거래가 끝난 날짜까지만 평균한 값이라 남은 거래일에 따라
        바뀔 수 있습니다.
      </p>
    </div>
  );
}
