"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { WeeklyGradePrice } from "@/lib/eumseong-api";

interface Props {
  /** 오래된 주부터 최신 주 순서. */
  data: WeeklyGradePrice[];
  /** 모든 데이터 포인트에 점(circle)을 표시할지 여부. 포인트가 많은 장기 그래프에서는 false로 선을 깔끔하게 유지. */
  showAllPoints?: boolean;
  /** x축 라벨을 몇 번째 포인트마다 표시할지 (1이면 전부 표시). */
  xLabelEvery?: number;
  /** x축 라벨 형식: "day"는 M/D, "month"는 YY.MM. */
  xLabelFormat?: "day" | "month";
  /** 지정 시 툴팁에 도체중 환산 총액을 함께 표시. */
  carcassWeightKg?: number;
}

const WIDTH = 640;
const HEIGHT = 260;
const MARGIN = { top: 20, right: 16, bottom: 28, left: 60 };

function niceStep(range: number, targetTicks = 4): number {
  const safeRange = range > 0 ? range : 1;
  const rough = safeRange / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

function formatWon(v: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(v));
}

function formatMonthDay(iso: string): string {
  const parts = iso.split("-");
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function formatYearMonth(iso: string): string {
  const parts = iso.split("-");
  return `${parts[0].slice(2)}.${parts[1]}`;
}

export function WeeklyPriceLineChart({
  data,
  showAllPoints = true,
  xLabelEvery = 1,
  xLabelFormat = "day",
  carcassWeightKg,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const innerW = WIDTH - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { xForIndex, yForPrice, yTicks, segments, lastKnown } = useMemo(() => {
    const known = data.filter((d): d is WeeklyGradePrice & { pricePerKg: number } => d.pricePerKg != null);
    const minPrice = known.length ? Math.min(...known.map((d) => d.pricePerKg)) : 0;
    const maxPrice = known.length ? Math.max(...known.map((d) => d.pricePerKg)) : 1;
    const step = niceStep(maxPrice - minPrice);
    const yMin = Math.floor(minPrice / step) * step;
    let yMax = Math.ceil(maxPrice / step) * step;
    if (yMax === yMin) yMax = yMin + step;

    const ticks: number[] = [];
    for (let v = yMin; v <= yMax + 1e-6; v += step) ticks.push(v);

    const xForIndex = (i: number) => (data.length > 1 ? MARGIN.left + (innerW * i) / (data.length - 1) : MARGIN.left + innerW / 2);
    const yForPrice = (p: number) => MARGIN.top + innerH - ((p - yMin) / (yMax - yMin)) * innerH;

    const segs: { x: number; y: number }[][] = [];
    let current: { x: number; y: number }[] = [];
    data.forEach((d, i) => {
      if (d.pricePerKg != null) {
        current.push({ x: xForIndex(i), y: yForPrice(d.pricePerKg) });
      } else if (current.length) {
        segs.push(current);
        current = [];
      }
    });
    if (current.length) segs.push(current);

    let lastKnownIdx = -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].pricePerKg != null) {
        lastKnownIdx = i;
        break;
      }
    }

    return {
      xForIndex,
      yForPrice,
      yTicks: ticks,
      segments: segs,
      lastKnown: lastKnownIdx >= 0 ? { index: lastKnownIdx, ...data[lastKnownIdx] } : null,
    };
  }, [data, innerW, innerH]);

  function handlePointerMove(e: PointerEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    const rel = data.length > 1 ? (loc.x - MARGIN.left) / innerW : 0;
    const idx = Math.round(rel * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  }

  const hovered = hoverIdx != null ? data[hoverIdx] : null;
  const hoveredPrev = hoverIdx != null && hoverIdx > 0 ? data[hoverIdx - 1] : null;
  const hoveredWow =
    hovered?.pricePerKg != null && hoveredPrev?.pricePerKg
      ? ((hovered.pricePerKg - hoveredPrev.pricePerKg) / hoveredPrev.pricePerKg) * 100
      : null;

  const tooltipLeftPct = hoverIdx != null ? (xForIndex(hoverIdx) / WIDTH) * 100 : 0;
  const tooltipAlignEnd = hoverIdx != null && hoverIdx > data.length * 0.6;

  return (
    <div className="weekly-price-chart relative">
      <style>{`
        .weekly-price-chart {
          --series: #2a78d6;
          --grid: #e1e0d9;
          --muted: #898781;
          --secondary: #52514e;
          --ring: #ffffff;
        }
        @media (prefers-color-scheme: dark) {
          .weekly-price-chart {
            --series: #3987e5;
            --grid: #2c2c2a;
            --secondary: #c3c2b7;
            --ring: #000000;
          }
        }
      `}</style>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="주간 kg당 단가 추이 라인 그래프"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yForPrice(t)}
              y2={yForPrice(t)}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 8}
              y={yForPrice(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--muted)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatWon(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          if (i % xLabelEvery !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={d.weekStart}
              x={xForIndex(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted)"
            >
              {xLabelFormat === "month" ? formatYearMonth(d.weekStart) : formatMonthDay(d.weekStart)}
            </text>
          );
        })}

        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.map((p, j) => `${j === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--series)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {data.map((d, i) => {
          if (d.pricePerKg == null) return null;
          const isEndpoint = lastKnown?.index === i;
          if (!showAllPoints && hoverIdx !== i && !isEndpoint) return null;
          return (
            <circle
              key={d.weekStart}
              cx={xForIndex(i)}
              cy={yForPrice(d.pricePerKg)}
              r={hoverIdx === i ? 5 : 4}
              fill="var(--series)"
              stroke="var(--ring)"
              strokeWidth={2}
            />
          );
        })}

        {lastKnown && (
          <text
            x={xForIndex(lastKnown.index)}
            y={yForPrice(lastKnown.pricePerKg!) - 12}
            textAnchor={lastKnown.index > data.length * 0.7 ? "end" : "middle"}
            fontSize={12}
            fontWeight={600}
            fill="var(--secondary)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatWon(lastKnown.pricePerKg!)}원
          </text>
        )}

        {hoverIdx != null && (
          <line
            x1={xForIndex(hoverIdx)}
            x2={xForIndex(hoverIdx)}
            y1={MARGIN.top}
            y2={HEIGHT - MARGIN.bottom}
            stroke="var(--muted)"
            strokeWidth={1}
          />
        )}

        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIdx(null)}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-md dark:border-white/10 dark:bg-black"
          style={{
            left: `${tooltipLeftPct}%`,
            transform: tooltipAlignEnd ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          <div className="text-black/60 dark:text-white/60">
            {hovered.weekStart} ~ {hovered.weekEnd}
          </div>
          {hovered.pricePerKg != null ? (
            <>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-semibold text-black dark:text-white">{formatWon(hovered.pricePerKg)}원/kg</span>
                {hoveredWow != null && (
                  <span
                    className={hoveredWow >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                  >
                    {hoveredWow > 0 ? "+" : ""}
                    {hoveredWow.toFixed(1)}%
                  </span>
                )}
              </div>
              {carcassWeightKg != null && (
                <div className="mt-0.5 text-black/50 dark:text-white/50">
                  도체중 {carcassWeightKg}kg 기준 약 {formatWon(hovered.pricePerKg * carcassWeightKg)}원
                </div>
              )}
            </>
          ) : (
            <div className="mt-0.5 text-black/40 dark:text-white/40">거래 없음</div>
          )}
        </div>
      )}
    </div>
  );
}
