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
  comparisonYear: number;
  selectedYear: number;
}

type ChartItem = {
  region: string;
  humidityComparison: number;
  humiditySelected: number;
  tempComparison: number;
  tempSelected: number;
};

function temperatureToColor(temp: number, minTemp: number, maxTemp: number) {
  if (maxTemp === minTemp) return "hsl(220 90% 55%)";

  const t = (temp - minTemp) / (maxTemp - minTemp);
  const clamped = Math.max(0, Math.min(1, t));
  const hue = 220 - clamped * 220;
  return `hsl(${hue} 90% 55%)`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;

  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="font-semibold mb-2">{item?.region}</p>

      <div className="space-y-2">
        <div className="border-t border-border/40 pt-2 first:border-t-0 first:pt-0">
          <p className="text-foreground font-medium">{item?.comparisonYearLabel}</p>
          <p className="text-muted-foreground">
            Humedad:{" "}
            <span className="text-foreground font-mono">
              {Number(item?.humidityComparison ?? 0).toFixed(2)} g/kg
            </span>
          </p>
          <p className="text-muted-foreground">
            Temperatura:{" "}
            <span className="text-foreground font-mono">
              {Number(item?.tempComparison ?? 0).toFixed(2)} °C
            </span>
          </p>
        </div>

        <div className="border-t border-border/40 pt-2">
          <p className="text-foreground font-medium">{item?.selectedYearLabel}</p>
          <p className="text-muted-foreground">
            Humedad:{" "}
            <span className="text-foreground font-mono">
              {Number(item?.humiditySelected ?? 0).toFixed(2)} g/kg
            </span>
          </p>
          <p className="text-muted-foreground">
            Temperatura:{" "}
            <span className="text-foreground font-mono">
              {Number(item?.tempSelected ?? 0).toFixed(2)} °C
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
  comparisonYear,
  selectedYear,
}: Props) {
  const chartData = useMemo(() => {
    const humidityComparison = humidityData.filter((d) => d.year === comparisonYear);
    const humiditySelected = humidityData.filter((d) => d.year === selectedYear);

    const temperatureComparison = temperatureData.filter((d) => d.year === comparisonYear);
    const temperatureSelected = temperatureData.filter((d) => d.year === selectedYear);

    const humidityComparisonMap = new Map(
      humidityComparison.map((d) => [d.region, d.humidity])
    );
    const humiditySelectedMap = new Map(
      humiditySelected.map((d) => [d.region, d.humidity])
    );

    const temperatureComparisonMap = new Map(
      temperatureComparison.map((d) => [d.region, d.temperature])
    );
    const temperatureSelectedMap = new Map(
      temperatureSelected.map((d) => [d.region, d.temperature])
    );

    const regions = Array.from(
      new Set([
        ...humidityComparison.map((d) => d.region),
        ...humiditySelected.map((d) => d.region),
      ])
    );

    return regions
      .map((region) => ({
        region,
        humidityComparison: Number((humidityComparisonMap.get(region) ?? 0).toFixed(2)),
        humiditySelected: Number((humiditySelectedMap.get(region) ?? 0).toFixed(2)),
        tempComparison: Number((temperatureComparisonMap.get(region) ?? 0).toFixed(2)),
        tempSelected: Number((temperatureSelectedMap.get(region) ?? 0).toFixed(2)),
        comparisonYearLabel: `${comparisonYear}`,
        selectedYearLabel: `${selectedYear}`,
      }))
      .sort((a, b) => b.humiditySelected - a.humiditySelected);
  }, [humidityData, temperatureData, comparisonYear, selectedYear]);

  const tempValues = chartData.flatMap((d) => [d.tempComparison, d.tempSelected]);
  const minTemp = tempValues.length ? Math.min(...tempValues) : 0;
  const maxTemp = tempValues.length ? Math.max(...tempValues) : 1;

  const maxHumidity = Math.max(
    ...chartData.flatMap((d) => [d.humidityComparison, d.humiditySelected]),
    1
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          Comparación:{" "}
          <span className="text-primary font-mono font-medium">{comparisonYear}</span> vs{" "}
          <span className="text-primary font-mono font-medium">{selectedYear}</span>
        </span>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
          <span className="w-3 h-3 rounded-sm bg-sky-500" />
          Frío
          <span className="w-3 h-3 rounded-sm bg-red-500 ml-2" />
          Caliente
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
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

          <Bar
            dataKey="humidityComparison"
            name={`Humedad ${comparisonYear}`}
            radius={[6, 6, 0, 0]}
          >
            {chartData.map((entry) => (
              <Cell
                key={`cmp-${entry.region}`}
                fill={temperatureToColor(entry.tempComparison, minTemp, maxTemp)}
              />
            ))}
          </Bar>

          <Bar
            dataKey="humiditySelected"
            name={`Humedad ${selectedYear}`}
            radius={[6, 6, 0, 0]}
          >
            {chartData.map((entry) => (
              <Cell
                key={`sel-${entry.region}`}
                fill={temperatureToColor(entry.tempSelected, minTemp, maxTemp)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}