import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

export interface HumidityRecord {
  year: number;
  region: string;
  regionId?: string;
  humidity: number;
  specificHumidity: number;
  scenario: string;
}

export interface TemperatureRecord {
  year: number;
  region: string;
  regionId?: string;
  temperature: number;
  scenario: string;
}

interface Props {
  humidityData: HumidityRecord[];
  temperatureData: TemperatureRecord[];
  boundaryYear: number;
}

type ChartItem = {
  region: string;
  humidityLeft: number;
  humidityRight: number;
  tempLeft: number;
  tempRight: number;
  leftLabel: string;
  rightLabel: string;
};

const WINDOW_SIZE = 10;
const DATA_MIN_YEAR = 2015;
const DATA_MAX_YEAR = 2100;

function temperatureToColor(temp: number, minTemp: number, maxTemp: number) {
  if (maxTemp === minTemp) return "hsl(220 90% 55%)";

  const t = (temp - minTemp) / (maxTemp - minTemp);
  const clamped = Math.max(0, Math.min(1, t));
  const hue = 220 - clamped * 220;
  return `hsl(${hue} 90% 55%)`;
}

function averageByRegion<T extends { region: string; year: number }>(
  records: T[],
  startYear: number,
  endYear: number,
  valueGetter: (item: T) => number
) {
  const filtered = records.filter((d) => d.year >= startYear && d.year < endYear);
  const groups = new Map<string, number[]>();

  for (const item of filtered) {
    const arr = groups.get(item.region) ?? [];
    arr.push(valueGetter(item));
    groups.set(item.region, arr);
  }

  const result = new Map<string, number>();
  for (const [region, values] of groups.entries()) {
    if (!values.length) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    result.set(region, avg);
  }

  return result;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;

  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="font-semibold mb-2">{item?.region}</p>

      <div className="space-y-2">
        <div className="border-t border-border/40 pt-2 first:border-t-0 first:pt-0">
          <p className="text-foreground font-medium">{item?.leftLabel}</p>
          <p className="text-muted-foreground">
            Humedad:{" "}
            <span className="text-foreground font-mono">
              {Number(item?.humidityLeft ?? 0).toFixed(2)} g/kg
            </span>
          </p>
          <p className="text-muted-foreground">
            Temperatura:{" "}
            <span className="text-foreground font-mono">
              {Number(item?.tempLeft ?? 0).toFixed(2)} °C
            </span>
          </p>
        </div>

        <div className="border-t border-border/40 pt-2">
          <p className="text-foreground font-medium">{item?.rightLabel}</p>
          <p className="text-muted-foreground">
            Humedad:{" "}
            <span className="text-foreground font-mono">
              {Number(item?.humidityRight ?? 0).toFixed(2)} g/kg
            </span>
          </p>
          <p className="text-muted-foreground">
            Temperatura:{" "}
            <span className="text-foreground font-mono">
              {Number(item?.tempRight ?? 0).toFixed(2)} °C
            </span>
          </p>
        </div>
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
    const normalizedBoundary = Math.max(
      DATA_MIN_YEAR + WINDOW_SIZE,
      Math.min(boundaryYear, DATA_MAX_YEAR)
    );

    const rightEnd = normalizedBoundary;
    const rightStart = Math.max(DATA_MIN_YEAR, rightEnd - WINDOW_SIZE);

    const leftEnd = rightStart;
    const leftStart = Math.max(DATA_MIN_YEAR, leftEnd - WINDOW_SIZE);

    const humidityLeft = averageByRegion(
      humidityData,
      leftStart,
      leftEnd,
      (d) => d.humidity
    );
    const humidityRight = averageByRegion(
      humidityData,
      rightStart,
      rightEnd,
      (d) => d.humidity
    );

    const tempLeft = averageByRegion(
      temperatureData,
      leftStart,
      leftEnd,
      (d) => d.temperature
    );
    const tempRight = averageByRegion(
      temperatureData,
      rightStart,
      rightEnd,
      (d) => d.temperature
    );

    const regions = Array.from(
      new Set([
        ...humidityData
          .filter((d) => d.year >= leftStart && d.year <= rightEnd)
          .map((d) => d.region),
        ...temperatureData
          .filter((d) => d.year >= leftStart && d.year <= rightEnd)
          .map((d) => d.region),
      ])
    );

    return regions
      .map((region) => ({
        region,
        humidityLeft: Number((humidityLeft.get(region) ?? 0).toFixed(2)),
        humidityRight: Number((humidityRight.get(region) ?? 0).toFixed(2)),
        tempLeft: Number((tempLeft.get(region) ?? 0).toFixed(2)),
        tempRight: Number((tempRight.get(region) ?? 0).toFixed(2)),
        leftLabel: `${leftStart}-${leftEnd}`,
        rightLabel: `${rightStart}-${rightEnd}`,
      }))
      .sort((a, b) => b.humidityRight - a.humidityRight);
  }, [humidityData, temperatureData, boundaryYear]);

  const tempValues = chartData.flatMap((d) => [d.tempLeft, d.tempRight]);
  const minTemp = tempValues.length ? Math.min(...tempValues) : 0;
  const maxTemp = tempValues.length ? Math.max(...tempValues) : 1;

  const maxHumidity = Math.max(
    ...chartData.flatMap((d) => [d.humidityLeft, d.humidityRight]),
    1
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          Comparación por rango:{" "}
          <span className="text-primary font-mono font-medium">
            {Math.max(DATA_MIN_YEAR, Math.min(boundaryYear, DATA_MAX_YEAR) - WINDOW_SIZE)}-
            {Math.max(DATA_MIN_YEAR, Math.min(boundaryYear, DATA_MAX_YEAR) - WINDOW_SIZE + WINDOW_SIZE)}
          </span>{" "}
          vs{" "}
          <span className="text-primary font-mono font-medium">
            {Math.max(DATA_MIN_YEAR, Math.min(boundaryYear, DATA_MAX_YEAR) - WINDOW_SIZE + 0)}-
            {Math.max(DATA_MIN_YEAR, Math.min(boundaryYear, DATA_MAX_YEAR))}
          </span>
        </span>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
          <span className="w-3 h-3 rounded-sm bg-sky-500" />
          Frío
          <span className="w-3 h-3 rounded-sm bg-red-500 ml-2" />
          Caliente
        </div>
      </div>

      <ResponsiveContainer width="100%" height={330}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 45 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
          <XAxis
            dataKey="region"
            tick={{ fill: "hsl(215 16% 55%)", fontSize: 10 }}
            angle={-25}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis
            domain={[0, maxHumidity]}
            tick={{ fill: "hsl(215 16% 55%)", fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <Bar dataKey="humidityLeft" name="Rango anterior" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={`left-${entry.region}`}
                fill={temperatureToColor(entry.tempLeft, minTemp, maxTemp)}
              />
            ))}
          </Bar>

          <Bar dataKey="humidityRight" name="Rango actual" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={`right-${entry.region}`}
                fill={temperatureToColor(entry.tempRight, minTemp, maxTemp)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}