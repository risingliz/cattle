-- 출하 전 초음파 육질진단 결과. 같은 개체를 여러 번 측정할 수 있어 별도 테이블로 둔다.
create table ultrasound_scans (
  id uuid primary key default gen_random_uuid(),
  cattle_id uuid not null references cattle(id) on delete cascade,
  scan_date date not null,
  /** 등지방두께 (mm) — 두꺼우면 육량등급이 내려간다 */
  back_fat_mm numeric(5,1),
  /** 등심단면적 (cm2) */
  ribeye_area_cm2 numeric(6,1),
  /** 근내지방번호 BMS 1~9 */
  bms integer,
  /** 측정 시점 기준 예상 육질등급 */
  predicted_grade text,
  /** 더 비육했을 때 도달 가능한 상향 등급 */
  upgradable_grade text,
  memo text,
  created_at timestamptz not null default now(),
  unique (cattle_id, scan_date)
);

create index ultrasound_scans_cattle_id_idx on ultrasound_scans (cattle_id);

alter table ultrasound_scans enable row level security;

grant all on ultrasound_scans to service_role;
