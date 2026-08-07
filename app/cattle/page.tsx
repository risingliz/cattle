import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TraceNoLink } from "@/components/cattle/TraceNoLink";
import { GrowthStageBadge } from "@/components/cattle/GrowthStageBadge";
import { HorizontalBarList } from "@/components/ui/HorizontalBarList";
import { primaryButtonClass } from "@/components/ui/classes";
import { formatDate, formatMonthsAndDays, formatKRW, getManagementNumber, getGrowthStage } from "@/lib/format";
import { getAllCattleWithProfitability } from "@/lib/queries";
import { addMonths, calcMonthsBetween } from "@/lib/calculations";
import type { Cattle } from "@/lib/types";

export const dynamic = "force-dynamic";

// 입식 -> 약 30개월령 출하가 기준
const SHIP_AGE_MONTHS = 30;
const FLOW_MONTHS_AHEAD = 6;

function monthLabel(date: Date): string {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildShipmentFlow(cattleWithBirth: Cattle[], today: Date) {
  const overdueMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const buckets = new Map<string, number>();
  let overdue = 0;

  const futureMonths: Date[] = [];
  for (let i = 0; i <= FLOW_MONTHS_AHEAD; i++) {
    const m = addMonths(overdueMonth, i);
    futureMonths.push(m);
    buckets.set(monthLabel(m), 0);
  }

  for (const cattle of cattleWithBirth) {
    if (!cattle.birth_date) continue;
    const projected = addMonths(new Date(cattle.birth_date), SHIP_AGE_MONTHS);
    if (projected < overdueMonth) {
      overdue += 1;
      continue;
    }
    const key = monthLabel(new Date(projected.getFullYear(), projected.getMonth(), 1));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return {
    overdue,
    months: futureMonths.map((m) => ({ label: monthLabel(m), value: buckets.get(monthLabel(m)) ?? 0 })),
  };
}

export default async function CattleListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const { items, pens } = await getAllCattleWithProfitability();
  const penNameById = new Map(pens.map((p) => [p.id, p.name]));
  const today = new Date();

  const active = items
    .filter(({ cattle }) => {
      if (cattle.status !== "사육중") return false;
      if (q && !cattle.trace_no.includes(q) && !getManagementNumber(cattle.trace_no).includes(q))
        return false;
      return true;
    })
    .map(({ cattle, summary }) => ({
      cattle,
      summary,
      ageMonths: cattle.birth_date ? calcMonthsBetween(new Date(cattle.birth_date), today) : null,
    }))
    .sort((a, b) => (b.ageMonths ?? -1) - (a.ageMonths ?? -1));

  const flow = buildShipmentFlow(
    active.map((i) => i.cattle),
    today
  );
  const flowItems = [
    { label: "출하시기 초과", value: flow.overdue, highlight: flow.overdue > 0 },
    ...flow.months.map((m, i) => ({ label: m.label, value: m.value, highlight: i === 0 && m.value > 0 })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">사육 목록 ({active.length}두)</h1>
        <div className="flex gap-2">
          <form className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="관리번호/이력번호 검색"
              className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm dark:border-white/15 dark:bg-black/20"
            />
            <button
              type="submit"
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
            >
              검색
            </button>
          </form>
          <Link href="/cattle/new" className={primaryButtonClass}>
            + 개체 등록
          </Link>
        </div>
      </div>

      <Card title={`출하 예정 흐름 (월령 ${SHIP_AGE_MONTHS}개월 기준)`}>
        <HorizontalBarList items={flowItems} />
      </Card>

      <Card>
        {active.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">사육중인 개체가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">관리번호</th>
                  <th className="pb-2 pr-4">우방</th>
                  <th className="pb-2 pr-4">상태</th>
                  <th className="pb-2 pr-4">입식일</th>
                  <th className="pb-2 pr-4">월령</th>
                  <th className="pb-2 pr-4">사육일수</th>
                  <th className="pb-2">누적 투자비용</th>
                </tr>
              </thead>
              <tbody>
                {active.map(({ cattle, summary, ageMonths }) => (
                  <tr
                    key={cattle.id}
                    className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="py-2 pr-4">
                      <TraceNoLink cattleId={cattle.id} traceNo={cattle.trace_no} />
                    </td>
                    <td className="py-2 pr-4">
                      {cattle.pen_id ? (penNameById.get(cattle.pen_id) ?? "-") : "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={cattle.status} />
                    </td>
                    <td className="py-2 pr-4">{formatDate(cattle.intake_date)}</td>
                    <td className="py-2 pr-4">
                      {ageMonths != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          {ageMonths}개월
                          <GrowthStageBadge stage={getGrowthStage(ageMonths)} />
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {formatMonthsAndDays(summary?.monthsHeld, summary?.daysHeld)}
                    </td>
                    <td className="py-2">{formatKRW(summary?.totalInvestment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
