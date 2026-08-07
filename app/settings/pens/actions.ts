"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function renamePen(penId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("우방 이름을 입력하세요.");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("pens").update({ name }).eq("id", penId);
  if (error) throw new Error(`우방 이름 수정 실패: ${error.message}`);

  revalidatePath("/settings/pens");
  revalidatePath("/cattle");
}
