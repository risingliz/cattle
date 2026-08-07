alter table cattle add column intake_method text check (intake_method in ('경매', '직거래'));
alter table cattle add column intake_weight numeric(6,1);
