import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TraceNoLink } from "@/components/cattle/TraceNoLink";
import { HorizontalBarList } from "@/components/ui/HorizontalBarList";
import { SortableTh } from "@/components/ui/SortableTh";
import { primaryButtonClass } from "@/components/ui/classes";
import { formatKRW, getManagementNumber } from "@/lib/format";
import { getAllCattleWithProfitability, type CattleWithSummary } from "@/lib/queries";
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

type ActiveRow = CattleWithSummary & { ageMonths: number | null };

function sortActive(
  rows: ActiveRow[],
  sort: string | undefined,
  dir: string | undefined,
  penNameById: Map<string, string>
): ActiveRow[] {
  const factor = dir === "asc" ? 1 : -1;
  const sorted = [...rows];

  switch (sort) {
    case "pen":
      sorted.sort((a, b) => {
        const an = a.cattle.pen_id ? (penNameById.get(a.cattle.pen_id) ?? "") : "";
        const bn = b.cattle.pen_id ? (penNameById.get(b.cattle.pen_id) ?? "") : "";
        return factor * an.localeCompare(bn);
      });
      break;
    case "birth":
      sorted.sort(
        (a, b) => factor * (a.cattle.birth_date ?? "").localeCompare(b.cattle.birth_date ?? "")
      );
      break;
    case "investment":
      sorted.sort(
        (a, b) => factor * ((a.summary?.totalInvestment ?? -1) - (b.summary?.totalInvestment ?? -1))
      );
      break;
    default:
      sorted.sort((a, b) => (b.ageMonths ?? -1) - (a.ageMonths ?? -1));
  }

  return sorted;
}

export default async function CattleListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const { items, pens } = await getAllCattleWithProfitability();
  const penNameById = new Map(pens.map((p) => [p.id, p.name]));
  const today = new Date();

  const filtered: ActiveRow[] = items
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
    }));

  const active = sortActive(filtered, params.sort, params.dir, penNameById);

  const flow = buildShipmentFlow(
    active.map((i) => i.cattle),
    today
  );
  const flowItems = [
    { label: "출하시기 초과", value: flow.overdue, highlight: flow.overdue > 0 },
    ...flow.months.map((m, i) => ({ label: m.label, value: m.value, highlight: i === 0 && m.value > 0 })),
  ];

  const sortParams = { q: q || undefined };

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
                  <SortableTh
                    label="우방"
                    column="pen"
                    basePath="/cattle"
                    params={sortParams}
                    activeSort={params.sort}
                    activeDir={params.dir}
                    className="pb-2 pr-4"
                  />
                  <SortableTh
                    label="생년월일"
                    column="birth"
                    basePath="/cattle"
                    params={sortParams}
                    activeSort={params.sort}
                    activeDir={params.dir}
                    className="pb-2 pr-4"
                  />
                  <SortableTh
                    label="누적 투자비용"
                    column="investment"
                    basePath="/cattle"
                    params={sortParams}
                    activeSort={params.sort}
                    activeDir={params.dir}
                    className="pb-2"
                  />
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
                      {cattle.birth_date ? `${cattle.birth_date} (${ageMonths}개월)` : "-"}
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
