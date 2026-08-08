import "server-only";
import { XMLParser } from "fast-xml-parser";
import { FARMER_NAMES } from "./config";

const BASE_URL = "http://data.ekape.or.kr/openapi-data/service/user";
const FETCH_TIMEOUT_MS = 15_000;

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  parseTagValue: false,
  isArray: (name) => name === "item",
});

export class KapeApiError extends Error {
  constructor(
    message: string,
    public readonly resultCode?: string
  ) {
    super(message);
    this.name = "KapeApiError";
  }
}

function requireServiceKey(): string {
  const key = process.env.KAPE_SERVICE_KEY;
  if (!key) {
    throw new Error("KAPE_SERVICE_KEY 환경 변수가 설정되어야 합니다.");
  }
  return key;
}

interface KapeHeader {
  resultCode: string;
  resultMsg: string;
}

interface KapeParsed {
  response?: {
    header?: KapeHeader;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: { items?: { item?: any[] } };
  };
}

async function fetchXml(url: string): Promise<KapeParsed> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let text: string;
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    text = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  return parser.parse(text) as KapeParsed;
}

function assertSuccess(parsed: KapeParsed, context: string): KapeHeader {
  const header = parsed.response?.header;
  if (!header || header.resultCode !== "00") {
    throw new KapeApiError(
      `${context}: ${header?.resultMsg ?? "알 수 없는 오류"}`,
      header?.resultCode
    );
  }
  return header;
}

function ymdToIso(ymd: string): string | null {
  const digits = ymd.trim();
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export interface TraceInfo {
  birthDate: string | null;
  intakeDate: string | null;
  shipmentDate: string | null;
  deathDate: string | null;
}

/**
 * 축산물이력제 이력번호 조회: 출생일 / 입식일(양수) / 출하일(도축출하) / 폐사일.
 */
export async function fetchTraceInfo(traceNo: string): Promise<TraceInfo> {
  const serviceKey = requireServiceKey();
  const url = `${BASE_URL}/animalTrace/traceNoSearch?serviceKey=${serviceKey}&traceNo=${encodeURIComponent(traceNo)}`;

  const parsed = await fetchXml(url);
  assertSuccess(parsed, "이력번호 조회 실패");

  const items = parsed.response?.body?.items?.item ?? [];

  const birthItem = items.find((it) => it.infoType === "1");
  const intakeItem = items.find(
    (it) =>
      it.infoType === "2" && FARMER_NAMES.includes(it.farmerNm) && it.regType === "양수"
  );
  const shipmentItem = items.find(
    (it) => it.infoType === "2" && it.regType === "도축출하"
  );
  const deathItem = items.find(
    (it) => it.infoType === "2" && it.regType === "폐사"
  );

  return {
    birthDate: birthItem?.birthYmd ? ymdToIso(birthItem.birthYmd) : null,
    intakeDate: intakeItem?.regYmd ? ymdToIso(intakeItem.regYmd) : null,
    shipmentDate: shipmentItem?.regYmd ? ymdToIso(shipmentItem.regYmd) : null,
    deathDate: deathItem?.regYmd ? ymdToIso(deathItem.regYmd) : null,
  };
}

export interface GradeInfo {
  issueNo: string;
  issueDate: string;
  gradeNm: string | null;
  insfat: number | null;
  carcassWeight: number | null;
  wgrade: string | null;
  windex: number | null;
}

/**
 * 도축 등급 조회: 1) 확인서 발급번호 조회 -> 2) 등급 상세 조회.
 * 아직 도축/등급 확정 전이면 null을 반환한다 (에러 아님).
 */
export async function fetchGradeInfo(traceNo: string): Promise<GradeInfo | null> {
  const serviceKey = requireServiceKey();

  const issueUrl = `${BASE_URL}/grade/confirm/issueNo?serviceKey=${serviceKey}&animalNo=${encodeURIComponent(traceNo)}`;
  const issueParsed = await fetchXml(issueUrl);
  assertSuccess(issueParsed, "도축 확인서 발급번호 조회 실패");

  const issueItem = (issueParsed.response?.body?.items?.item ?? [])[0];
  if (!issueItem) return null;

  const issueNo = String(issueItem.issueNo).trim();
  const issueDate = String(issueItem.issueDate).trim();

  const gradeUrl = `${BASE_URL}/grade/confirm/cattle?serviceKey=${serviceKey}&issueNo=${encodeURIComponent(issueNo)}&issueDate=${encodeURIComponent(issueDate)}`;
  const gradeParsed = await fetchXml(gradeUrl);
  assertSuccess(gradeParsed, "등급 상세 조회 실패");

  const gradeItem = (gradeParsed.response?.body?.items?.item ?? [])[0];
  if (!gradeItem) return null;

  return {
    issueNo,
    issueDate,
    gradeNm: gradeItem.gradeNm ? String(gradeItem.gradeNm).trim() : null,
    insfat: gradeItem.insfat != null ? Number(gradeItem.insfat) : null,
    carcassWeight: gradeItem.weight != null ? Number(gradeItem.weight) : null,
    wgrade: gradeItem.wgrade ? String(gradeItem.wgrade).trim() : null,
    windex: gradeItem.windex != null ? Number(gradeItem.windex) : null,
  };
}
