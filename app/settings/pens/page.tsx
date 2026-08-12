import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updatePen } from "@/app/settings/pens/actions";
import { Card } from "@/components/ui/Card";
import { inputClass, labelClass, secondaryButtonClass } from "@/components/ui/classes";
import { getManagementNumber } from "@/lib/format";
import type { Cattle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PensSettingsPage() {
  const supabase = getSupabaseServerClient();
  const [{ data: pens }, { data: cattle }] = await Promise.all([
    supabase.from("pens").select("*").order("name"),
    supabase.from("cattle").select("*").eq("status", "사육중"),
  ]);

  const cattleByPen = new Map<string, Cattle[]>();
  for (const c of cattle ?? []) {
    if (!c.pen_id) continue;
    const list = cattleByPen.get(c.pen_id) ?? [];
    list.push(c);
    cattleByPen.set(c.pen_id, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/settings" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← 설정
      </Link>
      <h1 className="text-lg font-semibold">우방 관리</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        구역/행/열을 입력하면{" "}
        <Link href="/pens" className="underline">
          배치도
        </Link>
        에 실제 축사 배치대로 표시됩니다. 같은 구역 이름을 쓰는 우방끼리 한 구역으로 묶입니다.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(pens ?? []).map((pen) => {
          const assigned = cattleByPen.get(pen.id) ?? [];
          return (
            <Card key={pen.id} title={pen.name}>
              <form action={updatePen.bind(null, pen.id)} className="flex flex-col gap-2">
                <div>
                  <label className={labelClass}>이름</label>
                  <input name="name" defaultValue={pen.name} className={inputClass} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>구역</label>
                    <input name="layoutGroup" defaultValue={pen.layout_group ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>행</label>
                    <input
                      name="layoutRow"
                      type="number"
                      defaultValue={pen.layout_row ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>열</label>
                    <input
                      name="layoutCol"
                      type="number"
                      defaultValue={pen.layout_col ?? ""}
                      className={inputClass}
                    />
                  </div>
                </div>
                <button type="submit" className={`${secondaryButtonClass} self-start`}>
                  저장
                </button>
              </form>

              <div className="mt-3 border-t border-black/5 pt-3 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
                사육중 {assigned.length}두
              </div>
              {assigned.length === 0 ? (
                <p className="mt-1 text-sm text-black/40 dark:text-white/40">배정된 개체 없음</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {assigned.map((c) => (
                    <li key={c.id}>
                      <Link href={`/cattle/${c.id}`} className="underline">
                        {getManagementNumber(c.trace_no)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
