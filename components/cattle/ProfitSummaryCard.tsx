import { Card, StatTile } from "@/components/ui/Card";
import { formatMonthsAndDays, formatKRW, formatPercent } from "@/lib/format";
import type { Cattle } from "@/lib/types";
import type { ProfitabilitySummary } from "@/lib/calculations";

export function ProfitSummaryCard({
  cattle,
  summary,
}: {
  cattle: Cattle;
  summary: ProfitabilitySummary | null;
}) {
  if (!summary) {
    return (
      <Card title="수익성 요약">
        <p className="text-sm text-black/60 dark:text-white/60">
          입식일 또는 입식가격이 없어 계산할 수 없습니다. API 동기화 또는 가격 입력이 필요합니다.
        </p>
      </Card>
    );
  }

  const isDead = cattle.status === "폐사";
  const isShipped = cattle.status === "출하완료";

  return (
    <Card title="수익성 요약">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="사육일수" value={formatMonthsAndDays(summary.monthsHeld, summary.daysHeld)} />
        <StatTile label="사료비 누적" value={formatKRW(summary.feedCost)} />
        <StatTile label="기타비용 합계" value={formatKRW(summary.extraCostTotal)} />
        <StatTile
          label={isShipped || isDead ? "총 투자비용 (확정)" : "총 투자비용 (진행중)"}
          value={formatKRW(summary.totalInvestment)}
        />
        {isDead && (
          <StatTile
            label="폐사 손실"
            value={<span className="text-red-600 dark:text-red-400">{formatKRW(summary.netProfit)}</span>}
            hint="폐사로 출하 수익 없이 투자비용 전액 손실 처리됨"
          />
        )}
        {isShipped && (
          <>
            <StatTile
              label={summary.usedEstimatedPrice ? "순수익 (추정)" : "순수익"}
              value={
                <span className={(summary.netProfit ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {formatKRW(summary.netProfit)}
                </span>
              }
              hint={summary.usedEstimatedPrice ? "출하가격 미입력 — 음성공판장 등급별 낙찰가 기준 추정값" : undefined}
            />
            <StatTile
              label={summary.usedEstimatedPrice ? "연환산 수익률 (추정)" : "연환산 수익률"}
              value={
                <span className={(summary.annualizedReturnPct ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {formatPercent(summary.annualizedReturnPct)}
                </span>
              }
            />
          </>
        )}
      </div>
    </Card>
  );
}
