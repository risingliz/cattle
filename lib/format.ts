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

/** 유전등급 코드를 구성하는 4대 형질의 순서 (한국종축개량협회 자료 표기 순). */
export const EBV_TRAIT_ORDER = ["냉도체중", "등심단면적", "등지방두께", "근내지방도"] as const;

export interface EbvGrades {
  ebv_carcass_weight_grade: string | null;
  ebv_eye_muscle_area_grade: string | null;
  ebv_back_fat_grade: string | null;
  ebv_marbling_grade: string | null;
}

/**
 * 4대 형질 유전등급을 "AABC" 한 덩어리로 만든다 (냉도체중·등심단면적·등지방두께·근내지방도 순).
 * 등급이 하나도 없으면 빈 문자열, 일부만 없으면 그 자리는 "·".
 */
export function getEbvGradeCode(cattle: EbvGrades): string {
  const grades = [
    cattle.ebv_carcass_weight_grade,
    cattle.ebv_eye_muscle_area_grade,
    cattle.ebv_back_fat_grade,
    cattle.ebv_marbling_grade,
  ];
  if (grades.every((g) => !g)) return "";
  return grades.map((g) => g ?? "·").join("");
}

/**
 * 이력번호에서 관리번호(마지막 자리를 제외한 나머지의 끝 4자리)를 추출한다.
 * 예: "002213948436" -> "4843" (마지막 "6"을 제외한 "00221394843"의 끝 4자리)
 */
export function getManagementNumber(traceNo: string): string {
  const withoutLastChar = traceNo.slice(0, -1);
  return withoutLastChar.slice(-4) || traceNo;
}
