import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TemperatureRecord {
  year: number;
  region: string;
  temperature: number;
  temperatureAnomaly: number;
  scenario: string;
  model: string;
}

interface HumidityRecord {
  year: number;
  region: string;
  humidity: number;
  specificHumidity: number;
  scenario: string;
}

interface Scenario {
  id: string;
  name: string;
  warming: string;
}

interface Props {
  tempRecords: TemperatureRecord[];
  humidityRecords: HumidityRecord[];
  scenario: Scenario | undefined;
  selectedYear: number;
  isLoading: boolean;
}

export function KPICards({ tempRecords, humidityRecords, scenario, selectedYear, isLoading }: Props) {
  const stats = useMemo(() => {
    if (!tempRecords.length) return null;

    const baseline2015 = tempRecords.filter((d) => d.year === 2015);
    const current = tempRecords.filter((d) => d.year === selectedYear);

    const avgAnomaly2100 = tempRecords
      .filter((d) => d.year === 2100)
      .reduce((sum, d) => sum + d.temperatureAnomaly, 0) /
      Math.max(tempRecords.filter((d) => d.year === 2100).length, 1);

    const maxAnomalyRec = tempRecords
      .filter((d) => d.year === selectedYear)
      .reduce((max, d) => (d.temperatureAnomaly > max.temperatureAnomaly ? d : max), {
        temperatureAnomaly: -Infinity,
        region: "",
      } as TemperatureRecord);

    const avgHumidity = humidityRecords
      .filter((d) => d.year === selectedYear)
      .reduce((sum, d) => sum + d.humidity, 0) /
      Math.max(humidityRecords.filter((d) => d.year === selectedYear).length, 1);

    const globalAnomaly =
      current.reduce((sum, d) => sum + d.temperatureAnomaly, 0) / Math.max(current.length, 1);

    return {
      globalAnomaly,
      avgAnomaly2100,
      maxRegion: maxAnomalyRec.region,
      maxAnomaly: maxAnomalyRec.temperatureAnomaly,
      avgHumidity,
    };
  }, [tempRecords, humidityRecords, selectedYear]);

    const cards = [
    {
      label: "Anomalía Global de Temp.",
      sublabel: `Año ${selectedYear}`,
      value: stats ? `${stats.globalAnomaly >= 0 ? "+" : ""}${stats.globalAnomaly.toFixed(2)}°C` : "–",
      color: (stats?.globalAnomaly ?? 0) > 2 ? "#EF4444" : (stats?.globalAnomaly ?? 0) > 1 ? "#F59E0B" : "#22C55E",
      icon: "🌡️",
    },
    {
      label: "Anomalía Proyectada 2100",
      sublabel: scenario?.name ?? "",
      value: stats ? `${stats.avgAnomaly2100 >= 0 ? "+" : ""}${stats.avgAnomaly2100.toFixed(2)}°C` : "–",
      color: "#EF4444",
      icon: "📈",
    },
    {
      label: "Región más Caliente",
      sublabel: `Año ${selectedYear}`,
      value: stats?.maxRegion || "–",
      sub: stats ? `+${stats.maxAnomaly.toFixed(2)}°C` : "",
      color: "#F97316",
      icon: "🔥",
    },
    {
      label: "Humedad Global Promedio",
      sublabel: `Año ${selectedYear}`,
      value: stats ? `${stats.avgHumidity.toFixed(1)}%` : "–",
      color: "#60A5FA",
      icon: "💧",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border/60 rounded-xl p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-border/60 rounded-xl p-4 relative overflow-hidden group"
        >
          <div
            className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 blur-xl transition-opacity group-hover:opacity-10"
            style={{ backgroundColor: card.color }}
          />
          <div className="flex items-start justify-between mb-3">
            <span className="text-lg">{card.icon}</span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: card.color }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
          <p className="text-2xl font-bold font-mono text-foreground leading-none">{card.value}</p>
          {card.sub && (
            <p className="text-xs font-mono mt-0.5" style={{ color: card.color }}>
              {card.sub}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1.5 truncate">{card.sublabel}</p>
        </div>
      ))}
    </div>
  );
}
