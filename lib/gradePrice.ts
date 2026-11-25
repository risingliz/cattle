/**
 * 등급별 kg당 단가를 고를 때 쓰는 공용 규칙.
 *
 * 1++ 는 같은 등급 안에서도 근내지방도(BMS)에 따라 kg당 3천원 이상 벌어진다.
 * 그런데 공판장 전체로 보면 1++ 중 BMS 9가 가장 많아서, 등급 평균을 그대로 쓰면
 * BMS 7~8 개체의 예상가가 100만원 단위로 부풀려진다. 그래서 1++ 는 등급 평균이 아니라
 * 개체의 근내지방도에 맞는 단가를 쓴다. (1+ 이하는 공판장이 BMS를 공개하지 않아 평균뿐이다)
 */

/** 초음파 BMS를 모를 때 1++ 에 적용할 근내지방도. 농장 실적상 9는 거의 나오지 않는다. */
export const DEFAULT_PLUS_PLUS_BMS = 8;

/** 공판장이 1++ 를 세분해 공개하는 근내지방도 범위 */
const MIN_PP_BMS = 7;
const MAX_PP_BMS = 9;

export type GradePriceTable = {
  /** 등급명 -> kg당 단가 (등급 평균) */
  average: Record<string, number | null>;
  /** "1++B:8" -> kg당 단가 (1++ 전용) */
  byBms: Record<string, number | null>;
};

export type ResolvedGradePrice = {
  pricePerKg: number | null;
  /** 1++ 단가에 실제로 적용된 근내지방도. 등급 평균을 쓴 경우 null */
  bms: number | null;
  /** 초음파 측정 BMS가 아니라 기본값(8)을 끌어다 쓴 경우 true */
  assumedBms: boolean;
};

/**
 * 등급 + 초음파 BMS로 kg당 단가를 고른다.
 * 1++ 면 개체 BMS(7~9)를, 범위를 벗어나거나 모르면 BMS 8 단가를 쓴다.
 * 그 조합에 지난주 거래가 아예 없으면 등급 평균으로 되돌린다.
 */
export function resolveGradePrice(
  table: GradePriceTable,
  grade: string,
  scanBms: number | null
): ResolvedGradePrice {
  if (grade.startsWith("1++")) {
    const measured = scanBms != null && scanBms >= MIN_PP_BMS && scanBms <= MAX_PP_BMS;
    const bms = measured ? scanBms! : DEFAULT_PLUS_PLUS_BMS;
    const price = table.byBms[`${grade}:${bms}`];
    if (price != null) return { pricePerKg: price, bms, assumedBms: !measured };

    const fallback = table.byBms[`${grade}:${DEFAULT_PLUS_PLUS_BMS}`];
    if (fallback != null) {
      return { pricePerKg: fallback, bms: DEFAULT_PLUS_PLUS_BMS, assumedBms: true };
    }
  }
  return { pricePerKg: table.average[grade] ?? null, bms: null, assumedBms: false };
}
