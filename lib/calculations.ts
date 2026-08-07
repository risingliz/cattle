import { differenceInCalendarDays } from "date-fns";
import type { Cattle, ExtraCost, FeedCostPeriod } from "./types";

/**
 * 기간별 일별 사육비 이력을 반영해 [intakeDate, endDate) 구간의 사료비 총액을 계산한다.
 * 각 기간의 유효 구간은 [start_date, 다음 기간.start_date) 이며 마지막 기간은 endDate까지 적용된다.
 */
export function calcFeedCost(
  intakeDate: Date,
  endDate: Date,
  periods: FeedCostPeriod[]
): number {
  if (periods.length === 0 || endDate <= intakeDate) return 0;

  const sorted = [...periods].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  );

  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    const periodStart = new Date(sorted[i].start_date);
    const periodEnd =
      i + 1 < sorted.length ? new Date(sorted[i + 1].start_date) : endDate;

    const overlapStart = periodStart > intakeDate ? periodStart : intakeDate;
    const overlapEnd = periodEnd < endDate ? periodEnd : endDate;

    const days = differenceInCalendarDays(overlapEnd, overlapStart);
    if (days > 0) {
      total += days * sorted[i].daily_rate;
    }
  }
  return total;
}

/**
 * startDate부터 endDate까지 경과한 "개월 차수"를 계산한다 (달력 기준, 월령 계산 방식).
 * 매월 startDate와 같은 날짜를 지나야 다음 개월로 넘어간다.
 * 예: 3/22 시작 -> 8/22까지는 5개월, 8/23부터 6개월.
 */
export function calcMonthsBetween(startDate: Date, endDate: Date): number {
  let months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  if (endDate.getDate() <= startDate.getDate()) months -= 1;
  return Math.max(months + 1, 0);
}

export interface ProfitabilitySummary {
  daysHeld: number;
  monthsHeld: number;
  feedCost: number;
  extraCostTotal: number;
  totalInvestment: number;
  /** 출하완료: 순수익. 폐사: -totalInvestment(전액 손실). 사육중: null. */
  netProfit: number | null;
  /** 출하완료 개체만 계산됨. */
  annualizedReturnPct: number | null;
  /** 출하가격이 없어 음성공판장 등급별 낙찰가 기반 추정값으로 계산했는지 여부. */
  usedEstimatedPrice: boolean;
}

/**
 * 개체의 투자비용/수익성을 계산한다.
 * - 사육중: endDate=오늘, 누적 투자비용만 계산 (수익률 없음)
 * - 출하완료: endDate=출하일, 순수익 + 연환산 수익률 계산
 * - 폐사: endDate=폐사일, 총 투자비용을 전액 손실로 처리 (수익률 계산 안 함)
 */
export function calcCattleProfitability(
  cattle: Cattle,
  extraCosts: ExtraCost[],
  feedCostPeriods: FeedCostPeriod[]
): ProfitabilitySummary | null {
  if (!cattle.intake_date || cattle.intake_price == null) return null;

  const intakeDate = new Date(cattle.intake_date);
  const endDateStr =
    cattle.status === "출하완료"
      ? cattle.shipment_date
      : cattle.status === "폐사"
        ? cattle.death_date
        : new Date().toISOString().slice(0, 10);

  if (!endDateStr) return null;
  const endDate = new Date(endDateStr);

  const feedCost = calcFeedCost(intakeDate, endDate, feedCostPeriods);
  const extraCostTotal = extraCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalInvestment = cattle.intake_price + feedCost + extraCostTotal;
  const daysHeld = Math.max(differenceInCalendarDays(endDate, intakeDate), 0);
  const monthsHeld = calcMonthsBetween(intakeDate, endDate);

  let netProfit: number | null = null;
  let annualizedReturnPct: number | null = null;
  let usedEstimatedPrice = false;

  if (cattle.status === "출하완료") {
    const effectivePrice = cattle.shipment_price ?? cattle.estimated_shipment_price;
    if (effectivePrice != null) {
      usedEstimatedPrice = cattle.shipment_price == null;
      netProfit = effectivePrice - totalInvestment;
      if (daysHeld > 0 && totalInvestment > 0) {
        annualizedReturnPct =
          (netProfit / totalInvestment) * (365 / daysHeld) * 100;
      }
    }
  } else if (cattle.status === "폐사") {
    netProfit = -totalInvestment;
  }

  return {
    daysHeld,
    monthsHeld,
    feedCost,
    extraCostTotal,
    totalInvestment,
    netProfit,
    annualizedReturnPct,
    usedEstimatedPrice,
  };
}
