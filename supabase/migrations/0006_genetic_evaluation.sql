-- 한국종축개량협회(AIAK) 농가별 등록현황 자료의 등록정보 + 유전능력(육종가).
-- 4대 형질은 등급(A~D)과 육종가를 함께 보관한다. 등지방두께는 값이 작을수록 유리하다.
alter table cattle add column aiak_reg_no text;
alter table cattle add column aiak_reg_type text;
alter table cattle add column generation_no integer;
alter table cattle add column kpn text;
alter table cattle add column dam_trace_no text;
alter table cattle add column ebv_carcass_weight numeric(10,5);
alter table cattle add column ebv_carcass_weight_grade text;
alter table cattle add column ebv_eye_muscle_area numeric(10,5);
alter table cattle add column ebv_eye_muscle_area_grade text;
alter table cattle add column ebv_back_fat numeric(10,5);
alter table cattle add column ebv_back_fat_grade text;
alter table cattle add column ebv_marbling numeric(10,5);
alter table cattle add column ebv_marbling_grade text;
alter table cattle add column inbreeding_coef numeric(8,4);
alter table cattle add column genetic_synced_at timestamptz;
