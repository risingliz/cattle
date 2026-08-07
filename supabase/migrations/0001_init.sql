-- 우방 (pens)
create table pens (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- 기간별 일별 고정 사육비 이력
create table feed_cost_periods (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  daily_rate numeric(10,2) not null,
  memo text,
  created_at timestamptz not null default now()
);

-- 개체
create table cattle (
  id uuid primary key default gen_random_uuid(),
  trace_no text not null unique,
  pen_id uuid references pens(id) on delete set null,
  status text not null default '사육중' check (status in ('사육중', '출하완료', '폐사')),

  birth_date date,
  intake_date date,
  shipment_date date,
  death_date date,

  intake_price numeric(12,0),
  shipment_price numeric(12,0),

  slaughter_issue_no text,
  slaughter_issue_date date,
  grade_nm text,
  carcass_weight numeric(6,1),
  insfat integer,
  wgrade text,
  windex numeric(6,2),

  api_synced_at timestamptz,
  memo text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cattle_status_idx on cattle(status);
create index cattle_pen_id_idx on cattle(pen_id);

-- 개체별 기타 비용 (치료비 등)
create table extra_costs (
  id uuid primary key default gen_random_uuid(),
  cattle_id uuid not null references cattle(id) on delete cascade,
  cost_date date not null default current_date,
  category text not null,
  amount numeric(10,0) not null,
  memo text,
  created_at timestamptz not null default now()
);

create index extra_costs_cattle_id_idx on extra_costs(cattle_id);

-- updated_at 자동 갱신
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cattle_set_updated_at
  before update on cattle
  for each row execute function set_updated_at();

-- 초기 우방 20개 시드
insert into pens (name) select (n || '번 우방') from generate_series(1, 20) n;

-- RLS 활성화, 정책 없음: 모든 접근은 서버(service role)에서만 수행
alter table pens enable row level security;
alter table feed_cost_periods enable row level security;
alter table cattle enable row level security;
alter table extra_costs enable row level security;
