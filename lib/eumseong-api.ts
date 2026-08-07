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
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
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
