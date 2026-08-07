import Link from "next/link";
import { Card, StatTile } from "@/components/ui/Card";
import { getAllCattleWithProfitability } from "@/lib/queries";
import { primaryButtonClass } from "@/components/ui/classes";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { items } = await getAllCattleWithProfitability();

  const total = items.length;
  const ongoing = items.filter((i) => i.cattle.status === "사육중").length;
  const shipped = items.filter((i) => i.cattle.status === "출하완료").length;
  const dead = items.filter((i) => i.cattle.status === "폐사").length;

  return (
    <div className="flex flex-col gap-6">
      <Card title="현재 사육중">
        <p className="text-4xl font-semibold">{ongoing}두</p>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <StatTile label="총 등록 개체" value={`${total}두`} />
        <StatTile label="누적 출하완료" value={`${shipped}두`} />
        <StatTile label="누적 폐사" value={`${dead}두`} />
      </div>

      <Card title="출하 성과">
        <p className="mb-4 text-sm text-black/60 dark:text-white/60">
          출하/폐사 개체의 투자비용, 순수익, 연환산 수익률은 연도별로 출하 목록에서 확인할 수 있습니다.
        </p>
        <Link href="/shipments" className={primaryButtonClass}>
          출하 목록 보기
        </Link>
      </Card>
    </div>
  );
}
