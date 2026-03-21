import { useMemo } from "react";

interface TemperatureRecord {
  year: number;
  region: string;
  regionId?: string;
  temperature: number;
  temperatureAnomaly: number;
  scenario: string;
  model: string;
}

interface Region {
  id: string;
  name: string;
  color: string;
}

interface Props {
  data: TemperatureRecord[];
  selectedYear: number;
  regions: Region[];
  selectedRegion: string | undefined;
  onSelectRegion: (id: string | undefined) => void;
}

export function RegionComparison({ data, selectedYear, regions, selectedRegion, onSelectRegion }: Props) {
  const nearestYear = useMemo(() => {
    const years = [...new Set(data.map((d) => d.year))].sort();
    if (!years.length) return selectedYear;
    return years.reduce((prev, curr) =>
      Math.abs(curr - selectedYear) < Math.abs(prev - selectedYear) ? curr : prev
    );
  }, [data, selectedYear]);

  const regionData = useMemo(() => {
    const yearData = data.filter((d) => d.year === nearestYear);
    return regions
      .map((region) => {
        const record = yearData.find((d) => d.region === region.name);
        return {
          ...region,
          anomaly: record?.temperatureAnomaly ?? 0,
          temperature: record?.temperature ?? 0,
        };
      })
      .sort((a, b) => b.anomaly - a.anomaly);
  }, [data, nearestYear, regions]);

  const maxAnomaly = Math.max(...regionData.map((d) => Math.abs(d.anomaly)), 1);

  return (
    <div className="p-4 space-y-1.5">
      {regionData.map((region) => {
        const isSelected = selectedRegion === region.id;
        const pct = Math.abs(region.anomaly) / maxAnomaly;
        const isPositive = region.anomaly >= 0;

        return (
          <button
            key={region.id}
            onClick={() => onSelectRegion(isSelected ? undefined : region.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left group ${
              isSelected
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-muted/60 border border-transparent"
            }`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: region.color }}
            />
            <span className="text-xs text-foreground flex-1 truncate">{region.name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 bg-muted/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct * 100}%`,
                    backgroundColor: isPositive ? "#EF4444" : "#3B82F6",
                  }}
                />
              </div>
              <span
                className="text-xs font-mono w-14 text-right font-medium"
                style={{ color: isPositive ? "#F87171" : "#60A5FA" }}
              >
                {isPositive ? "+" : ""}{region.anomaly.toFixed(2)}°C
              </span>
            </div>
          </button>
        );
      })}
      <p className="text-[10px] text-muted-foreground/50 text-center pt-1">
         Haz clic en una región para filtrar la línea de tiempo
      </p>
    </div>
  );
}
