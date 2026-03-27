import { useState } from "react";
import {
  useGetTemperatureData,
  useGetHumidityData,
  useGetGlobeData,
  useGetRegions,
  useGetScenarios,
} from "@workspace/api-client-react";

import type {
  GetTemperatureDataScenario,
  GetHumidityDataScenario,
  GetGlobeDataScenario,
} from "@workspace/api-client-react";

import { Globe3D } from "@/components/Globe3D";
import { TemperatureTimeline } from "@/components/TemperatureTimeline";
import { HumidityRadar } from "@/components/HumidityRadar";
import { HumidityBarChart } from "@/components/HumidityBarChart";
import { RegionComparison } from "@/components/RegionComparison";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import { YearSlider } from "@/components/YearSlider";
import { KPICards } from "@/components/KPICards";
import { ScenarioComparison } from "@/components/ScenarioComparison";
import { Skeleton } from "@/components/ui/skeleton";
import { Heatmap } from "@/components/Heatmap";

type HumidityRecord = {
  year: number;
  region: string;
  regionId: string;
  humidity: number;
  specificHumidity: number;
  scenario: string;
};

export default function Dashboard() {
  const [scenario, setScenario] = useState("ssp245");
  const [selectedYear, setSelectedYear] = useState(2015);
  const [boundaryYear, setBoundaryYear] = useState(2025);
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>();

  const { data: regionsData } = useGetRegions();
  const { data: scenariosData } = useGetScenarios();

  const { data: temperatureData, isLoading: tempLoading } =
    useGetTemperatureData({
      scenario: scenario as GetTemperatureDataScenario,
    });

  const { data: humidityData, isLoading: humidLoading } = useGetHumidityData({
    scenario: scenario as GetHumidityDataScenario,
  });

  const { data: ssp126Data, isLoading: ssp126Loading } = useGetTemperatureData(
    {
      scenario: "ssp126" as GetTemperatureDataScenario,
    }
  );

  const { data: ssp245Data, isLoading: ssp245Loading } = useGetTemperatureData(
    {
      scenario: "ssp245" as GetTemperatureDataScenario,
    }
  );

  const { data: ssp370Data, isLoading: ssp370Loading } = useGetTemperatureData(
    {
      scenario: "ssp370" as GetTemperatureDataScenario,
    }
  );

  const { data: ssp585Data, isLoading: ssp585Loading } = useGetTemperatureData(
    {
      scenario: "ssp585" as GetTemperatureDataScenario,
    }
  );

  const { data: globeData, isLoading: globeLoading } = useGetGlobeData({
    year: selectedYear,
    scenario: scenario as GetGlobeDataScenario,
  });

  const regions = regionsData?.regions ?? [];
  const scenarios = scenariosData?.scenarios ?? [];
  const tempRecords = temperatureData?.data ?? [];
  const humidityRecords = (humidityData?.data ?? []) as HumidityRecord[];
  const globePoints = globeData?.points ?? [];

  const currentScenario = scenarios.find((s) => s.id === scenario);

  const allScenariosData = {
    ssp126: ssp126Data?.data ?? [],
    ssp245: ssp245Data?.data ?? [],
    ssp370: ssp370Data?.data ?? [],
    ssp585: ssp585Data?.data ?? [],
  };

  const allScenariosLoading =
    ssp126Loading || ssp245Loading || ssp370Loading || ssp585Loading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold">Dashboard Climático</h1>
            <p className="text-xs text-muted-foreground">
              Temperatura y humedad · 2015–2100
            </p>
          </div>

          <ScenarioSelector
            scenarios={scenarios}
            value={scenario}
            onChange={setScenario}
          />
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
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Mapa Global de Temperatura en 3D
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Anomalía de temperatura (°C vs línea base 1981–2010) ·{" "}
                    {selectedYear}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  {currentScenario?.warming ?? ""}
                </span>
              </div>

              <YearSlider value={selectedYear} onChange={setSelectedYear} />

              {globeLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Skeleton className="w-[300px] h-[300px] rounded-full" />
                </div>
              ) : (
                <Globe3D
                  points={globePoints}
                  year={selectedYear}
                  scenario={scenario}
                />
              )}
            </div>

            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground">
                  Mapa de Calor · Anomalía por Región y Año
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Temperatura relativa a línea base 2000 · Haz clic para navegar
                </p>
              </div>

              {tempLoading ? (
                <div className="h-64 p-4">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <div className="p-4">
                  <Heatmap
                    data={tempRecords}
                    regions={regions}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                    scenario={scenario}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/40">
                <h2 className="text-sm font-semibold">
                  Comparación de humedad por rangos de tiempo
                </h2>
              </div>

              {humidLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <>
                  <div className="px-4 pt-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      Punto de corte:{" "}
                      <span className="text-primary font-mono">
                        {boundaryYear}
                      </span>
                    </p>

                    <input
                      type="range"
                      min={2025}
                      max={2100}
                      step={5}
                      value={boundaryYear}
                      onChange={(e) =>
                        setBoundaryYear(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <HumidityBarChart
                    humidityData={humidityRecords}
                    temperatureData={tempRecords}
                    boundaryYear={boundaryYear}
                  />
                </>
              )}
            </div>

            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/40">
                <h2 className="text-sm font-semibold">
                  Mapa de humedades por región
                </h2>
              </div>

              {humidLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <HumidityRadar
                  data={humidityRecords}
                  selectedYear={selectedYear}
                  regions={regions}
                />
              )}
            </div>

            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/40">
                <h2 className="text-sm font-semibold">
                  Comparación de regiones
                </h2>
              </div>

              {tempLoading ? (
                <Skeleton className="h-[200px] w-full" />
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
          <div className="p-4 border-b border-border/40">
            <h2 className="text-sm font-semibold">
              Línea de tiempo de temperatura
            </h2>
          </div>

          {tempLoading ? (
            <Skeleton className="h-[300px] w-full" />
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