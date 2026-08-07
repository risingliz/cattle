import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { TraceNoLink } from "@/components/cattle/TraceNoLink";
import { dangerButtonClass } from "@/components/ui/classes";
import { formatDate, getManagementNumber } from "@/lib/format";
import { getAllCattleWithProfitability } from "@/lib/queries";
import { deleteCattle } from "@/app/cattle/actions";

export const dynamic = "force-dynamic";

export default async function DeleteCattlePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const { items } = await getAllCattleWithProfitability();
  const filtered = items.filter(
    ({ cattle }) => !q || cattle.trace_no.includes(q) || getManagementNumber(cattle.trace_no).includes(q)
  );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/settings" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← 설정
      </Link>
      <h1 className="text-lg font-semibold">개체 삭제</h1>

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

      <Card>
        {filtered.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">등록된 개체가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">관리번호</th>
                  <th className="pb-2 pr-4">상태</th>
                  <th className="pb-2 pr-4">입식일</th>
                  <th className="pb-2 pr-4">출하일</th>
                  <th className="pb-2 pr-4">폐사일</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ cattle }) => (
                  <tr
                    key={cattle.id}
                    className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="py-2 pr-4">
                      <TraceNoLink cattleId={cattle.id} traceNo={cattle.trace_no} />
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={cattle.status} />
                    </td>
                    <td className="py-2 pr-4">{formatDate(cattle.intake_date)}</td>
                    <td className="py-2 pr-4">{formatDate(cattle.shipment_date)}</td>
                    <td className="py-2 pr-4">{formatDate(cattle.death_date)}</td>
                    <td className="py-2">
                      <form action={deleteCattle.bind(null, cattle.id, undefined)}>
                        <ConfirmSubmitButton
                          confirmMessage={`${cattle.trace_no} 개체를 삭제하시겠습니까? 관련 기타비용도 함께 삭제됩니다.`}
                          className={dangerButtonClass}
                        >
                          삭제
                        </ConfirmSubmitButton>
                      </form>
                    </td>
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
