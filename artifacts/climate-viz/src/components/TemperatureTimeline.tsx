import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useMemo } from "react";

interface TemperatureRecord {
  year: number;
  region: string;
  temperature: number;
  temperatureAnomaly: number;
  scenario: string;
  model: string;
}

interface Region {
  id: string;
  name: string;
  lat: number;
  lon: number;
  color: string;
}

interface Props {
  data: TemperatureRecord[];
  regions: Region[];
  selectedRegion: string | undefined;
  onYearChange: (year: number) => void;
  scenario: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-2">Año {label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground truncate max-w-[120px]">{entry.name}</span>
          </div>
          <span className="font-mono font-medium text-foreground">
            {entry.value > 0 ? "+" : ""}{entry.value.toFixed(2)}°C
          </span>
        </div>
      ))}
    </div>
  );
};

export function TemperatureTimeline({ data, regions, selectedRegion, onYearChange, scenario }: Props) {
  const filteredRegions = useMemo(() => {
    if (selectedRegion) {
      return regions.filter((r) => r.id === selectedRegion);
    }
    return regions;
  }, [regions, selectedRegion]);

  const chartData = useMemo(() => {
    const years = [...new Set(data.map((d) => d.year))].sort();
    return years.map((year) => {
      const row: Record<string, any> = { year };
      for (const region of filteredRegions) {
        const record = data.find((d) => d.year === year && d.region === region.name);
        if (record) {
          row[region.name] = parseFloat(record.temperatureAnomaly.toFixed(3));
        }
      }
      return row;
    });
  }, [data, filteredRegions]);

  const handleClick = (e: any) => {
    if (e?.activePayload?.length && e.activeLabel) {
      onYearChange(parseInt(e.activeLabel));
    }
  };

  const displayRegions = filteredRegions.slice(0, 8);

  return (
    <div className="px-2 pb-4 pt-2">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(215 28% 17%)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="year"
            tick={{ fill: "hsl(215 16% 55%)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(215 28% 17%)" }}
          />
          <YAxis
            tick={{ fill: "hsl(215 16% 55%)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}°C`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            iconType="circle"
            iconSize={8}
          />
          <ReferenceLine
            y={0}
            stroke="hsl(215 28% 30%)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          {displayRegions.map((region) => (
            <Line
              key={region.id}
              type="monotone"
              dataKey={region.name}
              stroke={region.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
        Haz clic en cualquier punto para fijar el año del globo · Anomalía vs línea base 1981–2010
      </p>
    </div>
  );
}
