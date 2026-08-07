import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { renamePen } from "@/app/settings/pens/actions";
import { Card } from "@/components/ui/Card";
import { inputClass, secondaryButtonClass } from "@/components/ui/classes";
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(pens ?? []).map((pen) => {
          const assigned = cattleByPen.get(pen.id) ?? [];
          return (
            <Card
              key={pen.id}
              title={pen.name}
              action={
                <form action={renamePen.bind(null, pen.id)} className="flex items-center gap-1">
                  <div className="w-24">
                    <input name="name" defaultValue={pen.name} className={inputClass} />
                  </div>
                  <button type="submit" className={secondaryButtonClass}>
                    저장
                  </button>
                </form>
              }
            >
              <div className="mb-2 text-xs text-black/50 dark:text-white/50">사육중 {assigned.length}두</div>
              {assigned.length === 0 ? (
                <p className="text-sm text-black/40 dark:text-white/40">배정된 개체 없음</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {assigned.map((c) => (
                    <li key={c.id}>
                      <Link href={`/cattle/${c.id}`} className="underline">
                        {c.trace_no}
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
