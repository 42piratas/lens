"use client";

import { useMemo } from "react";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import type { LayoutCard } from "@/connectors/types";
import { getTileAdapter } from "..";
import {
  TileEmpty,
  TileErrorPill,
  TileSkeleton,
  TileUnconfigured,
} from "../_shared/states";
import type { ChartLineData, ChartLinePoint } from "./types";

const MARGIN = { top: 12, right: 16, bottom: 28, left: 36 };

export function DataChartLineTile({ card }: { card: LayoutCard }) {
  const adapter = getTileAdapter(card);
  if (!adapter) return null;
  const { data, isLoading, error } = adapter.useData(card) as {
    data: ChartLineData | undefined;
    isLoading: boolean;
    error: unknown;
  };

  if (isLoading) return <TileSkeleton />;
  if (error) return <TileErrorPill error={error} />;
  if (!data) return <TileUnconfigured hint="Set up — gear icon" />;
  if (data.series.length === 0 || data.series.every((s) => s.points.length === 0)) {
    return <TileEmpty hint="No data in range" />;
  }

  return (
    <div className="lens-card-surface lens-chart-line-shell">
      <ParentSize>
        {({ width, height }) =>
          width > 0 && height > 0 ? (
            <ChartBody width={width} height={height} data={data} />
          ) : null
        }
      </ParentSize>
    </div>
  );
}

function ChartBody({
  width,
  height,
  data,
}: {
  width: number;
  height: number;
  data: ChartLineData;
}) {
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const xValues = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of data.series) {
      for (const p of s.points) {
        const key = String(p.x);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(key);
        }
      }
    }
    return out;
  }, [data]);

  const yExtent = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of data.series) {
      for (const p of s.points) {
        if (p.y < min) min = p.y;
        if (p.y > max) max = p.y;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1] as const;
    if (min === max) return [min - 1, max + 1] as const;
    const pad = (max - min) * 0.08;
    return [min - pad, max + pad] as const;
  }, [data]);

  const xScale = useMemo(
    () =>
      scalePoint<string>({
        domain: xValues,
        range: [0, innerW],
        padding: 0.1,
      }),
    [xValues, innerW],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [yExtent[0], yExtent[1]],
        range: [innerH, 0],
        nice: true,
      }),
    [yExtent, innerH],
  );

  const tickCountY = Math.max(2, Math.min(6, Math.floor(innerH / 36)));
  const labelStep = Math.max(1, Math.ceil(xValues.length / Math.max(1, Math.floor(innerW / 56))));
  const visibleXTicks = xValues.filter((_, i) => i % labelStep === 0);

  const formatXTick = (v: string): string => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d
      .toLocaleDateString("en-US", { month: "short", day: "numeric" })
      .toUpperCase();
  };

  return (
    <svg width={width} height={height} role="img" aria-label="Line chart">
      <Group left={MARGIN.left} top={MARGIN.top}>
        <GridRows
          scale={yScale}
          width={innerW}
          numTicks={tickCountY}
          stroke="var(--chart-grid)"
          strokeOpacity={0.7}
          strokeDasharray="2,3"
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          tickValues={visibleXTicks}
          tickFormat={(v) => formatXTick(v as string)}
          stroke="var(--chart-axis)"
          tickStroke="var(--chart-axis)"
          tickLabelProps={() => ({
            fill: "var(--chart-axis)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            textAnchor: "middle",
          })}
        />
        <AxisLeft
          scale={yScale}
          numTicks={tickCountY}
          stroke="var(--chart-axis)"
          tickStroke="var(--chart-axis)"
          tickLabelProps={() => ({
            fill: "var(--chart-axis)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            textAnchor: "end",
            dy: "0.32em",
            dx: "-0.25em",
          })}
        />
        {data.series.map((s) => (
          <LinePath<ChartLinePoint>
            key={s.id}
            data={s.points}
            x={(p) => xScale(String(p.x)) ?? 0}
            y={(p) => yScale(p.y)}
            stroke={s.color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {data.series.map((s) =>
          s.points.map((p, i) => (
            <circle
              key={`${s.id}-${i}`}
              cx={xScale(String(p.x)) ?? 0}
              cy={yScale(p.y)}
              r={2.5}
              fill={s.color}
            />
          )),
        )}
      </Group>
      {data.series.length > 1 && (
        <Group left={MARGIN.left} top={4}>
          {data.series.map((s, i) => (
            <Group key={s.id} left={i * 96}>
              <rect width={10} height={2} y={6} fill={s.color} rx={1} />
              <text
                x={14}
                y={10}
                fill="var(--chart-axis)"
                fontFamily="var(--font-mono)"
                fontSize={11}
              >
                {s.label}
              </text>
            </Group>
          ))}
        </Group>
      )}
    </svg>
  );
}
