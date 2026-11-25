import { CaptureCard } from "@/components/ui/CaptureCard";
import { WeeklyPriceLineChart } from "@/components/charts/WeeklyPriceLineChart";
import { todayStamp } from "@/lib/capture";
import {
  fetchAllGradeDetailPricesPerKg,
  fetchAllGradePricesPerKg,
  fetchWeeklyGradePriceHistory,
  getCurrentPartialWeek,
  getTueFriForWeeksAgo,
  type GradeDetailPrice,
} from "@/lib/eumseong-api";

export const dynamic = "force-dynamic";

const GRADE = "1++B";
/**
 * 추이 그래프의 기준 근내지방도. 등급 평균은 그 주에 BMS 9가 많이 나왔는지에 따라 흔들려서
 * 시세 자체의 흐름을 보기 어렵다. 이 농장 소는 BMS 9까지는 잘 안 나오므로 8로 고정한다.
 */
const GRADE_BMS = 8;
const GRADE_LABEL = `${GRADE} BMS${GRADE_BMS}`;
const WEEKS_BACK = 12;
const LONG_TERM_WEEKS_BACK = 104; // 약 2년
const CARCASS_WEIGHT_KG = 500;

/** 표에 보여줄 등급 (음성공판장 응답의 gradeNm 표기와 동일해야 한다). */
const TABLE_GRADES = ["1++A", "1++B", "1++C", "1+A", "1+B", "1+C", "1A", "1B", "1C"];

/** 1++ 안에서 가격 차가 크므로 근내지방도별로 쪼개 보여준다. 높은 쪽이 비싸서 9→7 순. */
const BMS_NOS = [9, 8, 7];

/** 저장한 이미지 아래에 붙는 출처 (밖으로 공유될 수 있으므로 어디 숫자인지 적어둔다) */
const CAPTION = "출처: 축산물품질평가원 음성공판장 · 한우 거세 기준";

type PriceRow = {
  key: string;
  grade: string;
  /** 하위 행(근내지방도별)이면 BMS 번호, 등급 평균 행이면 null */
  bms: number | null;
  last: number | null;
  now: number | null;
  count: number | null;
};

function detailOf(
  map: Map<string, GradeDetailPrice> | null,
  grade: string,
  bms: number
): GradeDetailPrice | null {
  return map?.get(`${grade}:${bms}`) ?? null;
}

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
  const [fullAsc, lastWeekGrades, partialGrades, lastWeekDetail, partialDetail] = await Promise.all([
    fetchWeeklyGradePriceHistory(GRADE, LONG_TERM_WEEKS_BACK, today, true, GRADE_BMS),
    fetchAllGradePricesPerKg(lastWeekRange.start, lastWeekRange.end),
    partialRange
      ? fetchAllGradePricesPerKg(partialRange.start, partialRange.end)
      : Promise.resolve(null),
    fetchAllGradeDetailPricesPerKg(lastWeekRange.start, lastWeekRange.end).catch(() => null),
    partialRange
      ? fetchAllGradeDetailPricesPerKg(partialRange.start, partialRange.end).catch(() => null)
      : Promise.resolve(null),
  ]);

  // 1++ 는 등급 평균 아래에 근내지방도별 행을 덧붙인다.
  const priceRows: PriceRow[] = TABLE_GRADES.flatMap((grade) => {
    const main: PriceRow = {
      key: grade,
      grade,
      bms: null,
      last: lastWeekGrades.get(grade) ?? null,
      now: partialGrades?.get(grade) ?? null,
      count: null,
    };
    if (!grade.startsWith("1++")) return [main];

    const subs = BMS_NOS.map((bms) => {
      const last = detailOf(lastWeekDetail, grade, bms);
      const now = detailOf(partialDetail, grade, bms);
      return {
        key: `${grade}:${bms}`,
        grade,
        bms,
        last: last?.pricePerKg ?? null,
        now: now?.pricePerKg ?? null,
        count: last?.count ?? null,
      };
    }).filter((r) => r.last != null || r.now != null);

    return [main, ...subs];
  });

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

  const currentWeek = withDeltas.at(-1)?.isPartial ? withDeltas.at(-1)! : null;
  const lastCompleted = [...withDeltas].reverse().find((w) => !w.isPartial && w.pricePerKg != null);
  const headline = currentWeek ?? lastCompleted;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">한우 거세 출하단가 (음성공판장)</h1>

      {headline?.pricePerKg != null && (
        <CaptureCard
          title={currentWeek ? `금주 ${GRADE_LABEL} 단가 (진행중)` : `최근 주 ${GRADE_LABEL} 단가`}
          fileName={`한우시세_${GRADE}_BMS${GRADE_BMS}_${todayStamp()}`}
          caption={CAPTION}
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
        </CaptureCard>
      )}

      <CaptureCard
        title="등급별 단가"
        fileName={`등급별시세_${todayStamp()}`}
        caption={CAPTION}
      >
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
              {priceRows.map((row) => {
                const delta = diffPct(row.now, row.last);
                const isSub = row.bms != null;
                const isChartBasis = row.grade === GRADE && row.bms === GRADE_BMS;
                return (
                  <tr
                    key={row.key}
                    className={`${isSub ? "border-t border-dotted border-black/5 dark:border-white/10" : "border-t border-black/10 dark:border-white/20"} ${
                      isChartBasis ? "bg-black/[0.03] dark:bg-white/[0.07]" : ""
                    }`}
                  >
                    <td
                      className={`py-2 pr-4 whitespace-nowrap ${
                        isSub ? "pl-3 text-xs" : "font-mono font-semibold"
                      }`}
                    >
                      {isSub ? (
                        <span className="text-black/60 dark:text-white/60">
                          <span className="font-mono tabular-nums">BMS {row.bms}</span>
                          {row.count != null && (
                            <span className="ml-1 text-black/40 tabular-nums dark:text-white/40">
                              {row.count.toLocaleString("ko-KR")}두
                            </span>
                          )}
                          {isChartBasis && (
                            <span className="ml-1.5 rounded bg-black px-1 py-0.5 text-[10px] leading-none font-semibold text-white dark:bg-white dark:text-black">
                              그래프 기준
                            </span>
                          )}
                        </span>
                      ) : (
                        row.grade
                      )}
                    </td>
                    <td
                      className={`py-2 pr-4 whitespace-nowrap tabular-nums ${isSub ? "text-xs text-black/60 dark:text-white/60" : ""}`}
                    >
                      {formatWon(row.last)}
                    </td>
                    {partialGrades && (
                      <td
                        className={`py-2 pr-4 whitespace-nowrap tabular-nums ${isSub ? "text-xs text-black/60 dark:text-white/60" : ""}`}
                      >
                        {formatWon(row.now)}
                      </td>
                    )}
                    {partialGrades && (
                      <td
                        className={`py-2 pr-4 whitespace-nowrap tabular-nums ${isSub ? "text-xs" : ""} ${pctClass(delta)}`}
                      >
                        {formatPct(delta)}
                      </td>
                    )}
                    <td
                      className={`py-2 whitespace-nowrap tabular-nums ${isSub ? "text-xs text-black/60 dark:text-white/60" : ""}`}
                    >
                      {formatCarcassTotal(row.last)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-black/50 dark:text-white/50">
          1++ 는 같은 등급 안에서도 근내지방도(BMS)에 따라 값이 크게 갈려서 7/8/9로 나눠 적었습니다. 두수는
          그 주 음성공판장에서 실제로 거래된 마릿수입니다. 1+ 이하는 공판장이 근내지방도를 따로 공개하지
          않아 등급 평균만 있습니다.
        </p>
      </CaptureCard>

      {known.length > 0 && (
        <CaptureCard
          title={`최근 ${WEEKS_BACK}주 ${GRADE_LABEL} 추이`}
          fileName={`시세추이_${WEEKS_BACK}주_${todayStamp()}`}
          caption={CAPTION}
        >
          <WeeklyPriceLineChart data={recentWithDeltas} carcassWeightKg={CARCASS_WEIGHT_KG} />
          {currentWeek && (
            <p className="mt-2 text-xs text-black/50 dark:text-white/50">
              점선 구간은 아직 끝나지 않은 금주로, 거래된 날짜까지만 평균한 값입니다.
            </p>
          )}
        </CaptureCard>
      )}

      {knownLongTerm.length > 0 && (
        <CaptureCard
          title={`최근 ${Math.round(LONG_TERM_WEEKS_BACK / 52)}년 ${GRADE_LABEL} 추이`}
          fileName={`시세추이_${Math.round(LONG_TERM_WEEKS_BACK / 52)}년_${todayStamp()}`}
          caption={CAPTION}
        >
          <WeeklyPriceLineChart
            data={withDeltas}
            showAllPoints={false}
            xLabelEvery={8}
            xLabelFormat="month"
            carcassWeightKg={CARCASS_WEIGHT_KG}
          />
        </CaptureCard>
      )}

      <CaptureCard
        title={`최근 ${WEEKS_BACK}주 ${GRADE_LABEL} 상세`}
        fileName={`시세상세_${WEEKS_BACK}주_${todayStamp()}`}
        caption={CAPTION}
      >
        {known.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">해당 기간 거래 데이터가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">주 (화~금)</th>
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
      </CaptureCard>

      <p className="text-xs text-black/50 dark:text-white/50">
        데이터 출처: 축산물품질평가원 음성공판장(한우 거세 기준). 경매는 화~금에 열리며, 확정 주는 화~금 4일
        평균입니다. &quot;진행중&quot;으로 표시된 금주는 거래가 끝난 날짜까지만 평균한 값이라 남은 거래일에 따라
        바뀔 수 있습니다. 추이 그래프는 {GRADE} 중 <b>BMS {GRADE_BMS}</b> 기준입니다 — 등급 평균은 그 주에
        BMS 9가 얼마나 나왔는지에 따라 흔들려서, 시세 자체의 흐름을 보려면 근내지방도를 고정하는 편이 낫습니다.
      </p>
    </div>
  );
}
