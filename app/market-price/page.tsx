import { Card } from "@/components/ui/Card";
import { InlineBar } from "@/components/ui/InlineBar";
import { WeeklyPriceLineChart } from "@/components/charts/WeeklyPriceLineChart";
import { fetchWeeklyGradePriceHistory } from "@/lib/eumseong-api";

export const dynamic = "force-dynamic";

const GRADE = "1++B";
const WEEKS_BACK = 12;

function formatPct(v: number | null): string {
  if (v == null) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function formatWon(v: number | null): string {
  if (v == null) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(v))}원`;
}

function pctClass(v: number | null): string {
  if (v == null) return "";
  return v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

export default async function MarketPricePage() {
  const today = new Date();
  const weeklyAsc = await fetchWeeklyGradePriceHistory(GRADE, WEEKS_BACK, today);

  const withDeltas = weeklyAsc.map((w, i) => {
    const prevWeek = weeklyAsc[i - 1];
    const prevMonth = weeklyAsc[i - 4];
    const wow =
      w.pricePerKg != null && prevWeek?.pricePerKg
        ? ((w.pricePerKg - prevWeek.pricePerKg) / prevWeek.pricePerKg) * 100
        : null;
    const mom =
      w.pricePerKg != null && prevMonth?.pricePerKg
        ? ((w.pricePerKg - prevMonth.pricePerKg) / prevMonth.pricePerKg) * 100
        : null;
    return { ...w, wow, mom };
  });

  const chronologicalDesc = [...withDeltas].reverse();
  const known = withDeltas.filter((w) => w.pricePerKg != null);
  const maxPrice = Math.max(1, ...known.map((w) => w.pricePerKg ?? 0));
  const latest = chronologicalDesc[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">{GRADE} 등급 주간 출하단가 (음성공판장)</h1>

      {latest?.pricePerKg != null && (
        <Card title="최근 주 kg당 단가">
          <p className="text-4xl font-semibold">
            {formatWon(latest.pricePerKg)}
            <span className="ml-2 text-base font-normal text-black/50 dark:text-white/50">/kg</span>
          </p>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            {latest.weekStart} ~ {latest.weekEnd} · 전주대비{" "}
            <span className={pctClass(latest.wow)}>{formatPct(latest.wow)}</span> · 전월대비{" "}
            <span className={pctClass(latest.mom)}>{formatPct(latest.mom)}</span>
          </p>
        </Card>
      )}

      {known.length > 0 && (
        <Card title={`최근 ${WEEKS_BACK}주 가격 추이`}>
          <WeeklyPriceLineChart data={withDeltas} />
        </Card>
      )}

      <Card title={`최근 ${WEEKS_BACK}주 추이`}>
        {known.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">해당 기간 거래 데이터가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">주 (화~금)</th>
                  <th className="pb-2 pr-4">추이</th>
                  <th className="pb-2 pr-4">kg당 단가</th>
                  <th className="pb-2 pr-4">전주대비</th>
                  <th className="pb-2">전월대비</th>
                </tr>
              </thead>
              <tbody>
                {chronologicalDesc.map((w) => (
                  <tr key={w.weekStart} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4">
                      {w.weekStart} ~ {w.weekEnd}
                    </td>
                    <td className="py-2 pr-4">
                      {w.pricePerKg != null ? (
                        <InlineBar value={w.pricePerKg} max={maxPrice} />
                      ) : (
                        <span className="text-black/30 dark:text-white/30">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{formatWon(w.pricePerKg)}</td>
                    <td className={`py-2 pr-4 ${pctClass(w.wow)}`}>{formatPct(w.wow)}</td>
                    <td className={`py-2 ${pctClass(w.mom)}`}>{formatPct(w.mom)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-black/50 dark:text-white/50">
        데이터 출처: 축산물품질평가원 음성공판장(한우 거세 기준). 매주 화~금 거래 평균가이며, 거래가 없는 주는
        &quot;-&quot;로 표시됩니다.
      </p>
    </div>
  );
}
