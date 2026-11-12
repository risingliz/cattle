"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { syncCattleFromAPI } from "@/app/cattle/actions";
import { getManagementNumber } from "@/lib/format";

/** KAPE API에 한꺼번에 너무 많은 동시 요청을 보내지 않도록 제한한다. */
const RESYNC_CONCURRENCY = 6;

export interface ResyncChange {
  id: string;
  managementNo: string;
  from: string;
  to: string;
  date: string | null;
}

export interface ResyncResult {
  checked: number;
  changes: ResyncChange[];
  failed: number;
  finishedAt: number;
}

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * 사육중인 모든 개체의 이력을 KAPE API로 다시 조회해 출하·폐사 여부를 반영한다.
 * 상태가 바뀐 개체만 결과로 돌려주므로, 출하 후 한 번 눌러 일괄 반영하는 용도로 쓴다.
 */
export async function resyncActiveCattle(): Promise<ResyncResult> {
  const supabase = getSupabaseServerClient();

  const { data: before, error } = await supabase
    .from("cattle")
    .select("id,trace_no,status")
    .eq("status", "사육중");
  if (error) throw new Error(`사육중 개체 조회 실패: ${error.message}`);

  const targets = before ?? [];
  let failed = 0;

  await mapWithConcurrency(targets, RESYNC_CONCURRENCY, async (cattle) => {
    try {
      await syncCattleFromAPI(cattle.id, { force: false });
    } catch {
      failed += 1;
    }
  });

  // 동기화 후 상태를 다시 읽어 실제로 바뀐 개체만 추린다.
  const { data: after } = await supabase
    .from("cattle")
    .select("id,trace_no,status,shipment_date,death_date")
    .in("id", targets.map((c) => c.id));

  const afterById = new Map((after ?? []).map((c) => [c.id, c]));
  const changes: ResyncChange[] = [];
  for (const cattle of targets) {
    const now = afterById.get(cattle.id);
    if (!now || now.status === cattle.status) continue;
    changes.push({
      id: cattle.id,
      managementNo: getManagementNumber(cattle.trace_no),
      from: cattle.status,
      to: now.status,
      date: now.status === "폐사" ? now.death_date : now.shipment_date,
    });
  }

  changes.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  revalidatePath("/cattle");
  revalidatePath("/shipments");
  revalidatePath("/cashflow");
  revalidatePath("/pens");
  revalidatePath("/settings/resync");

  return { checked: targets.length, changes, failed, finishedAt: Date.now() };
}
