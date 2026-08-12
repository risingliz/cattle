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

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
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

export interface YearlyCashFlow {
  year: number;
  intakeCost: number;
  feedCost: number;
  extraCost: number;
  shipmentRevenue: number;
  /** 출하대금 수입 - (입식비용 + 사육비 + 기타비용) */
  netCashFlow: number;
}

/**
 * 연도별 실제 현금흐름을 계산한다 (개체의 출하 여부와 무관하게, 그 해에 실제로 오간 돈 기준).
 * - 입식비용: intake_date가 속한 연도에 전액 반영
 * - 사육비: intake_date ~ (출하일/폐사일/오늘) 구간을 연도 경계로 잘라, 각 연도 조각만큼만 반영 (사육중 개체도 포함)
 * - 기타비용: cost_date가 속한 연도에 반영
 * - 출하대금: shipment_date가 속한 연도에 (shipment_price ?? estimated_shipment_price) 반영 (폐사는 수익 없음)
 */
export function calcYearlyCashFlow(
  cattleList: Cattle[],
  extraCostsByCattleId: Map<string, ExtraCost[]>,
  feedCostPeriods: FeedCostPeriod[],
  today: Date
): YearlyCashFlow[] {
  const byYear = new Map<number, YearlyCashFlow>();

  function bucket(year: number): YearlyCashFlow {
    let entry = byYear.get(year);
    if (!entry) {
      entry = { year, intakeCost: 0, feedCost: 0, extraCost: 0, shipmentRevenue: 0, netCashFlow: 0 };
      byYear.set(year, entry);
    }
    return entry;
  }

  for (const cattle of cattleList) {
    if (!cattle.intake_date) continue;
    const intakeDate = new Date(cattle.intake_date);

    if (cattle.intake_price != null) {
      bucket(intakeDate.getFullYear()).intakeCost += cattle.intake_price;
    }

    const exitDateStr =
      cattle.status === "출하완료"
        ? cattle.shipment_date
        : cattle.status === "폐사"
          ? cattle.death_date
          : today.toISOString().slice(0, 10);
    const exitDate = exitDateStr ? new Date(exitDateStr) : today;

    const startYear = intakeDate.getFullYear();
    const endYear = exitDate.getFullYear();
    for (let y = startYear; y <= endYear; y++) {
      const yearStart = new Date(y, 0, 1);
      const yearEndExclusive = new Date(y + 1, 0, 1);
      const overlapStart = intakeDate > yearStart ? intakeDate : yearStart;
      const overlapEnd = exitDate < yearEndExclusive ? exitDate : yearEndExclusive;
      const feedInYear = calcFeedCost(overlapStart, overlapEnd, feedCostPeriods);
      if (feedInYear > 0) bucket(y).feedCost += feedInYear;
    }

    for (const ec of extraCostsByCattleId.get(cattle.id) ?? []) {
      bucket(new Date(ec.cost_date).getFullYear()).extraCost += ec.amount;
    }

    if (cattle.status === "출하완료" && cattle.shipment_date) {
      const price = cattle.shipment_price ?? cattle.estimated_shipment_price;
      if (price != null) {
        bucket(new Date(cattle.shipment_date).getFullYear()).shipmentRevenue += price;
      }
    }
  }

  for (const entry of byYear.values()) {
    entry.netCashFlow = entry.shipmentRevenue - (entry.intakeCost + entry.feedCost + entry.extraCost);
  }

  return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
}

export interface MonthlyInBarnInvestment {
  yearMonth: string;
  totalInvestment: number;
  headCount: number;
}

/**
 * 매월 말일(가장 최근 달은 오늘) 시점 기준, 그때 사육장에 있던(입식했고 아직 출하/폐사 전인) 개체들의
 * 누적 투자비용(입식가격 + 그 시점까지의 사료비 + 그 시점까지의 기타비용) 합계를 계산한다.
 * 실시간 투자비 흐름(늘어나는 추세)을 보기 위한 스톡(잔액) 지표 — calcYearlyCashFlow(흐름 지표)와는 다른 개념.
 */
export function calcMonthlyInBarnInvestment(
  cattleList: Cattle[],
  extraCostsByCattleId: Map<string, ExtraCost[]>,
  feedCostPeriods: FeedCostPeriod[],
  startDate: Date,
  endDate: Date
): MonthlyInBarnInvestment[] {
  const results: MonthlyInBarnInvestment[] = [];
  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= last) {
    const isCurrentMonth =
      cursor.getFullYear() === endDate.getFullYear() && cursor.getMonth() === endDate.getMonth();
    const snapshotDate = isCurrentMonth ? endDate : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    let totalInvestment = 0;
    let headCount = 0;

    for (const cattle of cattleList) {
      if (!cattle.intake_date || cattle.intake_price == null) continue;
      const intakeDate = new Date(cattle.intake_date);
      if (intakeDate > snapshotDate) continue;

      const exitDateStr =
        cattle.status === "출하완료" ? cattle.shipment_date : cattle.status === "폐사" ? cattle.death_date : null;
      if (exitDateStr && new Date(exitDateStr) <= snapshotDate) continue;

      const feedCost = calcFeedCost(intakeDate, snapshotDate, feedCostPeriods);
      const extraCostAsOf = (extraCostsByCattleId.get(cattle.id) ?? [])
        .filter((ec) => new Date(ec.cost_date) <= snapshotDate)
        .reduce((sum, ec) => sum + ec.amount, 0);

      totalInvestment += cattle.intake_price + feedCost + extraCostAsOf;
      headCount += 1;
    }

    results.push({
      yearMonth: `${snapshotDate.getFullYear()}.${String(snapshotDate.getMonth() + 1).padStart(2, "0")}`,
      totalInvestment,
      headCount,
    });

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return results;
}
