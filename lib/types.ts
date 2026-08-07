export type CattleStatus = "사육중" | "출하완료" | "폐사";

export interface Pen {
  id: string;
  name: string;
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
