export type CattleStatus = "사육중" | "출하완료" | "폐사";
export type IntakeMethod = "경매" | "직거래";

export interface Pen {
  id: string;
  name: string;
  /** 물리적 배치 구역 이름 (예: "4x2 구역"). 배치 미설정이면 null. */
  layout_group: string | null;
  layout_row: number | null;
  layout_col: number | null;
  created_at: string;
}

export interface FeedCostPeriod {
  id: string;
  start_date: string;
  daily_rate: number;
  memo: string | null;
  created_at: string;
}

export interface Cattle {
  id: string;
  trace_no: string;
  pen_id: string | null;
  status: CattleStatus;

  birth_date: string | null;
  intake_date: string | null;
  shipment_date: string | null;
  death_date: string | null;

  intake_method: IntakeMethod | null;
  intake_weight: number | null;
  intake_price: number | null;
  shipment_price: number | null;
  /** 출하가격 미입력 시 음성공판장 등급별 낙찰가 기준 추정값 */
  estimated_shipment_price: number | null;
  estimated_price_per_kg: number | null;

  slaughter_issue_no: string | null;
  slaughter_issue_date: string | null;
  grade_nm: string | null;
  carcass_weight: number | null;
  insfat: number | null;
  wgrade: string | null;
  windex: number | null;

  // 한국종축개량협회(AIAK) 등록·유전능력 정보. 농가별 등록현황 파일로 채워진다.
  aiak_reg_no: string | null;
  aiak_reg_type: string | null;
  /** 계대 */
  generation_no: number | null;
  /** 씨수소 번호 (예: KPN1506) */
  kpn: string | null;
  /** 모(母) 개체식별번호 */
  dam_trace_no: string | null;
  /** 4대 형질 육종가(EBV)와 그 등급(A~D). 냉도체중 */
  ebv_carcass_weight: number | null;
  ebv_carcass_weight_grade: string | null;
  /** 등심단면적 */
  ebv_eye_muscle_area: number | null;
  ebv_eye_muscle_area_grade: string | null;
  /** 등지방두께 (음수가 유리) */
  ebv_back_fat: number | null;
  ebv_back_fat_grade: string | null;
  /** 근내지방도 */
  ebv_marbling: number | null;
  ebv_marbling_grade: string | null;
  inbreeding_coef: number | null;
  genetic_synced_at: string | null;

  api_synced_at: string | null;
  memo: string | null;

  created_at: string;
  updated_at: string;
}

export interface ExtraCost {
  id: string;
  cattle_id: string;
  cost_date: string;
  category: string;
  amount: number;
  memo: string | null;
  created_at: string;
}
