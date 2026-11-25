"use client";

import Link from "next/link";
import { useState } from "react";
import { formatKRW, getManagementNumber } from "@/lib/format";
import {
  DEFAULT_PLUS_PLUS_BMS,
  resolveGradePrice,
  type GradePriceTable,
} from "@/lib/gradePrice";

export type ExplorerAnimal = {
  id: string;
  traceNo: string;
  ageMonths: number;
  backFatMm: number | null;
  /** 초음파로 측정된 예상 등급 (예: "1++C") */
  scanGrade: string;
  /** 초음파 근내지방도(BMS 1~9). 1++ 단가를 고를 때 쓴다 */
  scanBms: number | null;
  /** 더 비육했을 때 도달 가능하다고 본 상향 등급 */
  upgradableGrade: string | null;
  /** 출하 시점 예상 누적 투자비 */
  investment: number;
  /** 입식일 ~ 예상 출하일. 연환산 수익률에 쓴다. 입식일이 없으면 null */
  daysHeld: number | null;
  /** 농장 실적 기준 권장 월령을 이미 지났는지 */
  isPast: boolean;
};

/** 육량등급은 보통 바뀌지 않으므로 고정하고, 육질등급만 바꿔볼 수 있게 한다. */
const QUALITY_OPTIONS = ["1", "1+", "1++"] as const;

const MIN_WEIGHT = 400;
const MAX_WEIGHT = 600;
const WEIGHT_STEP = 10;
const DEFAULT_WEIGHT = 500;

/** "1++C" -> { quality: "1++", yieldGrade: "C" } */
function splitGrade(grade: string): { quality: string; yieldGrade: string | null } {
  const last = grade.slice(-1);
  if (last === "A" || last === "B" || last === "C") {
    return { quality: grade.slice(0, -1), yieldGrade: last };
  }
  return { quality: grade, yieldGrade: null };
}

/** 농가가 읽기 쉬운 만원 단위. 6,644,331 -> "664만원" */
function manwon(v: number): string {
  const sign = v < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(v / 10000)).toLocaleString("ko-KR")}만원`;
}

// 장갑 낀 손으로도 끌 수 있게 트랙은 얇게, 손잡이는 32px로 키운다.
const rangeClass = [
  "h-11 w-full cursor-pointer appearance-none bg-transparent",
  "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full",
  "[&::-webkit-slider-runnable-track]:bg-black/10 dark:[&::-webkit-slider-runnable-track]:bg-white/15",
  "[&::-webkit-slider-thumb]:-mt-3 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-black",
  "[&::-webkit-slider-thumb]:shadow-md",
  "dark:[&::-webkit-slider-thumb]:border-black dark:[&::-webkit-slider-thumb]:bg-white",
  "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-black/10",
  "[&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:appearance-none",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
  "[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-black",
].join(" ");

export function CarcassExplorer({
  animals,
  prices,
}: {
  animals: ExplorerAnimal[];
  /** 지난주 음성공판장 시세. 1++ 는 근내지방도별 단가를 같이 담고 있다 */
  prices: GradePriceTable;
}) {
  const [weight, setWeight] = useState(DEFAULT_WEIGHT);
  // 개체별 육질등급 가정. 비어 있으면 초음파 측정 등급을 쓴다.
  const [qualityById, setQualityById] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-4">
      {/* 카드가 11장이라 아래로 내려가도 슬라이더가 따라오게 붙여둔다.
          (카드 배경 bg-white/5가 #0a0a0a 위에 겹친 색이 #1a1a1a라 다크모드에서 그 값을 직접 쓴다) */}
      <div className="sticky top-2 z-10 rounded-lg border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-black/60 dark:text-white/60">도체중을 끌어서 맞춰보세요</span>
          <span className="font-mono text-2xl font-semibold tabular-nums">{weight}kg</span>
        </div>
        <input
          type="range"
          min={MIN_WEIGHT}
          max={MAX_WEIGHT}
          step={WEIGHT_STEP}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          aria-label="도체중"
          className={rangeClass}
        />
        <div className="flex justify-between text-[11px] text-black/40 tabular-nums dark:text-white/40">
          <span>{MIN_WEIGHT}kg</span>
          <span>500kg</span>
          <span>{MAX_WEIGHT}kg</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {animals.map((a) => {
          const base = splitGrade(a.scanGrade);
          const quality = qualityById[a.id] ?? base.quality;
          const grade = base.yieldGrade ? `${quality}${base.yieldGrade}` : quality;
          const resolved = resolveGradePrice(prices, grade, a.scanBms);
          const price = resolved.pricePerKg;
          const profit = price != null ? weight * price - a.investment : null;
          const returnPct =
            profit != null && a.investment > 0 ? (profit / a.investment) * 100 : null;
          // 단순 수익률은 "투자한 돈 대비 얼마 남나", 연환산은 우방을 바로 다시 채울 때의 비교용.
          const annualPct =
            returnPct != null && a.daysHeld != null && a.daysHeld > 0
              ? returnPct * (365 / a.daysHeld)
              : null;
          const assumed = quality !== base.quality;

          return (
            <div
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Link
                    href={`/cattle/${a.id}`}
                    className="font-mono text-lg font-bold underline tabular-nums"
                  >
                    {getManagementNumber(a.traceNo)}
                  </Link>
                  <span className="rounded bg-black px-1.5 py-1 font-mono text-[11px] leading-none font-semibold text-white dark:bg-white dark:text-black">
                    {a.scanGrade}
                  </span>
                  {a.upgradableGrade && (
                    <span className="text-xs whitespace-nowrap text-black/50 dark:text-white/50">
                      →{a.upgradableGrade}
                    </span>
                  )}
                </span>
                {a.isPast ? (
                  <span className="rounded bg-green-50 px-1.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap text-green-700 dark:bg-green-500/15 dark:text-green-300">
                    출하 권장
                  </span>
                ) : (
                  <span className="text-xs whitespace-nowrap text-black/40 dark:text-white/40">
                    사육 계속
                  </span>
                )}
              </div>

              <div className="text-xs whitespace-nowrap text-black/50 tabular-nums dark:text-white/50">
                {a.ageMonths}개월
                {a.backFatMm != null && ` · 등지방 ${a.backFatMm}mm`}
                {` · 투자비 ${formatKRW(a.investment)}`}
              </div>

              {/* 육량등급은 거의 바뀌지 않으니 고정하고, 육질등급만 바꿔본다 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="shrink-0 text-xs text-black/50 dark:text-white/50">육질</span>
                <span className="inline-flex overflow-hidden rounded-md border border-black/15 dark:border-white/15">
                  {QUALITY_OPTIONS.map((opt) => {
                    const optGrade = base.yieldGrade ? `${opt}${base.yieldGrade}` : opt;
                    const selected = opt === quality;
                    const hasPrice =
                      resolveGradePrice(prices, optGrade, a.scanBms).pricePerKg != null;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!hasPrice}
                        onClick={() => setQualityById((prev) => ({ ...prev, [a.id]: opt }))}
                        className={`min-h-9 min-w-12 px-2 font-mono text-xs leading-none font-semibold tabular-nums disabled:opacity-30 ${
                          selected
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        {opt}
                        {opt === base.quality && (
                          <span className="ml-0.5 align-super text-[9px] font-normal">측정</span>
                        )}
                      </button>
                    );
                  })}
                </span>
                {base.yieldGrade && (
                  <span className="text-xs whitespace-nowrap text-black/40 dark:text-white/40">
                    육량 {base.yieldGrade} 고정
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                {profit != null ? (
                  <>
                    <span className="text-xs whitespace-nowrap text-black/50 tabular-nums dark:text-white/50">
                      {grade}
                      {resolved.bms != null && ` BMS${resolved.bms}`} kg당 {formatKRW(price)}
                    </span>
                    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span
                        className={`font-mono text-xl font-semibold tabular-nums ${
                          profit < 0 ? "text-red-600 dark:text-red-400" : ""
                        }`}
                      >
                        {manwon(profit)}
                      </span>
                      {returnPct != null && (
                        <span className="text-xs text-black/50 tabular-nums dark:text-white/50">
                          {Math.round(returnPct)}%
                          {annualPct != null && ` (연 ${Math.round(annualPct)}%)`}
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-black/40 dark:text-white/40">
                    {grade} 지난주 시세가 없습니다
                  </span>
                )}
              </div>

              {(assumed || resolved.assumedBms) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  {assumed && `초음파 측정은 ${a.scanGrade}입니다. ${grade}은 가정값입니다.`}
                  {assumed && resolved.assumedBms && " "}
                  {resolved.assumedBms &&
                    `근내지방도는 BMS ${DEFAULT_PLUS_PLUS_BMS} 기준 단가입니다.`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
