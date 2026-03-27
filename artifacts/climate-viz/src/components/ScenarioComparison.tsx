import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useMemo, useState } from "react";
import * as d3 from "d3";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemperatureRecord {
  year: number;
  region: string;
  temperature: number;
  temperatureAnomaly: number;
  scenario: string;
  model: string;
}

interface AllScenariosData {
  ssp126: TemperatureRecord[];
  ssp245: TemperatureRecord[];
  ssp370: TemperatureRecord[];
  ssp585: TemperatureRecord[];
}

interface Props {
  selectedRegion?: string;
  regions: { id: string; name: string }[];
  allScenariosData: AllScenariosData;
  isLoading: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SSP_SCENARIOS = [
  { id: "ssp126" as keyof AllScenariosData, label: "SSP1-2.6", sublabel: "Sostenible", color: "#2eccb2" },
  { id: "ssp245" as keyof AllScenariosData, label: "SSP2-4.5", sublabel: "Intermedio", color: "#e5f785" },
  { id: "ssp370" as keyof AllScenariosData, label: "SSP3-7.0", sublabel: "Alto",       color: "#f96916" },
  { id: "ssp585" as keyof AllScenariosData, label: "SSP5-8.5", sublabel: "Muy alto",   color: "#df2938" },
] as const;

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-2">Año {label}</p>
      {sorted.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
          <span className="font-mono font-medium text-foreground">
            {entry.value > 0 ? "+" : ""}{entry.value.toFixed(2)}°C
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function aggregateByYear(
  records: TemperatureRecord[],
  regionName?: string,
): Map<number, number> {
  const filtered = regionName
    ? records.filter((d) => d.region === regionName)
    : records;
  const byYear = d3.group(filtered, (d) => d.year);
  const result = new Map<number, number>();
  byYear.forEach((rows, year) => {
    result.set(year, parseFloat((d3.mean(rows, (d: TemperatureRecord) => d.temperatureAnomaly) ?? 0).toFixed(3)));
  });
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScenarioComparison({ selectedRegion, regions, allScenariosData, isLoading }: Props) {
  const [localRegionName, setLocalRegionName] = useState<string | undefined>(
    selectedRegion ? regions.find((r) => r.id === selectedRegion)?.name : undefined,
  );

  const regionName = localRegionName;

  const allRegionNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(allScenariosData).forEach((records) =>
      records.forEach((d: TemperatureRecord) => names.add(d.region)),
    );
    return Array.from(names).sort();
  }, [allScenariosData]);

  const chartData = useMemo(() => {
    const maps = SSP_SCENARIOS.map((s) => ({
      id: s.id,
      label: s.label,
      byYear: aggregateByYear(allScenariosData[s.id], regionName),
    }));

    const allYears = new Set<number>();
    maps.forEach((m) => m.byYear.forEach((_, y) => allYears.add(y)));
    const years = Array.from(allYears).sort((a, b) => a - b);

    return years.map((year) => {
      const row: Record<string, any> = { year };
      maps.forEach((m) => {
        row[m.label] = m.byYear.get(year) ?? null;
      });
      return row;
    });
  }, [allScenariosData, regionName]);

  const displayLabel = regionName ?? "Global · promedio de todas las regiones";

  if (isLoading) {
    return (
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40">
          <h2 className="text-sm font-semibold text-foreground">Comparación de Escenarios SSP · 2015–2100</h2>
        </div>
        <div className="h-[320px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {SSP_SCENARIOS.map((s, i) => (
                <div
                  key={s.id}
                  className="w-1 h-8 rounded-full animate-pulse"
                  style={{ backgroundColor: s.color, animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Cargando escenarios…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Comparación de Escenarios SSP · 2015–2100
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{displayLabel}</p>
        </div>
      </div>

      {/* Region slider */}
      <div className="px-5 py-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground w-14 flex-shrink-0">Región</span>
          <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setLocalRegionName(undefined)}
              className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-md transition-all font-mono ${
                !regionName
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Global
            </button>
            {allRegionNames.map((name) => (
              <button
                key={name}
                onClick={() => setLocalRegionName(name)}
                className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-md transition-all font-mono ${
                  name === regionName
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-4 pt-2">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
            barCategoryGap="15%"
            barGap={1}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(215 28% 17%)"
              strokeOpacity={0.5}
              vertical={false}
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
              domain={[0, 6]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              iconType="square"
              iconSize={8}
            />
            <ReferenceLine
              y={0}
              stroke="hsl(215 28% 30%)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            {SSP_SCENARIOS.map((s) => (
              <Bar
                key={s.id}
                dataKey={s.label}
                fill={s.color}
                radius={[2, 2, 0, 0]}
                maxBarSize={6}
                name={`${s.label} · ${s.sublabel}`}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
          Haz clic en la region que desees filtrar y pasa por encima de las barras para ver datos de temperatura
        </p>
      </div>
    </div>
  );
}