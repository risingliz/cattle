import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createCattle } from "@/app/cattle/actions";
import { Card } from "@/components/ui/Card";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui/classes";

export const dynamic = "force-dynamic";

export default async function NewCattlePage() {
  const supabase = getSupabaseServerClient();
  const { data: pens } = await supabase.from("pens").select("*").order("name");

  return (
    <Card title="신규 개체 등록" className="max-w-xl">
      <form action={createCattle} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>이력번호</label>
          <input name="traceNo" required className={inputClass} placeholder="예: 002164280352" />
        </div>
        <div>
          <label className={labelClass}>우방</label>
          <select name="penId" className={inputClass} defaultValue="">
            <option value="">미배정</option>
            {(pens ?? []).map((pen) => (
              <option key={pen.id} value={pen.id}>
                {pen.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>입식 가격 (원)</label>
          <input name="intakePrice" type="number" min="0" step="1" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>메모</label>
          <textarea name="memo" rows={2} className={inputClass} />
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          등록 시 출생일/입식일/출하일 정보를 축산물이력제 API에서 자동으로 조회합니다.
        </p>
        <button type="submit" className={primaryButtonClass}>
          등록
        </button>
      </form>
    </Card>
  );
}
