import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export interface HumidityRecord {
  year: number;
  region: string;
  regionId: string;
  humidity: number;
  specificHumidity: number;
  scenario: string;
}

interface Region {
  id: string;
  name: string;
  color: string;
}

interface Props {
  data: HumidityRecord[];
  selectedYear: number;
  regions: Region[];
}

const DEFAULT_RADAR_COLOR = "hsl(211 100% 55%)";
const SECOND_RADAR_COLOR = "hsl(180 100% 50%)";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;

  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="flex items-center gap-2 font-semibold mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: item?.color ?? DEFAULT_RADAR_COLOR }}
        />
        {item?.region}
      </p>

      <p className="text-muted-foreground">
        Humedad:{" "}
        <span className="text-foreground font-mono">
          {Number(item?.humidity ?? 0).toFixed(2)} g/kg
        </span>
      </p>

      <p className="text-muted-foreground">
        Humedad específica:{" "}
        <span className="text-foreground font-mono">
          {Number(item?.specificHumidity ?? 0).toFixed(2)}
        </span>
      </p>
    </div>
  );
};

export function HumidityRadar({ data, selectedYear, regions }: Props) {
  const regionMap = useMemo(() => {
    const map = new Map<string, Region>();
    regions.forEach((region) => {
      map.set(region.id, region);
    });
    return map;
  }, [regions]);

  const nearestYear = useMemo(() => {
    const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
    if (!years.length) return selectedYear;

    return years.reduce((prev, curr) =>
      Math.abs(curr - selectedYear) < Math.abs(prev - selectedYear)
        ? curr
        : prev
    );
  }, [data, selectedYear]);

  const chartData = useMemo(() => {
    const yearData = data.filter((d) => d.year === nearestYear);

    return yearData
      .map((d) => {
        const regionMeta = regionMap.get(d.regionId);

        const regionName =
          regionMeta?.name ??
          regions.find(
            (r) =>
              r.name === d.region ||
              r.name.toLowerCase() === d.region.toLowerCase()
          )?.name ??
          d.region;

        const regionColor = regionMeta?.color ?? DEFAULT_RADAR_COLOR;

        return {
          region: regionName.replace(/ /g, "\n"),
          humidity: Number(d.humidity.toFixed(2)),
          specificHumidity: Number(d.specificHumidity.toFixed(2)),
          color: regionColor,
        };
      })
      .sort((a, b) => b.humidity - a.humidity);
  }, [data, nearestYear, regionMap, regions]);

  const maxHumidity = chartData.length
    ? Math.max(...chartData.map((d) => d.humidity), 1)
    : 1;

  const radarColor = chartData[0]?.color ?? DEFAULT_RADAR_COLOR;

  if (!chartData.length) {
    return (
      <div className="p-4">
        <div className="text-center mb-1">
          <span className="text-xs text-muted-foreground">
            Año:{" "}
            <span className="text-primary font-mono font-medium">
              {nearestYear}
            </span>
          </span>
        </div>

        <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
          No hay datos suficientes para mostrar el radar.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="text-center mb-1">
        <span className="text-xs text-muted-foreground">
          Año:{" "}
          <span className="text-primary font-mono font-medium">
            {nearestYear}
          </span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="72%"
          data={chartData}
        >
          <PolarGrid stroke="hsl(215 28% 17%)" />
          <PolarAngleAxis
            dataKey="region"
            tick={{ fill: "hsl(215 16% 55%)", fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxHumidity]}
            tick={{ fill: "hsl(215 16% 40%)", fontSize: 9 }}
            tickCount={4}
          />

          <Radar
            name="Humedad"
            dataKey="humidity"
            stroke={radarColor}
            fill={radarColor}
            fillOpacity={0.18}
            strokeWidth={1.5}
            isAnimationActive={true}
          />

          <Radar
            name="Humedad específica"
            dataKey="specificHumidity"
            stroke={SECOND_RADAR_COLOR}
            fill="none"
            strokeWidth={1.5}
            isAnimationActive={true}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            iconType="plainline"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}