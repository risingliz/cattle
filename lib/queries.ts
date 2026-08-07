import { getSupabaseServerClient } from "./supabase/server";
import { calcCattleProfitability, type ProfitabilitySummary } from "./calculations";
import type { Cattle, ExtraCost, FeedCostPeriod, Pen } from "./types";

export interface CattleWithSummary {
  cattle: Cattle;
  summary: ProfitabilitySummary | null;
}

/** 전체 개체 + 계산된 수익성 요약. 대시보드/목록 페이지에서 공용으로 사용. */
export async function getAllCattleWithProfitability(): Promise<{
  items: CattleWithSummary[];
  pens: Pen[];
  extraByCattle: Map<string, ExtraCost[]>;
  feedCostPeriods: FeedCostPeriod[];
}> {
  const supabase = getSupabaseServerClient();

  const [cattleRes, extraCostRes, periodRes, penRes] = await Promise.all([
    supabase.from("cattle").select("*").order("created_at", { ascending: false }),
    supabase.from("extra_costs").select("*"),
    supabase.from("feed_cost_periods").select("*"),
    supabase.from("pens").select("*").order("name"),
  ]);

  if (cattleRes.error) throw new Error(`개체 목록 조회 실패: ${cattleRes.error.message}`);
  if (extraCostRes.error) throw new Error(`기타비용 조회 실패: ${extraCostRes.error.message}`);
  if (periodRes.error) throw new Error(`사육비 이력 조회 실패: ${periodRes.error.message}`);
  if (penRes.error) throw new Error(`우방 조회 실패: ${penRes.error.message}`);

  const cattle = cattleRes.data ?? [];
  const extraCosts = extraCostRes.data ?? [];
  const periods = periodRes.data ?? [];
  const pens = penRes.data ?? [];

  const extraByCattle = new Map<string, ExtraCost[]>();
  for (const ec of extraCosts) {
    const list = extraByCattle.get(ec.cattle_id) ?? [];
    list.push(ec);
    extraByCattle.set(ec.cattle_id, list);
  }

  const items: CattleWithSummary[] = cattle.map((c) => ({
    cattle: c,
    summary: calcCattleProfitability(c, extraByCattle.get(c.id) ?? [], periods),
  }));

  return { items, pens, extraByCattle, feedCostPeriods: periods };
}
