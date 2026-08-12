import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assignCattleToPen, unassignCattleFromPen } from "@/app/pens/actions";
import { Card } from "@/components/ui/Card";
import { inputClass, secondaryButtonClass } from "@/components/ui/classes";
import { getManagementNumber } from "@/lib/format";
import type { Cattle, Pen } from "@/lib/types";

export const dynamic = "force-dynamic";

function sortByManagementNumber(a: Cattle, b: Cattle): number {
  return getManagementNumber(a.trace_no).localeCompare(getManagementNumber(b.trace_no));
}

function PenCell({
  pen,
  assigned,
  unassigned,
}: {
  pen: Pen;
  assigned: Cattle[];
  unassigned: Cattle[];
}) {
  return (
    <div
      className="flex min-h-[150px] flex-col gap-2 rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/5"
      style={
        pen.layout_row != null && pen.layout_col != null
          ? { gridRow: pen.layout_row, gridColumn: pen.layout_col }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{pen.name}</span>
        <span className="text-xs text-black/50 dark:text-white/50">{assigned.length}두</span>
      </div>

      {assigned.length === 0 ? (
        <p className="text-xs text-black/40 dark:text-white/40">배정된 개체 없음</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {assigned.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-1 rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10"
            >
              <Link href={`/cattle/${c.id}`} className="underline">
                {getManagementNumber(c.trace_no)}
              </Link>
              <form action={unassignCattleFromPen.bind(null, c.id)}>
                <button
                  type="submit"
                  aria-label={`${getManagementNumber(c.trace_no)} 배정 해제`}
                  className="text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto">
        {unassigned.length === 0 ? (
          <p className="text-xs text-black/30 dark:text-white/30">배정 가능한 소 없음</p>
        ) : (
          <form action={assignCattleToPen.bind(null, pen.id)} className="flex items-center gap-1">
            <select name="cattleId" defaultValue="" className={`${inputClass} text-xs`}>
              <option value="" disabled>
                소 선택
              </option>
              {unassigned.map((c) => (
                <option key={c.id} value={c.id}>
                  {getManagementNumber(c.trace_no)}
                </option>
              ))}
            </select>
            <button type="submit" className={`${secondaryButtonClass} shrink-0 px-2 py-1 text-xs`}>
              배정
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default async function PensLayoutPage() {
  const supabase = getSupabaseServerClient();
  const [{ data: pens }, { data: cattle }] = await Promise.all([
    supabase.from("pens").select("*").order("name"),
    supabase.from("cattle").select("*").eq("status", "사육중"),
  ]);

  const activeCattle = cattle ?? [];
  const cattleByPen = new Map<string, Cattle[]>();
  for (const c of activeCattle) {
    if (!c.pen_id) continue;
    const list = cattleByPen.get(c.pen_id) ?? [];
    list.push(c);
    cattleByPen.set(c.pen_id, list);
  }
  const unassignedCattle = activeCattle.filter((c) => !c.pen_id).sort(sortByManagementNumber);

  const allPens = pens ?? [];
  const laidOutPens = allPens.filter((p) => p.layout_group && p.layout_row != null && p.layout_col != null);
  const unpositionedPens = allPens.filter((p) => !(p.layout_group && p.layout_row != null && p.layout_col != null));

  const groups = new Map<string, Pen[]>();
  for (const pen of laidOutPens) {
    const list = groups.get(pen.layout_group!) ?? [];
    list.push(pen);
    groups.set(pen.layout_group!, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">우방 배치도</h1>
        <span className="text-sm text-black/60 dark:text-white/60">미배정 소 {unassignedCattle.length}마리</span>
      </div>

      {groups.size === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          아직 배치가 설정된 우방이 없습니다.{" "}
          <Link href="/settings/pens" className="underline">
            우방 관리
          </Link>
          에서 각 우방의 구역/행/열을 입력하면 여기에 실제 배치대로 표시됩니다.
        </p>
      )}

      {Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([groupName, groupPens]) => {
          const maxCol = Math.max(...groupPens.map((p) => p.layout_col!));
          const maxRow = Math.max(...groupPens.map((p) => p.layout_row!));
          return (
            <Card key={groupName} title={groupName}>
              <div className="overflow-x-auto">
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${maxCol}, minmax(140px, 1fr))`,
                    gridTemplateRows: `repeat(${maxRow}, auto)`,
                    width: `max-content`,
                    minWidth: "100%",
                  }}
                >
                  {groupPens.map((pen) => (
                    <PenCell
                      key={pen.id}
                      pen={pen}
                      assigned={cattleByPen.get(pen.id) ?? []}
                      unassigned={unassignedCattle}
                    />
                  ))}
                </div>
              </div>
            </Card>
          );
        })}

      {unpositionedPens.length > 0 && (
        <Card title="배치 미설정">
          <p className="mb-3 text-xs text-black/50 dark:text-white/50">
            <Link href="/settings/pens" className="underline">
              우방 관리
            </Link>
            에서 구역/행/열을 입력하면 위에 배치도로 표시됩니다.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unpositionedPens.map((pen) => (
              <PenCell
                key={pen.id}
                pen={pen}
                assigned={cattleByPen.get(pen.id) ?? []}
                unassigned={unassignedCattle}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
