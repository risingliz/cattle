import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EbvGradeCode } from "@/components/cattle/EbvGradeCode";
import { calcFeedingStage, calcMonthsBetween, type ProfitabilitySummary } from "@/lib/calculations";
import { formatInt, formatKRW, formatPercent, getEbvGradeCode, getManagementNumber } from "@/lib/format";
import type { Cattle } from "@/lib/types";

function moneyClass(v: number | null | undefined): string {
  if (v == null) return "";
  return v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

/** 금액 한 줄: 라벨 왼쪽, 금액 오른쪽. 합계 줄은 strong으로 구분한다. */
function MoneyRow({
  label,
  hint,
  value,
  strong = false,
  valueClass = "",
}: {
  label: string;
  hint?: string;
  value: string;
  strong?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1.5 ${
        strong ? "border-t border-black/15 font-semibold dark:border-white/20" : ""
      }`}
    >
      <span className={strong ? "text-sm" : "text-sm text-black/60 dark:text-white/60"}>
        {label}
        {hint && <span className="ml-1 text-xs text-black/40 dark:text-white/40">{hint}</span>}
      </span>
      <span className={`shrink-0 font-mono whitespace-nowrap tabular-nums ${strong ? "text-base" : "text-sm"} ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function GradeBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 p-3 dark:border-white/10">
      <div className="text-xs text-black/50 dark:text-white/50">{title}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/**
 * 개체 한 마리를 한 장으로 요약하는 카드. 캡처해서 그대로 공유할 수 있도록
 * 관리번호·날짜 → 등급(출하/유전) → 비용 구성 → 순수익 순으로 담는다.
 */
export function CattleOverviewCard({
  cattle,
  summary,
}: {
  cattle: Cattle;
  summary: ProfitabilitySummary | null;
}) {
  const isShipped = cattle.status === "출하완료";
  const isDead = cattle.status === "폐사";
  const exitDate = isDead ? cattle.death_date : cattle.shipment_date;
  const salePrice = cattle.shipment_price ?? cattle.estimated_shipment_price;

  const exitAgeMonths =
    cattle.birth_date && exitDate ? calcMonthsBetween(new Date(cattle.birth_date), new Date(exitDate)) : null;
  const currentAgeMonths = cattle.birth_date
    ? calcMonthsBetween(new Date(cattle.birth_date), new Date())
    : null;
  const ageMonths = exitAgeMonths ?? currentAgeMonths;

  const hasEbv = !!getEbvGradeCode(cattle);

  return (
    <Card>
      {/* 개체 식별 — 캡처만 봐도 어느 소인지 알 수 있어야 한다 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold tabular-nums">
            {getManagementNumber(cattle.trace_no)}
          </span>
          <span className="text-xs text-black/40 dark:text-white/40">{cattle.trace_no}</span>
        </div>
        <StatusBadge status={cattle.status} />
      </div>

      <div className="mt-1 text-xs text-black/50 dark:text-white/50">
        {cattle.birth_date ? `${cattle.birth_date} 출생` : "출생일 미확인"}
        {cattle.intake_date && ` · ${cattle.intake_date} 입식`}
        {exitDate && ` · ${exitDate} ${isDead ? "폐사" : "출하"}`}
        {ageMonths != null && ` · ${ageMonths}개월`}
        {!isShipped && !isDead && ageMonths != null && ` (${calcFeedingStage(ageMonths)})`}
      </div>

      {/* 등급 — 출하 성적과 유전능력을 나란히 두어 예측이 맞았는지 바로 보이게 */}
      {(isShipped || hasEbv) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {isShipped && (
            <GradeBlock title="출하등급 (실제)">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold">{cattle.grade_nm ?? "-"}</span>
                {cattle.insfat != null && (
                  <span className="text-xs text-black/50 dark:text-white/50">
                    근내지방도 {formatInt(cattle.insfat)}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs whitespace-nowrap text-black/50 tabular-nums dark:text-white/50">
                도체중 {cattle.carcass_weight != null ? `${cattle.carcass_weight}kg` : "-"}
                {cattle.wgrade && ` · 육량 ${cattle.wgrade}`}
                {cattle.windex != null && ` · 육량지수 ${cattle.windex}`}
              </div>
            </GradeBlock>
          )}

          {hasEbv && (
            <GradeBlock title="유전등급 (종축개량협회)">
              <EbvGradeCode cattle={cattle} size="lg" />
              <div className="mt-1 text-xs whitespace-nowrap text-black/50 dark:text-white/50">
                냉도체중 {cattle.ebv_carcass_weight_grade ?? "-"} · 단면적{" "}
                {cattle.ebv_eye_muscle_area_grade ?? "-"} · 등지방 {cattle.ebv_back_fat_grade ?? "-"} · 근내{" "}
                {cattle.ebv_marbling_grade ?? "-"}
                {cattle.kpn && ` · ${cattle.kpn}`}
              </div>
            </GradeBlock>
          )}
        </div>
      )}

      {/* 비용 구성 → 판매가 → 순수익 */}
      {summary ? (
        <div className="mt-4">
          <MoneyRow label="송아지 구매비용" value={formatKRW(cattle.intake_price)} />
          <MoneyRow
            label="사료비"
            hint={`${formatInt(summary.daysHeld)}일`}
            value={formatKRW(summary.feedCost)}
          />
          <MoneyRow label="기타비용" hint="치료비 등" value={formatKRW(summary.extraCostTotal)} />
          <MoneyRow
            label={isShipped || isDead ? "총 투자비용" : "현재까지 투자비용"}
            value={formatKRW(summary.totalInvestment)}
            strong
          />

          {isShipped && (
            <div className="mt-3">
              <MoneyRow
                label="판매가"
                hint={summary.usedEstimatedPrice ? "추정" : "실제"}
                value={formatKRW(salePrice)}
              />
              <MoneyRow
                label="순수익"
                value={formatKRW(summary.netProfit)}
                strong
                valueClass={moneyClass(summary.netProfit)}
              />
              <MoneyRow
                label="연환산 수익률"
                value={formatPercent(summary.annualizedReturnPct)}
                valueClass={moneyClass(summary.annualizedReturnPct)}
              />
            </div>
          )}

          {isDead && (
            <div className="mt-3">
              <MoneyRow
                label="폐사 손실"
                hint="출하 수익 없음"
                value={formatKRW(summary.netProfit)}
                strong
                valueClass="text-red-600 dark:text-red-400"
              />
            </div>
          )}

          {summary.usedEstimatedPrice && isShipped && (
            <p className="mt-3 text-xs text-black/50 dark:text-white/50">
              출하가격이 입력되지 않아 음성공판장 {cattle.grade_nm} 등급 낙찰가
              {cattle.estimated_price_per_kg != null && ` (kg당 ${formatKRW(cattle.estimated_price_per_kg)})`}
              로 추정한 금액입니다. 정산서 금액을 입력하면 실제 수익으로 바뀝니다.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-black/60 dark:text-white/60">
          입식일 또는 입식가격이 없어 수익을 계산할 수 없습니다. 아래에서 입식 가격을 입력하거나 API
          동기화를 실행해주세요.
        </p>
      )}
    </Card>
  );
}
