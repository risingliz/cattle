export function formatKRW(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;
}

export function formatDate(value: string | null | undefined): string {
  return value ?? "-";
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}%`;
}

export function formatInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

/** 사육 개월/일수를 "N개월 (D일)" 형태로 표시. */
export function formatMonthsAndDays(
  months: number | null | undefined,
  days: number | null | undefined
): string {
  if (months == null || days == null || Number.isNaN(months) || Number.isNaN(days)) return "-";
  return `${months}개월 (${formatInt(days)}일)`;
}

/**
 * 이력번호에서 관리번호(마지막 자리를 제외한 나머지의 끝 4자리)를 추출한다.
 * 예: "002213948436" -> "4843" (마지막 "6"을 제외한 "00221394843"의 끝 4자리)
 */
export function getManagementNumber(traceNo: string): string {
  const withoutLastChar = traceNo.slice(0, -1);
  return withoutLastChar.slice(-4) || traceNo;
}

export type GrowthStage = "육성비육" | "비육전기" | "비육후기" | "출하대기";

/** 생후 월령 기준 사육 단계를 구분한다: ~13개월 육성비육, ~21개월 비육전기, ~28개월 비육후기, 29개월~ 출하대기. */
export function getGrowthStage(ageMonths: number): GrowthStage {
  if (ageMonths <= 13) return "육성비육";
  if (ageMonths <= 21) return "비육전기";
  if (ageMonths <= 28) return "비육후기";
  return "출하대기";
}
