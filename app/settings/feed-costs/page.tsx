import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createFeedCostPeriod,
  updateFeedCostPeriod,
  deleteFeedCostPeriod,
} from "@/app/settings/feed-costs/actions";
import { Card } from "@/components/ui/Card";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  dangerButtonClass,
} from "@/components/ui/classes";

export const dynamic = "force-dynamic";

export default async function FeedCostsPage() {
  const supabase = getSupabaseServerClient();
  const { data: periods } = await supabase
    .from("feed_cost_periods")
    .select("*")
    .order("start_date", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/settings" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← 설정
      </Link>
      <Card title="새 사육비 기간 추가">
        <form action={createFeedCostPeriod} className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelClass}>시작일</label>
            <input name="startDate" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>일별 사육비 (원)</label>
            <input name="dailyRate" type="number" min="0" step="1" required className={inputClass} />
          </div>
          <div className="min-w-[10rem] flex-1">
            <label className={labelClass}>메모</label>
            <input name="memo" className={inputClass} />
          </div>
          <button type="submit" className={primaryButtonClass}>
            추가
          </button>
        </form>
        <p className="mt-3 text-xs text-black/50 dark:text-white/50">
          시작일부터 다음 기간 시작일 전날까지 해당 일별 사육비가 적용됩니다. 가장 최근 기간은 오늘까지
          적용됩니다.
        </p>
      </Card>

      <Card title="사육비 기간 이력">
        {(periods ?? []).length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">등록된 사육비 기간이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(periods ?? []).map((period) => (
              <div
                key={period.id}
                className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-black/10 p-3 dark:border-white/10"
              >
                <form
                  action={updateFeedCostPeriod.bind(null, period.id)}
                  className="flex flex-wrap items-end gap-3"
                >
                  <div>
                    <label className={labelClass}>시작일</label>
                    <input
                      name="startDate"
                      type="date"
                      defaultValue={period.start_date}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>일별 사육비 (원)</label>
                    <input
                      name="dailyRate"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={period.daily_rate}
                      className={inputClass}
                    />
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <label className={labelClass}>메모</label>
                    <input name="memo" defaultValue={period.memo ?? ""} className={inputClass} />
                  </div>
                  <button type="submit" className={secondaryButtonClass}>
                    저장
                  </button>
                </form>
                <form action={deleteFeedCostPeriod.bind(null, period.id)}>
                  <ConfirmSubmitButton
                    confirmMessage="이 사육비 기간을 삭제하시겠습니까?"
                    className={dangerButtonClass}
                  >
                    삭제
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
