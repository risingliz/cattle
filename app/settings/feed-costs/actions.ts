"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const periodSchema = z.object({
  startDate: z.string().min(1, "시작일을 입력하세요"),
  dailyRate: z.coerce.number().positive("일별 사육비는 0보다 커야 합니다"),
  memo: z.string().optional(),
});

function revalidateAll() {
  revalidatePath("/settings/feed-costs");
  revalidatePath("/cattle");
  revalidatePath("/");
}

export async function createFeedCostPeriod(formData: FormData) {
  const parsed = periodSchema.safeParse({
    startDate: formData.get("startDate"),
    dailyRate: formData.get("dailyRate"),
    memo: formData.get("memo") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "입력값을 확인하세요.");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("feed_cost_periods").insert({
    start_date: parsed.data.startDate,
    daily_rate: parsed.data.dailyRate,
    memo: parsed.data.memo || null,
  });
  if (error) throw new Error(`사육비 기간 추가 실패: ${error.message}`);

  revalidateAll();
}

export async function updateFeedCostPeriod(periodId: string, formData: FormData) {
  const parsed = periodSchema.safeParse({
    startDate: formData.get("startDate"),
    dailyRate: formData.get("dailyRate"),
    memo: formData.get("memo") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "입력값을 확인하세요.");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("feed_cost_periods")
    .update({
      start_date: parsed.data.startDate,
      daily_rate: parsed.data.dailyRate,
      memo: parsed.data.memo || null,
    })
    .eq("id", periodId);
  if (error) throw new Error(`사육비 기간 수정 실패: ${error.message}`);

  revalidateAll();
}

export async function deleteFeedCostPeriod(periodId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("feed_cost_periods").delete().eq("id", periodId);
  if (error) throw new Error(`사육비 기간 삭제 실패: ${error.message}`);

  revalidateAll();
}
