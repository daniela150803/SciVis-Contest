import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useMemo } from "react";

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

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{payload[0]?.payload?.region}</p>
      <p className="text-muted-foreground">
        HR: <span className="text-foreground font-mono">{payload[0]?.value?.toFixed(1)}%</span>
      </p>
    </div>
  );
};

export function HumidityRadar({ data, selectedYear, regions }: Props) {
  const nearestYear = useMemo(() => {
    const years = [...new Set(data.map((d) => d.year))].sort();
    if (!years.length) return selectedYear;
    return years.reduce((prev, curr) =>
      Math.abs(curr - selectedYear) < Math.abs(prev - selectedYear) ? curr : prev
    );
  }, [data, selectedYear]);

  const chartData = useMemo(() => {
    const yearData = data.filter((d) => d.year === nearestYear);
    return yearData.map((d) => ({
      region: d.region.replace(" ", "\n"),
      humidity: parseFloat(d.humidity.toFixed(1)),
      specificHumidity: parseFloat(d.specificHumidity.toFixed(2)),
    }));
  }, [data, nearestYear]);

  return (
    <div className="p-4">
      <div className="text-center mb-1">
        <span className="text-xs text-muted-foreground">
          Año: <span className="text-primary font-mono font-medium">{nearestYear}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid stroke="hsl(215 28% 17%)" />
          <PolarAngleAxis
            dataKey="region"
            tick={{ fill: "hsl(215 16% 55%)", fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(215 16% 40%)", fontSize: 9 }}
            tickCount={4}
          />
          <Radar
            name="Humedad Relativa %"
            dataKey="humidity"
            stroke="hsl(211 100% 55%)"
            fill="hsl(211 100% 55%)"
            fillOpacity={0.18}
            strokeWidth={1.5}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}