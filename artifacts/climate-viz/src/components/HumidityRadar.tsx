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
  baseYear?: number; // año de referencia, por defecto el primer año del dataset
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  const pct = item?.pctChange ?? 0;
  const absVal = item?.rawHumidity ?? 0;
  const baseVal = item?.baseHumidity ?? 0;

  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="font-semibold mb-1">{item?.regionLabel}</p>
      <div className="flex items-center gap-1 mb-0.5">
        <span
          className={`text-base font-mono font-bold ${
            pct > 0 ? "text-blue-400" : pct < 0 ? "text-orange-400" : "text-muted-foreground"
          }`}
        >
          {pct > 0 ? "+" : ""}{Number(pct).toFixed(1)}%
        </span>
        <span className="text-muted-foreground">vs año base</span>
      </div>
      <p className="text-muted-foreground">
        Actual:{" "}
        <span className="text-foreground font-mono">{Number(absVal).toFixed(3)} g/kg</span>
      </p>
      <p className="text-muted-foreground">
        Base:{" "}
        <span className="text-foreground font-mono">{Number(baseVal).toFixed(3)} g/kg</span>
      </p>
    </div>
  );
};

export function HumidityRadar({ data, selectedYear, regions, baseYear }: Props) {
  // Año más cercano al seleccionado
  const nearestYear = useMemo(() => {
    const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
    if (!years.length) return selectedYear;
    return years.reduce((prev, curr) =>
      Math.abs(curr - selectedYear) < Math.abs(prev - selectedYear) ? curr : prev
    );
  }, [data, selectedYear]);

  // Año base: el primero del dataset si no se especifica
  const resolvedBaseYear = useMemo(() => {
    if (baseYear != null) return baseYear;
    const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
    return years[0] ?? selectedYear;
  }, [data, baseYear, selectedYear]);

  // Valor base por región (año de referencia)
  const baseValues = useMemo(() => {
    const map = new Map<string, number>();
    const baseData = data.filter((d) => d.year === resolvedBaseYear);
    for (const d of baseData) {
      map.set(d.regionId, d.humidity);
    }
    // fallback: si no hay dato exacto, usar el año más cercano disponible por región
    if (baseData.length === 0) {
      const regionIds = [...new Set(data.map((d) => d.regionId))];
      for (const rid of regionIds) {
        const regionData = data.filter((d) => d.regionId === rid).sort((a, b) =>
          Math.abs(a.year - resolvedBaseYear) - Math.abs(b.year - resolvedBaseYear)
        );
        if (regionData[0]) map.set(rid, regionData[0].humidity);
      }
    }
    return map;
  }, [data, resolvedBaseYear]);

  // Rango máximo de variación % en TODO el dataset → dominio fijo del eje
  const maxAbsPct = useMemo(() => {
    let max = 0;
    for (const d of data) {
      const base = baseValues.get(d.regionId);
      if (!base) continue;
      const pct = Math.abs(((d.humidity - base) / base) * 100);
      if (pct > max) max = pct;
    }
    // mínimo de ±5% para que el gráfico no colapse si los datos son muy similares
    return Math.max(max, 5);
  }, [data, baseValues]);

  const chartData = useMemo(() => {
    const yearData = data.filter((d) => d.year === nearestYear);

    return yearData.map((d) => {
      const regionName =
        regions.find((r) => r.id === d.regionId)?.name ??
        regions.find((r) => r.name.toLowerCase() === d.region.toLowerCase())?.name ??
        d.region;

      const base = baseValues.get(d.regionId) ?? d.humidity;
      const pct = base !== 0 ? ((d.humidity - base) / base) * 100 : 0;

      return {
        region: regionName.replace(/ /g, "\n"),
        regionLabel: regionName,
        // Valor que usa Recharts: % de cambio respecto al año base
        humidity: Number(pct.toFixed(3)),
        rawHumidity: d.humidity,
        baseHumidity: base,
        pctChange: pct,
      };
    });
  }, [data, nearestYear, regions, baseValues]);

  // Dominio simétrico fijo para todos los años
  const axisDomain: [number, number] = [-maxAbsPct, maxAbsPct];

  const isBaseYear = nearestYear === resolvedBaseYear;

  return (
    <div className="p-4">
      <div className="text-center mb-2 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          Año:{" "}
          <span className="text-primary font-mono font-medium">{nearestYear}</span>
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
          base: {resolvedBaseYear}
        </span>
        {isBaseYear && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono">
            año base = sin cambio
          </span>
        )}
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
            domain={axisDomain}
            tick={{ fill: "hsl(215 16% 40%)", fontSize: 9 }}
            tickCount={5}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%`}
          />
          <Radar
            name="Humedad"
            dataKey="humidity"
            stroke="hsl(211 100% 55%)"
            fill="hsl(211 100% 55%)"
            fillOpacity={0.18}
            strokeWidth={1.5}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      <p className="text-center text-[10px] text-muted-foreground mt-1">
        cada eje = cambio % respecto a {resolvedBaseYear} · externo = más húmedo · interno = más seco
      </p>
    </div>
  );
}