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
