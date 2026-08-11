"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchTraceInfo, fetchGradeInfo } from "@/lib/kape-api";
import { fetchEumseongGradePricePerKg, getPreviousWeekTueFri } from "@/lib/eumseong-api";
import type { Cattle, CattleStatus } from "@/lib/types";

function optionalNumber(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function optionalString(v: FormDataEntryValue | null): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export async function createCattle(formData: FormData) {
  const traceNo = optionalString(formData.get("traceNo"));
  if (!traceNo) throw new Error("이력번호를 입력하세요.");

  const penId = optionalString(formData.get("penId"));
  const intakeMethod = optionalString(formData.get("intakeMethod"));
  const intakePrice = optionalNumber(formData.get("intakePrice"));
  const intakeWeight = optionalNumber(formData.get("intakeWeight"));
  const memo = optionalString(formData.get("memo"));

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cattle")
    .insert({
      trace_no: traceNo,
      pen_id: penId ?? null,
      intake_method: intakeMethod ?? null,
      intake_price: intakePrice ?? null,
      intake_weight: intakeWeight ?? null,
      memo: memo ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 등록된 이력번호입니다.");
    }
    throw new Error(`개체 등록 실패: ${error.message}`);
  }

  try {
    await syncCattleFromAPI(data.id, { force: false });
  } catch {
    // 최초 API 조회 실패는 등록을 막지 않는다 - 상세 페이지에서 재시도 가능
  }

  revalidatePath("/cattle");
  redirect(`/cattle/${data.id}`);
}

export interface UpdateCattleState {
  savedAt: number;
}

/**
 * useActionState와 함께 쓰인다. cattleId만 bind된 상태로 폼 action에 연결하면
 * 매 저장마다 새로운 savedAt을 반환해 폼을 강제로 다시 마운트할 수 있다
 * (React가 저장 직후 uncontrolled 필드를 최초 defaultValue로 되돌리는 것을 방지).
 */
export async function updateCattle(
  cattleId: string,
  _prevState: UpdateCattleState | null,
  formData: FormData
): Promise<UpdateCattleState> {
  const penId = optionalString(formData.get("penId"));
  const intakeMethod = optionalString(formData.get("intakeMethod"));
  const intakePrice = optionalNumber(formData.get("intakePrice"));
  const intakeWeight = optionalNumber(formData.get("intakeWeight"));
  const shipmentPrice = optionalNumber(formData.get("shipmentPrice"));
  const memo = optionalString(formData.get("memo"));

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("cattle")
    .update({
      pen_id: penId ?? null,
      intake_method: intakeMethod ?? null,
      intake_price: intakePrice ?? null,
      intake_weight: intakeWeight ?? null,
      shipment_price: shipmentPrice ?? null,
      memo: memo ?? null,
    })
    .eq("id", cattleId);

  if (error) throw new Error(`개체 정보 수정 실패: ${error.message}`);

  revalidatePath(`/cattle/${cattleId}`);
  revalidatePath("/cattle");
  revalidatePath("/shipments");
  revalidatePath("/");

  return { savedAt: Date.now() };
}

/** redirectTo를 지정하면 삭제 후 해당 경로로 이동한다 (상세 페이지에서 자기 자신을 삭제한 경우 등). */
export async function deleteCattle(cattleId: string, redirectTo?: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("cattle").delete().eq("id", cattleId);
  if (error) throw new Error(`개체 삭제 실패: ${error.message}`);

  revalidatePath("/cattle");
  revalidatePath("/shipments");
  revalidatePath("/");
  if (redirectTo) redirect(redirectTo);
}

const extraCostSchema = z.object({
  costDate: z.string().min(1, "날짜를 입력하세요"),
  category: z.string().min(1, "구분을 입력하세요"),
  amount: z.coerce.number().positive("금액은 0보다 커야 합니다"),
  memo: z.string().optional(),
});

export async function addExtraCost(cattleId: string, formData: FormData) {
  const parsed = extraCostSchema.safeParse({
    costDate: formData.get("costDate"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    memo: optionalString(formData.get("memo")) ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "입력값을 확인하세요.");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("extra_costs").insert({
    cattle_id: cattleId,
    cost_date: parsed.data.costDate,
    category: parsed.data.category,
    amount: parsed.data.amount,
    memo: parsed.data.memo || null,
  });
  if (error) throw new Error(`기타비용 추가 실패: ${error.message}`);

  revalidatePath(`/cattle/${cattleId}`);
}

export async function deleteExtraCost(id: string, cattleId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("extra_costs").delete().eq("id", id);
  if (error) throw new Error(`기타비용 삭제 실패: ${error.message}`);

  revalidatePath(`/cattle/${cattleId}`);
}

export interface SyncResult {
  ok: boolean;
  message: string;
}

/**
 * KAPE API로 개체 정보를 동기화한다.
 * force=false: 비어있는 필드만 채우고, 사육중인 개체는 출하/폐사 여부를 다시 확인한다.
 * force=true: 모든 필드를 재조회하여 덮어쓴다.
 */
export async function syncCattleFromAPI(
  cattleId: string,
  opts: { force?: boolean } = {}
): Promise<SyncResult> {
  const force = opts.force ?? false;
  const supabase = getSupabaseServerClient();

  const { data: cattle, error: fetchError } = await supabase
    .from("cattle")
    .select("*")
    .eq("id", cattleId)
    .single();
  if (fetchError || !cattle) {
    throw new Error(`개체 조회 실패: ${fetchError?.message ?? "not found"}`);
  }

  const patch: Partial<Cattle> = {};

  const needsTrace =
    force || !cattle.birth_date || !cattle.intake_date || cattle.status === "사육중";

  if (needsTrace) {
    try {
      const trace = await fetchTraceInfo(cattle.trace_no);

      if (force || !cattle.birth_date) patch.birth_date = trace.birthDate;
      if (force || !cattle.intake_date) patch.intake_date = trace.intakeDate;

      let nextStatus: CattleStatus = cattle.status;
      if (trace.deathDate) {
        nextStatus = "폐사";
        patch.death_date = trace.deathDate;
      } else if (trace.shipmentDate) {
        nextStatus = "출하완료";
        patch.shipment_date = trace.shipmentDate;
      }
      if (nextStatus !== cattle.status) patch.status = nextStatus;
    } catch (err) {
      if (force) throw err;
      // 사육중 개체의 조용한 폴링 실패는 무시 (다음 동기화 시 재시도)
    }
  }

  const effectiveStatus = patch.status ?? cattle.status;
  const needsGrade = effectiveStatus === "출하완료" && (force || !cattle.grade_nm);

  if (needsGrade) {
    try {
      const grade = await fetchGradeInfo(cattle.trace_no);
      if (grade) {
        patch.slaughter_issue_no = grade.issueNo;
        patch.slaughter_issue_date = grade.issueDate;
        patch.grade_nm = grade.gradeNm;
        patch.insfat = grade.insfat;
        patch.carcass_weight = grade.carcassWeight;
        patch.wgrade = grade.wgrade;
        patch.windex = grade.windex;
      }
    } catch (err) {
      if (force) throw err;
    }
  }

  // 출하가격이 아직 입력되지 않은 출하완료 개체는 음성공판장 등급별 낙찰가로 추정가를 계산한다.
  const effectiveGradeNm = patch.grade_nm ?? cattle.grade_nm;
  const effectiveInsfat = patch.insfat ?? cattle.insfat;
  const effectiveCarcassWeight = patch.carcass_weight ?? cattle.carcass_weight;
  const effectiveShipmentDate = patch.shipment_date ?? cattle.shipment_date;

  const needsEstimate =
    effectiveStatus === "출하완료" &&
    cattle.shipment_price == null &&
    !!effectiveGradeNm &&
    effectiveCarcassWeight != null &&
    !!effectiveShipmentDate &&
    (force || cattle.estimated_shipment_price == null);

  if (needsEstimate && effectiveGradeNm && effectiveShipmentDate) {
    try {
      const { start, end } = getPreviousWeekTueFri(new Date(effectiveShipmentDate));
      const pricePerKg = await fetchEumseongGradePricePerKg(
        effectiveGradeNm,
        effectiveInsfat,
        start,
        end
      );
      if (pricePerKg != null && effectiveCarcassWeight != null) {
        patch.estimated_price_per_kg = pricePerKg;
        patch.estimated_shipment_price = Math.round(pricePerKg * effectiveCarcassWeight);
      }
    } catch (err) {
      if (force) throw err;
    }
  }

  patch.api_synced_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("cattle")
    .update(patch)
    .eq("id", cattleId);
  if (updateError) {
    throw new Error(`동기화 결과 저장 실패: ${updateError.message}`);
  }

  revalidatePath(`/cattle/${cattleId}`);
  revalidatePath("/cattle");
  revalidatePath("/");

  return { ok: true, message: "동기화가 완료되었습니다." };
}
