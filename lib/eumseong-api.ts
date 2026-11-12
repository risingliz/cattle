import "server-only";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "http://data.ekape.or.kr/openapi-data/service/user/grade/auct";
const FETCH_TIMEOUT_MS = 15_000;

// 이 농장이 사육하는 축종 고정값 (한우/거세)
const BREED_CD = "024001";
const SEX_CD = "025003";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  parseTagValue: false,
  isArray: (name) => name === "item",
});

function requireServiceKey(): string {
  const key = process.env.KAPE_SERVICE_KEY;
  if (!key) {
    throw new Error("KAPE_SERVICE_KEY 환경 변수가 설정되어야 합니다.");
  }
  return key;
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * 기준일이 속한 주의 "이전 주" 화요일~금요일 구간을 계산한다.
 * 예: 기준일이 수요일이면 그 주의 월요일을 구하고, 그보다 7일 전 월요일 기준 화/금을 반환.
 */
export function getPreviousWeekTueFri(referenceDate: Date): { start: Date; end: Date } {
  const day = referenceDate.getDay(); // 0=일 ... 6=토
  const isoDay = day === 0 ? 7 : day; // 1=월 ... 7=일

  const thisMonday = new Date(referenceDate);
  thisMonday.setDate(referenceDate.getDate() - (isoDay - 1));

  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(thisMonday.getDate() - 7);

  const start = new Date(prevMonday);
  start.setDate(prevMonday.getDate() + 1); // 화요일

  const end = new Date(prevMonday);
  end.setDate(prevMonday.getDate() + 4); // 금요일

  return { start, end };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchXml(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let text: string;
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } });
    text = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  return parser.parse(text);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assertSuccess(parsed: any, context: string) {
  const header = parsed?.response?.header;
  if (!header || header.resultCode !== "00") {
    throw new Error(`${context}: ${header?.resultMsg ?? "알 수 없는 오류"}`);
  }
}

/**
 * 음성공판장(c_0513) 등급별 평균 낙찰가(원/kg)를 조회한다.
 * "1++" 등급은 근내지방도(bmsNo)별로 가격 편차가 커서 cattleDetail(bmsNo별 세분화)을 사용하고,
 * 그 외 등급은 등급 단일 평균을 제공하는 cattle 엔드포인트를 사용한다.
 * 해당 구간에 음성공판장 거래 데이터가 없으면 null을 반환한다 (에러 아님).
 */
export async function fetchEumseongGradePricePerKg(
  gradeNm: string,
  insfat: number | null,
  start: Date,
  end: Date
): Promise<number | null> {
  const serviceKey = requireServiceKey();
  const startYmd = ymd(start);
  const endYmd = ymd(end);
  const isPlusPlusGrade = gradeNm.startsWith("1++");

  const endpoint = isPlusPlusGrade ? "cattleDetail" : "cattle";
  const url = `${BASE_URL}/${endpoint}?serviceKey=${serviceKey}&startYmd=${startYmd}&endYmd=${endYmd}&breedCd=${BREED_CD}&sexCd=${SEX_CD}&qgradeYn=N&defectIncludeYn=N`;

  const parsed = await fetchXml(url);
  assertSuccess(parsed, "음성공판장 가격 조회 실패");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = parsed?.response?.body?.items?.item ?? [];

  const match = isPlusPlusGrade
    ? items.find(
        (it) => it.gradeNm === gradeNm && insfat != null && String(it.bmsNo) === String(insfat)
      )
    : items.find((it) => it.gradeNm === gradeNm);

  const raw = match?.c_0513Amt;
  if (raw == null) return null;
  const price = Number(raw);
  return Number.isFinite(price) ? price : null;
}

/**
 * 출하일 직전 주부터 최대 maxWeeksBack주까지 거슬러 올라가며 등급별 낙찰가(원/kg)를 찾는다.
 * 설·추석 연휴 등으로 직전 주에 음성공판장 거래가 아예 없는 경우(단가 null)를 위한 폴백이며,
 * 가장 최근의 유효한 주 단가를 쓰기 위해 순차로 조회하고 값을 찾는 즉시 중단한다.
 * (직전 주에 데이터가 있는 정상 케이스에서는 API를 1회만 호출한다.)
 */
export async function fetchEumseongGradePricePerKgWithFallback(
  gradeNm: string,
  insfat: number | null,
  shipmentDate: Date,
  maxWeeksBack = 4
): Promise<number | null> {
  const { start, end } = getPreviousWeekTueFri(shipmentDate);

  for (let weeksBack = 0; weeksBack < maxWeeksBack; weeksBack++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - weeksBack * 7);
    const weekEnd = new Date(end);
    weekEnd.setDate(end.getDate() - weeksBack * 7);

    try {
      const pricePerKg = await fetchEumseongGradePricePerKg(gradeNm, insfat, weekStart, weekEnd);
      if (pricePerKg != null) return pricePerKg;
    } catch {
      // 특정 주 조회 실패는 건너뛰고 그 이전 주로 계속 시도한다.
    }
  }

  return null;
}

/**
 * 해당 구간의 음성공판장 등급별 평균 낙찰가(원/kg)를 한 번의 요청으로 모두 조회한다.
 * API 응답 한 건에 모든 등급이 들어있으므로 등급마다 따로 요청할 필요가 없다.
 * 거래가 없는 등급은 null로 담긴다.
 */
export async function fetchAllGradePricesPerKg(
  start: Date,
  end: Date
): Promise<Map<string, number | null>> {
  const serviceKey = requireServiceKey();
  const url = `${BASE_URL}/cattle?serviceKey=${serviceKey}&startYmd=${ymd(start)}&endYmd=${ymd(end)}&breedCd=${BREED_CD}&sexCd=${SEX_CD}&qgradeYn=N&defectIncludeYn=N`;

  const parsed = await fetchXml(url);
  assertSuccess(parsed, "음성공판장 등급 평균가 조회 실패");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = parsed?.response?.body?.items?.item ?? [];

  const result = new Map<string, number | null>();
  for (const it of items) {
    const grade = typeof it.gradeNm === "string" ? it.gradeNm.trim() : null;
    if (!grade) continue;
    const price = it.c_0513Amt != null ? Number(it.c_0513Amt) : NaN;
    result.set(grade, Number.isFinite(price) ? price : null);
  }
  return result;
}

/**
 * 음성공판장 등급 단일 평균 낙찰가(원/kg)를 조회한다 (근내지방도 세분화 없이, cattle 엔드포인트만 사용).
 * 시세 추이처럼 특정 개체가 아니라 등급 자체의 시장 참고가를 볼 때 사용한다.
 */
export async function fetchGradeAveragePricePerKg(
  gradeNm: string,
  start: Date,
  end: Date
): Promise<number | null> {
  const prices = await fetchAllGradePricesPerKg(start, end);
  return prices.get(gradeNm) ?? null;
}

/** 기준일 기준 몇 주 전(weeksAgo)의 화~금 구간을 계산한다. 0주 전은 "가장 최근에 끝난" 화~금 주. */
export function getTueFriForWeeksAgo(referenceDate: Date, weeksAgo: number): { start: Date; end: Date } {
  const day = referenceDate.getDay();
  const isoDay = day === 0 ? 7 : day;
  const thisMonday = new Date(referenceDate);
  thisMonday.setDate(referenceDate.getDate() - (isoDay - 1));

  const thisFriday = new Date(thisMonday);
  thisFriday.setDate(thisMonday.getDate() + 4);

  const baseMonday = new Date(thisMonday);
  if (referenceDate < thisFriday) {
    // 이번 주가 아직 금요일 전이면(거래 미완료) 지난 주를 0주 전으로 삼는다.
    baseMonday.setDate(baseMonday.getDate() - 7);
  }
  baseMonday.setDate(baseMonday.getDate() - weeksAgo * 7);

  const start = new Date(baseMonday);
  start.setDate(baseMonday.getDate() + 1);
  const end = new Date(baseMonday);
  end.setDate(baseMonday.getDate() + 4);

  return { start, end };
}

/**
 * 아직 끝나지 않은 "금주"의 거래 구간(화요일 ~ 기준일)을 계산한다.
 * 이번 주가 이미 금요일까지 끝났으면(= getTueFriForWeeksAgo의 0주차가 곧 이번 주) null,
 * 아직 화요일 전이어서 경매일이 하루도 없으면 null을 반환한다.
 */
export function getCurrentPartialWeek(referenceDate: Date): { start: Date; end: Date } | null {
  const day = referenceDate.getDay();
  const isoDay = day === 0 ? 7 : day;
  const thisMonday = new Date(referenceDate);
  thisMonday.setDate(referenceDate.getDate() - (isoDay - 1));

  const thisTuesday = new Date(thisMonday);
  thisTuesday.setDate(thisMonday.getDate() + 1);
  const thisFriday = new Date(thisMonday);
  thisFriday.setDate(thisMonday.getDate() + 4);

  if (referenceDate >= thisFriday) return null; // 이미 완료된 주 — 0주차가 그대로 커버한다
  if (referenceDate < thisTuesday) return null; // 월요일: 아직 경매일 없음

  return { start: thisTuesday, end: referenceDate };
}

export interface WeeklyGradePrice {
  weekStart: string;
  weekEnd: string;
  pricePerKg: number | null;
  /** 아직 주가 끝나지 않아 일부 거래일만 반영된 값인지. */
  isPartial: boolean;
}

const HISTORY_FETCH_CONCURRENCY = 10;

/** items를 최대 limit개씩 동시에 처리한다 (원본 API에 한 번에 너무 많은 동시 요청을 보내지 않기 위함). */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * 최근 weeksBack주(가장 오래된 것부터)의 등급 평균 낙찰가(원/kg) 추이를 조회한다.
 * includeCurrentWeek가 true면 아직 진행 중인 금주의 부분 평균을 맨 뒤에 덧붙인다
 * (isPartial=true). 금주에 거래가 아직 없으면 붙이지 않는다.
 */
export async function fetchWeeklyGradePriceHistory(
  gradeNm: string,
  weeksBack: number,
  referenceDate: Date,
  includeCurrentWeek = false
): Promise<WeeklyGradePrice[]> {
  const weekOffsets = Array.from({ length: weeksBack }, (_, i) => weeksBack - 1 - i);

  const results = await mapWithConcurrency(weekOffsets, HISTORY_FETCH_CONCURRENCY, async (weeksAgo) => {
    const { start, end } = getTueFriForWeeksAgo(referenceDate, weeksAgo);
    let pricePerKg: number | null = null;
    try {
      pricePerKg = await fetchGradeAveragePricePerKg(gradeNm, start, end);
    } catch {
      pricePerKg = null;
    }
    return {
      weekStart: start.toISOString().slice(0, 10),
      weekEnd: end.toISOString().slice(0, 10),
      pricePerKg,
      isPartial: false,
    };
  });

  if (!includeCurrentWeek) return results;

  const partial = getCurrentPartialWeek(referenceDate);
  if (!partial) return results;

  let partialPrice: number | null = null;
  try {
    partialPrice = await fetchGradeAveragePricePerKg(gradeNm, partial.start, partial.end);
  } catch {
    partialPrice = null;
  }
  if (partialPrice == null) return results;

  results.push({
    weekStart: partial.start.toISOString().slice(0, 10),
    weekEnd: partial.end.toISOString().slice(0, 10),
    pricePerKg: partialPrice,
    isPartial: true,
  });

  return results;
}
