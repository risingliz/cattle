alter table pens add column layout_group text;
alter table pens add column layout_row integer;
alter table pens add column layout_col integer;

-- 같은 구역 안에서 같은 칸을 두 우방이 동시에 차지하지 못하게
create unique index pens_layout_position_idx on pens (layout_group, layout_row, layout_col)
  where layout_group is not null and layout_row is not null and layout_col is not null;
