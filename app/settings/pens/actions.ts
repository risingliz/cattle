"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function optionalInt(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function optionalText(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function updatePen(penId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("우방 이름을 입력하세요.");

  const layoutGroup = optionalText(formData.get("layoutGroup"));
  const layoutRow = optionalInt(formData.get("layoutRow"));
  const layoutCol = optionalInt(formData.get("layoutCol"));

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("pens")
    .update({ name, layout_group: layoutGroup, layout_row: layoutRow, layout_col: layoutCol })
    .eq("id", penId);
  if (error) throw new Error(`우방 정보 수정 실패: ${error.message}`);

  revalidatePath("/settings/pens");
  revalidatePath("/cattle");
  revalidatePath("/pens");
}
