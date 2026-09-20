import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { calcCattleProfitability } from "@/lib/calculations";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SyncButton } from "@/components/cattle/SyncButton";
import { ProfitSummaryCard } from "@/components/cattle/ProfitSummaryCard";
import { CattleUpdateForm } from "@/components/cattle/CattleUpdateForm";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { FillInputButton } from "@/components/ui/FillInputButton";
import { deleteCattle, addExtraCost, deleteExtraCost } from "@/app/cattle/actions";
import { inputClass, labelClass, secondaryButtonClass, dangerButtonClass } from "@/components/ui/classes";
import { formatDate, formatKRW, formatInt, getManagementNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CattleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const [{ data: cattle }, { data: pens }, { data: extraCosts }, { data: periods }] =
    await Promise.all([
      supabase.from("cattle").select("*").eq("id", id).maybeSingle(),
      supabase.from("pens").select("*").order("name"),
      supabase.from("extra_costs").select("*").eq("cattle_id", id).order("cost_date", { ascending: false }),
      supabase.from("feed_cost_periods").select("*"),
    ]);

  if (!cattle) notFound();

  const summary = calcCattleProfitability(cattle, extraCosts ?? [], periods ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{getManagementNumber(cattle.trace_no)}</h1>
          <span className="text-sm text-black/40 dark:text-white/40">{cattle.trace_no}</span>
          <StatusBadge status={cattle.status} />
        </div>
        <div className="flex items-center gap-2">
          <SyncButton cattleId={cattle.id} label="API 동기화" />
          <SyncButton cattleId={cattle.id} force label="강제 재조회" />
          <form action={deleteCattle.bind(null, cattle.id, "/cattle")}>
            <ConfirmSubmitButton
              confirmMessage="이 개체를 삭제하시겠습니까? 관련 기타비용도 함께 삭제됩니다."
              className={dangerButtonClass}
            >
              삭제
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <Card title="이력 정보 (API 연동)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="출생일" value={formatDate(cattle.birth_date)} />
          <Field label="입식일" value={formatDate(cattle.intake_date)} />
          <Field label="출하일" value={formatDate(cattle.shipment_date)} />
          <Field label="폐사일" value={formatDate(cattle.death_date)} />
        </div>
        <p className="mt-3 text-xs text-black/50 dark:text-white/50">
          마지막 동기화:{" "}
          {cattle.api_synced_at ? new Date(cattle.api_synced_at).toLocaleString("ko-KR") : "동기화 안 됨"}
        </p>
      </Card>

      <Card title="가격 / 우방 정보">
        <CattleUpdateForm cattleId={cattle.id}>
          <div>
            <label className={labelClass}>우방</label>
            <select name="penId" defaultValue={cattle.pen_id ?? ""} className={inputClass}>
              <option value="">미배정</option>
              {(pens ?? []).map((pen) => (
                <option key={pen.id} value={pen.id}>
                  {pen.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>입식 방식</label>
            <select name="intakeMethod" defaultValue={cattle.intake_method ?? ""} className={inputClass}>
              <option value="">미지정</option>
              <option value="경매">경매</option>
              <option value="직거래">직거래</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>입식 가격 (원)</label>
            <input
              name="intakePrice"
              type="number"
              min="0"
              defaultValue={cattle.intake_price ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>입식 체중 (kg)</label>
            <input
              name="intakeWeight"
              type="number"
              min="0"
              step="0.1"
              defaultValue={cattle.intake_weight ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>출하 가격 (원)</label>
            <input
              id="shipmentPrice-input"
              name="shipmentPrice"
              type="number"
              min="0"
              defaultValue={cattle.shipment_price ?? ""}
              className={inputClass}
            />
            {cattle.shipment_price == null && cattle.estimated_shipment_price != null && (
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                추정가 {formatKRW(cattle.estimated_shipment_price)}
                {cattle.estimated_price_per_kg != null && cattle.carcass_weight != null && (
                  <> (음성공판장 {cattle.grade_nm} 기준 kg당 {formatKRW(cattle.estimated_price_per_kg)} × 도체중 {cattle.carcass_weight}kg)</>
                )}
                {" — "}
                <FillInputButton
                  targetId="shipmentPrice-input"
                  value={cattle.estimated_shipment_price}
                  label="이 값 채우기"
                  className="underline hover:no-underline"
                />
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>메모</label>
            <textarea name="memo" rows={2} defaultValue={cattle.memo ?? ""} className={inputClass} />
          </div>
        </CattleUpdateForm>
      </Card>

      {cattle.status === "출하완료" && (
        <Card title="도축 결과 (API 연동)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="육질등급" value={cattle.grade_nm ?? "-"} />
            <Field label="도체중" value={cattle.carcass_weight != null ? `${cattle.carcass_weight}kg` : "-"} />
            <Field label="근내지방도" value={cattle.insfat != null ? formatInt(cattle.insfat) : "-"} />
            <Field label="육량등급" value={cattle.wgrade ?? "-"} />
            <Field label="육량지수" value={cattle.windex != null ? String(cattle.windex) : "-"} />
            <Field label="발급번호" value={cattle.slaughter_issue_no ?? "-"} />
          </div>
        </Card>
      )}

      {cattle.genetic_synced_at && (
        <Card title="유전능력 (한국종축개량협회)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <EbvField label="냉도체중" grade={cattle.ebv_carcass_weight_grade} value={cattle.ebv_carcass_weight} unit="kg" />
            <EbvField label="등심단면적" grade={cattle.ebv_eye_muscle_area_grade} value={cattle.ebv_eye_muscle_area} unit="㎠" />
            <EbvField label="등지방두께" grade={cattle.ebv_back_fat_grade} value={cattle.ebv_back_fat} unit="mm" />
            <EbvField label="근내지방도" grade={cattle.ebv_marbling_grade} value={cattle.ebv_marbling} unit="" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-black/5 pt-4 sm:grid-cols-4 dark:border-white/10">
            <Field label="KPN (씨수소)" value={cattle.kpn ?? "-"} />
            <Field label="계대" value={cattle.generation_no != null ? `${cattle.generation_no}대` : "-"} />
            <Field
              label="근친계수"
              value={cattle.inbreeding_coef != null ? `${cattle.inbreeding_coef}%` : "-"}
            />
            <Field label="등록번호" value={cattle.aiak_reg_no ?? "-"} />
          </div>

          <p className="mt-3 text-xs text-black/50 dark:text-white/50">
            괄호 안은 육종가(EBV)이며 등급 A가 가장 우수합니다. 등지방두께는 값이 작을수록(음수) 유리합니다.
            {cattle.dam_trace_no && <> · 모: {cattle.dam_trace_no}</>}
          </p>
        </Card>
      )}

      <Card title="기타 비용 (치료비 등)">
        <form
          action={addExtraCost.bind(null, cattle.id)}
          className="mb-4 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className={labelClass}>날짜</label>
            <input
              name="costDate"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>구분</label>
            <input name="category" required placeholder="예: 치료비" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>금액 (원)</label>
            <input name="amount" type="number" min="0" required className={inputClass} />
          </div>
          <div className="min-w-[8rem] flex-1">
            <label className={labelClass}>메모</label>
            <input name="memo" className={inputClass} />
          </div>
          <button type="submit" className={secondaryButtonClass}>
            추가
          </button>
        </form>

        {(extraCosts ?? []).length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">등록된 기타비용이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black/60 dark:text-white/60">
                  <th className="pb-2 pr-4">날짜</th>
                  <th className="pb-2 pr-4">구분</th>
                  <th className="pb-2 pr-4">금액</th>
                  <th className="pb-2 pr-4">메모</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {(extraCosts ?? []).map((ec) => (
                  <tr key={ec.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4">{ec.cost_date}</td>
                    <td className="py-2 pr-4">{ec.category}</td>
                    <td className="py-2 pr-4">{formatKRW(ec.amount)}</td>
                    <td className="py-2 pr-4">{ec.memo ?? "-"}</td>
                    <td className="py-2">
                      <form action={deleteExtraCost.bind(null, ec.id, cattle.id)}>
                        <ConfirmSubmitButton
                          confirmMessage="이 비용 항목을 삭제하시겠습니까?"
                          className="text-xs text-red-600 hover:underline dark:text-red-400"
                        >
                          삭제
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ProfitSummaryCard cattle={cattle} summary={summary} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

/** 유전능력 한 형질: 등급(A~D)을 크게, 육종가를 괄호로. */
function EbvField({
  label,
  grade,
  value,
  unit,
}: {
  label: string;
  grade: string | null;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 p-3 dark:border-white/10">
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`font-mono text-2xl font-semibold ${ebvGradeClass(grade)}`}>{grade ?? "-"}</span>
        {value != null && (
          <span className="font-mono text-xs whitespace-nowrap text-black/50 tabular-nums dark:text-white/50">
            {value > 0 ? "+" : ""}
            {value.toFixed(2)}
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function ebvGradeClass(grade: string | null): string {
  switch (grade) {
    case "A":
      return "text-green-600 dark:text-green-400";
    case "B":
      return "text-blue-600 dark:text-blue-400";
    case "C":
      return "text-black/60 dark:text-white/60";
    case "D":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-black/30 dark:text-white/30";
  }
}
