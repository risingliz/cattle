import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ResyncAllButton } from "@/components/settings/ResyncAllButton";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// 사육중 개체를 전부 KAPE API로 재조회하므로 기본 실행시간 제한으로는 부족할 수 있다.
export const maxDuration = 60;

export default async function ResyncSettingsPage() {
  const supabase = getSupabaseServerClient();
  const { count } = await supabase
    .from("cattle")
    .select("id", { count: "exact", head: true })
    .eq("status", "사육중");

  const activeCount = count ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/settings" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← 설정
      </Link>
      <h1 className="text-lg font-semibold">전체 상태 재조회</h1>

      <Card>
        <p className="mb-4 text-sm text-black/60 dark:text-white/60">
          사육중으로 등록된 개체의 이력을 축산물이력제에서 다시 조회해 <b>출하·폐사 여부를 한 번에 반영</b>
          합니다. 출하하고 난 뒤 눌러주시면 출하일·등급·도체중까지 함께 채워집니다.
        </p>
        <ResyncAllButton activeCount={activeCount} />
      </Card>

      <p className="text-xs text-black/50 dark:text-white/50">
        개체별로 따로 확인하려면 개체 상세 화면의 &quot;API 동기화&quot; 버튼을 쓰면 됩니다. 이미 출하완료·폐사로
        기록된 개체는 여기서 건드리지 않습니다.
      </p>
    </div>
  );
}
