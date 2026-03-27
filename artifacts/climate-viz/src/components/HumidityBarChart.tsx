import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
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

function temperatureToColor(temp: number, min: number, max: number) {
  if (max === min) return "hsl(220 90% 55%)";
  const t = (temp - min) / (max - min);
  const hue = 220 - Math.max(0, Math.min(1, t)) * 220;
  return `hsl(${hue} 90% 55%)`;
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

/* 🔥 TOOLTIP CORRECTO (COMPARA AMBOS) */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;

  return (
    <div className="bg-card/95 backdrop-blur border rounded px-3 py-2 text-xs">
      <p className="font-semibold mb-2">{data.region}</p>

      <p>
        {data.leftLabel}
        <br />
        Humedad: {data.humidityLeft.toFixed(2)} g/kg
        <br />
        Temp: {data.tempLeft.toFixed(2)} °C
      </p>

      <p className="mt-2">
        {data.rightLabel}
        <br />
        Humedad: {data.humidityRight.toFixed(2)} g/kg
        <br />
        Temp: {data.tempRight.toFixed(2)} °C
      </p>
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

    const tL = avgByRegion(temperatureData, leftStart, leftEnd, (d) => d.temperature);
    const tR = avgByRegion(temperatureData, rightStart, rightEnd, (d) => d.temperature);

    return Array.from(new Set(humidityData.map((d) => d.region))).map((r) => ({
      region: r,
      humidityLeft: Number((hL.get(r) ?? 0).toFixed(2)),
      humidityRight: Number((hR.get(r) ?? 0).toFixed(2)),
      tempLeft: Number((tL.get(r) ?? 0).toFixed(2)),
      tempRight: Number((tR.get(r) ?? 0).toFixed(2)),
      leftLabel: `${leftStart}-${leftEnd}`,
      rightLabel: `${rightStart}-${rightEnd}`,
    }));
  }, [humidityData, temperatureData, boundaryYear]);

  const temps = chartData.flatMap((d) => [d.tempLeft, d.tempRight]);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  const maxHumidity = Math.max(
    ...chartData.flatMap((d) => [d.humidityLeft, d.humidityRight]),
    1
  );

  return (
    <div className="p-4">
      <div className="text-xs text-muted-foreground mb-2">
        {chartData[0]?.leftLabel} vs {chartData[0]?.rightLabel}
      </div>

      <div className="flex justify-between px-8 mb-1">
        {chartData.map((d) => (
          <div
            key={d.region}
            className="flex-1 flex justify-center gap-2 text-[9px] text-muted-foreground"
          >
            <span className="opacity-70">{d.tempLeft.toFixed(1)}°</span>
            <span className="font-semibold">{d.tempRight.toFixed(1)}°</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={330}>
        <BarChart data={chartData}>
          <XAxis dataKey="region" angle={-25} textAnchor="end" height={60} />

          <YAxis
            domain={[0, maxHumidity]}
            tickFormatter={(value: number) =>
              value >= 10
                ? Math.round(value).toString()
                : value.toFixed(1)
            }
          />

          {/* 🔥 AQUÍ SE USA EL TOOLTIP CORRECTO */}
          <Tooltip content={<CustomTooltip />} />

          <Legend />

          <Bar dataKey="humidityLeft" name="Rango anterior">
            {chartData.map((d) => (
              <Cell
                key={d.region + "l"}
                fill={temperatureToColor(d.tempLeft, minTemp, maxTemp)}
              />
            ))}
          </Bar>

          <Bar dataKey="humidityRight" name="Rango actual">
            {chartData.map((d) => (
              <Cell
                key={d.region + "r"}
                fill={temperatureToColor(d.tempRight, minTemp, maxTemp)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}