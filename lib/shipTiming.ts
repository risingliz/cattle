import { addMonths, calcFeedCost, calcMonthsBetween } from "./calculations";
import type { CattleWithSummary } from "./queries";
import type { Cattle, FeedCostPeriod } from "./types";

/** 월령별 통계를 신뢰하고 쓰기 위한 최소 표본 두수. */
export const MIN_SAMPLE = 3;

export interface AgeStat {
  ageMonths: number;
  count: number;
  avgCarcassWeight: number;
  avgInsfat: number | null;
  /** 1++ 등급 비율 (0~1) */
  plusPlusRate: number;
  /** 실현 판매가 ÷ 도체중. 등급 하락이 이 값에 그대로 반영된다. */
  avgPricePerKg: number;
  avgNetProfit: number;
  avgAnnualReturn: number | null;
  /** 표본이 MIN_SAMPLE 미만이면 참고용으로만 본다. */
  reliable: boolean;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function salePrice(cattle: Cattle): number | null {
  return cattle.shipment_price ?? cattle.estimated_shipment_price;
}

/**
 * 출하완료 개체들의 실적을 출하월령별로 집계한다.
 * 등급을 따로 예측하지 않고 "실현 kg당 단가"에 등급 결과가 녹아들게 한다.
 */
export function buildAgePerformance(items: CattleWithSummary[]): AgeStat[] {
  const buckets = new Map<number, { cw: number[]; insfat: number[]; pp: number; perKg: number[]; net: number[]; annual: number[] }>();

  for (const { cattle, summary } of items) {
    if (cattle.status !== "출하완료") continue;
    if (!cattle.birth_date || !cattle.shipment_date || !cattle.carcass_weight) continue;
    const sale = salePrice(cattle);
    if (sale == null || !summary || summary.netProfit == null) continue;

    const age = calcMonthsBetween(new Date(cattle.birth_date), new Date(cattle.shipment_date));
    const b = buckets.get(age) ?? { cw: [], insfat: [], pp: 0, perKg: [], net: [], annual: [] };
    b.cw.push(cattle.carcass_weight);
    if (cattle.insfat != null) b.insfat.push(cattle.insfat);
    if ((cattle.grade_nm ?? "").startsWith("1++")) b.pp += 1;
    b.perKg.push(sale / cattle.carcass_weight);
    b.net.push(summary.netProfit);
    if (summary.annualizedReturnPct != null) b.annual.push(summary.annualizedReturnPct);
    buckets.set(age, b);
  }

  return Array.from(buckets.entries())
    .map(([ageMonths, b]) => ({
      ageMonths,
      count: b.cw.length,
      avgCarcassWeight: mean(b.cw),
      avgInsfat: b.insfat.length ? mean(b.insfat) : null,
      plusPlusRate: b.pp / b.cw.length,
      avgPricePerKg: mean(b.perKg),
      avgNetProfit: mean(b.net),
      avgAnnualReturn: b.annual.length ? mean(b.annual) : null,
      reliable: b.cw.length >= MIN_SAMPLE,
    }))
    .sort((a, b) => a.ageMonths - b.ageMonths);
}

/** 표본이 충분한 월령 중 평균 순수익이 가장 높은 월령. */
export function bestAgeByNetProfit(stats: AgeStat[]): AgeStat | null {
  const usable = stats.filter((s) => s.reliable);
  if (!usable.length) return null;
  return usable.reduce((best, s) => (s.avgNetProfit > best.avgNetProfit ? s : best));
}

export interface ShipProjection {
  ageMonths: number;
  /** 그 월령이 되는 날짜 (이미 지났으면 오늘) */
  targetDate: string;
  expectedCarcassWeight: number;
  expectedPricePerKg: number;
  expectedSale: number;
  /** 오늘부터 그 시점까지 더 들어갈 사료비 */
  additionalFeedCost: number;
  expectedNetProfit: number;
  sampleCount: number;
  isPast: boolean;
}

export interface ShipRecommendation {
  currentAgeMonths: number;
  projections: ShipProjection[];
  best: ShipProjection | null;
  /** 권장 시점을 이미 지났는지 */
  overdue: boolean;
}

/**
 * 사육중 개체 한 마리의 월령별 예상 순수익을 계산한다.
 *
 *   예상 판매가   = 농장 월령별 평균 도체중 × 농장 월령별 평균 실현 kg당 단가
 *   예상 순수익   = 예상 판매가 − (현재까지 투자비 + 그 시점까지 더 들어갈 사료비)
 *
 * 개체의 등급을 추정하지 않고 농장 실적만 쓴다. 유전등급 대비 실제 등급 자료가
 * 쌓이면 그때 개체별 보정을 넣는다.
 */
export function projectShipping(
  cattle: Cattle,
  totalInvestment: number,
  stats: AgeStat[],
  feedCostPeriods: FeedCostPeriod[],
  today: Date
): ShipRecommendation | null {
  if (!cattle.birth_date) return null;

  const birth = new Date(cattle.birth_date);
  const currentAgeMonths = calcMonthsBetween(birth, today);

  const projections: ShipProjection[] = [];
  for (const stat of stats) {
    if (!stat.reliable) continue;
    if (stat.ageMonths < currentAgeMonths) continue; // 이미 지난 월령은 선택지가 아니다

    // calcMonthsBetween은 "N번째 개월"(1부터)을 돌려주므로, N개월에 접어드는 날은 출생 +(N-1)개월이다.
    // 여기서 +N개월을 쓰면 그 월령의 끝날이 되어, 이미 해당 월령인 개체가 "아직 멀었다"고 나온다.
    const reachedAt = addMonths(birth, stat.ageMonths - 1);
    const isPast = reachedAt <= today;
    const targetDate = isPast ? today : reachedAt;
    const additionalFeedCost = calcFeedCost(today, targetDate, feedCostPeriods);
    const expectedSale = stat.avgCarcassWeight * stat.avgPricePerKg;

    projections.push({
      ageMonths: stat.ageMonths,
      targetDate: targetDate.toISOString().slice(0, 10),
      expectedCarcassWeight: stat.avgCarcassWeight,
      expectedPricePerKg: stat.avgPricePerKg,
      expectedSale,
      additionalFeedCost,
      expectedNetProfit: expectedSale - (totalInvestment + additionalFeedCost),
      sampleCount: stat.count,
      isPast,
    });
  }

  if (!projections.length) return null;

  const best = projections.reduce((b, p) => (p.expectedNetProfit > b.expectedNetProfit ? p : b));
  const bestOverall = bestAgeByNetProfit(stats);

  return {
    currentAgeMonths,
    projections,
    best,
    // 농장 전체 기준 최적 월령을 이미 넘겼으면 "적기 지남"
    overdue: bestOverall != null && currentAgeMonths > bestOverall.ageMonths,
  };
}
