import { useState } from "react";
import { useGetTemperatureData, useGetHumidityData, useGetGlobeData, useGetRegions, useGetScenarios } from "@workspace/api-client-react";
import type { GetTemperatureDataScenario, GetHumidityDataScenario, GetGlobeDataScenario } from "@workspace/api-client-react";
import { Globe3D } from "@/components/Globe3D";
import { TemperatureTimeline } from "@/components/TemperatureTimeline";
import { HumidityRadar } from "@/components/HumidityRadar";
import type { HumidityRecord } from "@/components/HumidityRadar";
import { RegionComparison } from "@/components/RegionComparison";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import { YearSlider } from "@/components/YearSlider";
import { KPICards } from "@/components/KPICards";
import { ScenarioComparison } from "@/components/ScenarioComparison";
import { Skeleton } from "@/components/ui/skeleton";
import { Heatmap } from "@/components/Heatmap";

export default function Dashboard() {
  const [scenario, setScenario] = useState("ssp245");
  const [selectedYear, setSelectedYear] = useState(2015);
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);

  const { data: regionsData } = useGetRegions();
  const { data: scenariosData } = useGetScenarios();
  const { data: temperatureData, isLoading: tempLoading } = useGetTemperatureData({ scenario: scenario as GetTemperatureDataScenario });
  const { data: humidityData, isLoading: humidLoading } = useGetHumidityData({ scenario: scenario as GetHumidityDataScenario });
  const { data: ssp126Data, isLoading: ssp126Loading } = useGetTemperatureData({ scenario: "ssp126" as GetTemperatureDataScenario });
  const { data: ssp245Data, isLoading: ssp245Loading } = useGetTemperatureData({ scenario: "ssp245" as GetTemperatureDataScenario });
  const { data: ssp370Data, isLoading: ssp370Loading } = useGetTemperatureData({ scenario: "ssp370" as GetTemperatureDataScenario });
  const { data: ssp585Data, isLoading: ssp585Loading } = useGetTemperatureData({ scenario: "ssp585" as GetTemperatureDataScenario });
  const { data: globeData, isLoading: globeLoading } = useGetGlobeData({
    year: selectedYear,
    scenario: scenario as GetGlobeDataScenario,
  });

  const regions = regionsData?.regions ?? [];
  const scenarios = scenariosData?.scenarios ?? [];
  const tempRecords = temperatureData?.data ?? [];
  const humidityRecords = humidityData?.data ?? [];
  const globePoints = globeData?.points ?? [];

  const currentScenario = scenarios.find((s) => s.id === scenario);

  const allScenariosData = {
    ssp126: ssp126Data?.data ?? [],
    ssp245: ssp245Data?.data ?? [],
    ssp370: ssp370Data?.data ?? [],
    ssp585: ssp585Data?.data ?? [],
  };
  const allScenariosLoading = ssp126Loading || ssp245Loading || ssp370Loading || ssp585Loading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-sm">🌍</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-none">
                Panel de Control NEX GDDP CMIP6
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Temperatura y humedad · 2015–2100
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <ScenarioSelector
              scenarios={scenarios}
              value={scenario}
              onChange={setScenario}
            />
            <button
              onClick={() => window.print()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded border border-border/50 hover:border-border"
            >
              Exportar a PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <KPICards
          tempRecords={tempRecords}
          humidityRecords={humidityRecords}
          scenario={currentScenario}
          selectedYear={selectedYear}
          isLoading={tempLoading || humidLoading}
          regions={regions}
        />

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Columna izquierda: Globo 3D + Mapa de calor */}
          <div className="xl:col-span-3 bg-card border border-border/60 rounded-xl overflow-hidden">
            {/* Sección del Globo */}
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Mapa Global de Temperatura en 3D</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Anomalía de temperatura (°C vs línea base 1981–2010) · {selectedYear}
                </p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {currentScenario?.warming ?? ""}
              </span>
            </div>
            <YearSlider value={selectedYear} onChange={setSelectedYear} />
            {globeLoading ? (
              <div className="h-[480px] flex items-center justify-center">
                <Skeleton className="w-[420px] h-[420px] rounded-full" />
              </div>
            ) : (
              <Globe3D points={globePoints} year={selectedYear} scenario={scenario} />
            )}

            {/* Sección del Mapa de Calor (debajo del Globo) */}
            <div className="border-t border-border/60 mt-4 pt-4 px-5 pb-5">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">Mapa de Calor · Anomalía por Región y Año</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Temperatura relativa a línea base 2000 · Haz clic para navegar
                </p>
              </div>
              {tempLoading ? (
                <div className="h-64">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <Heatmap
                  data={tempRecords}
                  regions={regions}
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                  scenario={scenario}
                />
              )}
            </div>
          </div>

          {/* Columna derecha: Radar de humedad y resumen regional */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground">Humedad por Región</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comparación de humedad relativa (%)
                </p>
              </div>
              {humidLoading ? (
                <div className="h-64 p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <HumidityRadar
                  data={humidityRecords as HumidityRecord[]}
                  selectedYear={selectedYear}
                  regions={regions}
                />
              )}
            </div>

            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground">Resumen Regional</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Anomalía de temperatura por región · {selectedYear}
                </p>
              </div>
              {tempLoading ? (
                <div className="h-52 p-4 space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <RegionComparison
                  data={tempRecords}
                  selectedYear={selectedYear}
                  regions={regions}
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                />
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Línea de Tiempo de Temperatura 2015–2100
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedRegion
                  ? `Mostrando: ${regions.find((r) => r.id === selectedRegion)?.name ?? selectedRegion}`
                  : "Todas las regiones · haz clic en una región arriba para filtrar"}
              </p>
            </div>
            {selectedRegion && (
              <button
                onClick={() => setSelectedRegion(undefined)}
                className="text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-2 py-1 rounded transition-colors"
              >
                Limpiar filtro
              </button>
            )}
          </div>
          {tempLoading ? (
            <div className="h-64 p-6">
              <Skeleton className="w-full h-full" />
            </div>
          ) : (
            <TemperatureTimeline
              data={tempRecords}
              regions={regions}
              selectedRegion={selectedRegion}
              onYearChange={setSelectedYear}
              scenario={scenario}
            />
          )}
        </div>
        <ScenarioComparison
          selectedRegion={selectedRegion}
          regions={regions}
          allScenariosData={allScenariosData}
          isLoading={allScenariosLoading}
        />
      </main>
    </div>
  );
}