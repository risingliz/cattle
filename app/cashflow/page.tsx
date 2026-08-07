import { Card } from "@/components/ui/Card";
import { HorizontalBarList } from "@/components/ui/HorizontalBarList";
import { formatKRW, formatInt } from "@/lib/format";
import { getAllCattleWithProfitability } from "@/lib/queries";
import { calcYearlyCashFlow, calcMonthlyInBarnInvestment } from "@/lib/calculations";

export const dynamic = "force-dynamic";

const CASH_FLOW_START_YEAR = 2024;
const INVESTMENT_TREND_START = new Date(2024, 0, 1);

export default async function CashFlowPage() {
  const { items, extraByCattle, feedCostPeriods } = await getAllCattleWithProfitability();
  const cattleList = items.map((i) => i.cattle);
  const today = new Date();

  const yearlyCashFlow = calcYearlyCashFlow(cattleList, extraByCattle, feedCostPeriods, today).filter(
    (y) => y.year >= CASH_FLOW_START_YEAR
  );

  const monthlyInvestment = calcMonthlyInBarnInvestment(
    cattleList,
    extraByCattle,
    feedCostPeriods,
    INVESTMENT_TREND_START,
    today
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">현금 흐름</h1>

      <Card title={`연도별 현금흐름 (${CASH_FLOW_START_YEAR}년~)`}>
        <p className="mb-4 text-xs text-black/50 dark:text-white/50">
          그 해에 실제로 오간 돈 기준입니다 (사육중 개체의 사료비도 해당 연도만큼 포함, 출하 여부와 무관).
        </p>

        {yearlyCashFlow.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">해당 기간 데이터가 없습니다.</p>
        ) : (
          <>
            <div className="mb-4">
              <HorizontalBarList
                items={yearlyCashFlow.map((y) => ({ label: `${y.year}년`, value: y.netCashFlow }))}
                formatValue={formatKRW}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-black/60 dark:text-white/60">
                    <th className="pb-2 pr-4">연도</th>
                    <th className="pb-2 pr-4">입식비용</th>
                    <th className="pb-2 pr-4">사육비</th>
                    <th className="pb-2 pr-4">기타비용</th>
                    <th className="pb-2 pr-4">출하대금</th>
                    <th className="pb-2">순현금흐름</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyCashFlow.map((y) => (
                    <tr key={y.year} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-2 pr-4">{y.year}년</td>
                      <td className="py-2 pr-4">{formatKRW(y.intakeCost)}</td>
                      <td className="py-2 pr-4">{formatKRW(y.feedCost)}</td>
                      <td className="py-2 pr-4">{formatKRW(y.extraCost)}</td>
                      <td className="py-2 pr-4">{formatKRW(y.shipmentRevenue)}</td>
                      <td className="py-2">
                        <span
                          className={
                            y.netCashFlow >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {formatKRW(y.netCashFlow)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="월별 사육장 투자비 현황 (2024년 1월~)">
        <p className="mb-4 text-xs text-black/50 dark:text-white/50">
          매월 1일 기준, 그 시점에 사육장에 있던(출하·폐사 전) 개체들의 누적 투자비용 합계입니다.
        </p>

        {monthlyInvestment.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">해당 기간 데이터가 없습니다.</p>
        ) : (
          <>
            <div className="mb-4">
              <HorizontalBarList
                items={monthlyInvestment.map((m) => ({ label: m.yearMonth, value: m.totalInvestment }))}
                formatValue={formatKRW}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-black/60 dark:text-white/60">
                    <th className="pb-2 pr-4">월</th>
                    <th className="pb-2 pr-4">사육 두수</th>
                    <th className="pb-2">누적 투자비용</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyInvestment.map((m) => (
                    <tr key={m.yearMonth} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-2 pr-4">{m.yearMonth}</td>
                      <td className="py-2 pr-4">{formatInt(m.headCount)}두</td>
                      <td className="py-2">{formatKRW(m.totalInvestment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
