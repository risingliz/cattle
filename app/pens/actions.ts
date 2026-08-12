"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function revalidatePenViews() {
  revalidatePath("/pens");
  revalidatePath("/cattle");
  revalidatePath("/settings/pens");
}

export async function assignCattleToPen(penId: string, formData: FormData) {
  const cattleId = String(formData.get("cattleId") ?? "").trim();
  if (!cattleId) throw new Error("배정할 개체를 선택하세요.");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("cattle").update({ pen_id: penId }).eq("id", cattleId);
  if (error) throw new Error(`우방 배정 실패: ${error.message}`);

  revalidatePenViews();
}

export async function unassignCattleFromPen(cattleId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("cattle").update({ pen_id: null }).eq("id", cattleId);
  if (error) throw new Error(`우방 배정 해제 실패: ${error.message}`);

  revalidatePenViews();
}
