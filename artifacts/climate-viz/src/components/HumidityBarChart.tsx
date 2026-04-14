import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface HumidityRecord {
  year: number;
  region: string;
  humidity: number;
  specificHumidity: number;
  scenario: string;
}

export interface TemperatureRecord {
  year: number;
  region: string;
  temperature: number;
  scenario: string;
}

interface Props {
  humidityData: HumidityRecord[];
  temperatureData: TemperatureRecord[];
  boundaryYear: number;
}

const WINDOW_SIZE = 10;
const DATA_MIN_YEAR = 2015;
const DATA_MAX_YEAR = 2100;

const GLOBE_COLOR_STOPS = [
  "#153DA0",
  "#2E8CCC",
  "#8CCCE6",
  "#F3FCDB",
  "#FCCD4D",
  "#FC9F3D",
  "#F24D24",
  "#B21717",
];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

function interpolateColor(a: string, b: string, t: number) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);

  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

function temperatureToGlobeColor(temp: number, min: number, max: number) {
  if (max === min) return GLOBE_COLOR_STOPS[1];

  const t = clamp01((temp - min) / (max - min));
  const scaled = t * (GLOBE_COLOR_STOPS.length - 1);
  const i = Math.min(GLOBE_COLOR_STOPS.length - 2, Math.floor(scaled));
  const frac = scaled - i;

  return interpolateColor(GLOBE_COLOR_STOPS[i], GLOBE_COLOR_STOPS[i + 1], frac);
}

function avgByRegion<T extends { region: string; year: number }>(
  data: T[],
  start: number,
  end: number,
  getter: (d: T) => number
) {
  const map = new Map<string, number[]>();

  data
    .filter((d) => d.year >= start && d.year < end)
    .forEach((d) => {
      const arr = map.get(d.region) ?? [];
      arr.push(getter(d));
      map.set(d.region, arr);
    });

  const res = new Map<string, number>();
  map.forEach((vals, r) => {
    if (!vals.length) return;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    res.set(r, avg);
  });

  return res;
}

function uniqueRegions(
  humidityData: HumidityRecord[],
  temperatureData: TemperatureRecord[]
) {
  return Array.from(
    new Set([
      ...humidityData.map((d) => d.region),
      ...temperatureData.map((d) => d.region),
    ])
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const deltaHumidity = data.humidityRight - data.humidityLeft;

  return (
    <div className="bg-card/95 backdrop-blur border rounded px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold mb-2">{data.region}</p>

      <p className="mb-2">
        <span className="font-medium">{data.leftLabel}</span>
        <br />
        Humedad: {data.humidityLeft.toFixed(2)} g/kg
        <br />
        Temp: {data.tempLeft.toFixed(2)} °C
      </p>

      <p>
        <span className="font-medium">{data.rightLabel}</span>
        <br />
        Humedad: {data.humidityRight.toFixed(2)} g/kg
        <br />
        Temp: {data.tempRight.toFixed(2)} °C
      </p>

      <div className="mt-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
        Δ Humedad: {deltaHumidity >= 0 ? "+" : ""}
        {deltaHumidity.toFixed(2)} g/kg
      </div>
    </div>
  );
};

export function HumidityBarChart({
  humidityData,
  temperatureData,
  boundaryYear,
}: Props) {
  const chartData = useMemo(() => {
    const b = Math.max(
      DATA_MIN_YEAR + WINDOW_SIZE,
      Math.min(boundaryYear, DATA_MAX_YEAR)
    );

    const rightEnd = b;
    const rightStart = b - WINDOW_SIZE;

    const leftEnd = rightStart;
    const leftStart = leftEnd - WINDOW_SIZE;

    const hL = avgByRegion(humidityData, leftStart, leftEnd, (d) => d.humidity);
    const hR = avgByRegion(humidityData, rightStart, rightEnd, (d) => d.humidity);

    const tL = avgByRegion(
      temperatureData,
      leftStart,
      leftEnd,
      (d) => d.temperature
    );
    const tR = avgByRegion(
      temperatureData,
      rightStart,
      rightEnd,
      (d) => d.temperature
    );

    const regions = uniqueRegions(humidityData, temperatureData);

    return regions.map((r) => ({
      region: r,
      humidityLeft: Number((hL.get(r) ?? 0).toFixed(2)),
      humidityRight: Number((hR.get(r) ?? 0).toFixed(2)),
      tempLeft: Number((tL.get(r) ?? 0).toFixed(2)),
      tempRight: Number((tR.get(r) ?? 0).toFixed(2)),
      leftLabel: `${leftStart}-${leftEnd}`,
      rightLabel: `${rightStart}-${rightEnd}`,
    }));
  }, [humidityData, temperatureData, boundaryYear]);

  const temps = useMemo(
    () => chartData.flatMap((d) => [d.tempLeft, d.tempRight]),
    [chartData]
  );

  const minTemp = temps.length ? Math.min(...temps) : 0;
  const maxTemp = temps.length ? Math.max(...temps) : 1;

  const maxHumidity = chartData.length
    ? Math.max(...chartData.flatMap((d) => [d.humidityLeft, d.humidityRight]), 1)
    : 1;

  const tempScaleLabel = `${minTemp.toFixed(1)}° - ${maxTemp.toFixed(1)}°`;

  if (!chartData.length) {
    return (
      <div className="p-4">
        <div className="text-xs text-muted-foreground">
          No hay datos suficientes para construir la comparación.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 px-1 mb-3">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Temp
        </span>

        <div className="h-2 flex-1 overflow-hidden rounded-full border border-border/60">
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(to right, ${GLOBE_COLOR_STOPS.join(
                ", "
              )})`,
            }}
          />
        </div>

        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {tempScaleLabel}
        </span>
      </div>

      <div className="text-xs text-muted-foreground mb-2 px-1">
        {chartData[0]?.leftLabel} vs {chartData[0]?.rightLabel}
      </div>

      <ResponsiveContainer width="100%" height={330}>
        <BarChart data={chartData} barCategoryGap={18}>
          <XAxis dataKey="region" angle={-25} textAnchor="end" height={60} />

          <YAxis
            domain={[0, maxHumidity]}
            tickFormatter={(value: number) =>
              value >= 10 ? Math.round(value).toString() : value.toFixed(1)
            }
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="humidityLeft">
            {chartData.map((d) => (
              <Cell
                key={`${d.region}-left`}
                fill={temperatureToGlobeColor(d.tempLeft, minTemp, maxTemp)}
              />
            ))}
          </Bar>

          <Bar dataKey="humidityRight">
            {chartData.map((d) => (
              <Cell
                key={`${d.region}-right`}
                fill={temperatureToGlobeColor(d.tempRight, minTemp, maxTemp)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}