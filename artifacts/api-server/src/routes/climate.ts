import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PYTHON_SERVICE = process.env["PYTHON_SERVICE_URL"] ?? "http://localhost:5001";

// ─── Try to proxy to the Python OpenVisus service ────────────────────────────
async function tryPython(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${PYTHON_SERVICE}${path}`, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) return null;
    const json = await res.json();
    if ((json as Record<string, unknown>)["error"]) return null;
    return json;
  } catch {
    return null;
  }
}

// ─── Synthetic fallback data ──────────────────────────────────────────────────

const REGIONS = [
  { id: "north_america", name: "América del Norte", lat: 45, lon: -100, color: "#3B82F6", baseTemp: 8.5, baseHumidity: 65 },
  { id: "south_america", name: "América del Sur", lat: -15, lon: -60, color: "#10B981", baseTemp: 22.0, baseHumidity: 78 },
  { id: "europe", name: "Europa", lat: 50, lon: 10, color: "#8B5CF6", baseTemp: 9.5, baseHumidity: 72 },
  { id: "africa", name: "África", lat: 0, lon: 20, color: "#F59E0B", baseTemp: 25.5, baseHumidity: 55 },
  { id: "south_asia", name: "Asia del Sur", lat: 20, lon: 80, color: "#EF4444", baseTemp: 26.5, baseHumidity: 74 },
  { id: "east_asia", name: "Asia Oriental", lat: 35, lon: 115, color: "#EC4899", baseTemp: 14.0, baseHumidity: 68 },
  { id: "southeast_asia", name: "Sudeste Asiático", lat: 5, lon: 115, color: "#06B6D4", baseTemp: 27.0, baseHumidity: 82 },
  { id: "australia", name: "Australia", lat: -25, lon: 135, color: "#F97316", baseTemp: 21.5, baseHumidity: 48 },
  { id: "arctic", name: "Ártico", lat: 75, lon: 0, color: "#60A5FA", baseTemp: -15.0, baseHumidity: 75 },
  { id: "middle_east", name: "Oriente Medio", lat: 30, lon: 45, color: "#D97706", baseTemp: 24.0, baseHumidity: 35 },
];

const SCENARIOS = [
  { id: "ssp126", name: "SSP1-2.6 (Low Emissions)", description: "Sustainable development pathway with rapid decarbonization", warming: "+1.5°C by 2100", multiplier: 0.8 },
  { id: "ssp245", name: "SSP2-4.5 (Intermediate)", description: "Middle-of-the-road scenario with moderate emissions reduction", warming: "+2.5°C by 2100", multiplier: 1.5 },
  { id: "ssp370", name: "SSP3-7.0 (High Emissions)", description: "Regional rivalry scenario with high fossil fuel use", warming: "+3.5°C by 2100", multiplier: 2.5 },
  { id: "ssp585", name: "SSP5-8.5 (Very High Emissions)", description: "Fossil-fueled development scenario with maximum warming", warming: "+4.5°C by 2100", multiplier: 3.8 },
];

function getScenarioMultiplier(scenario: string): number {
  return SCENARIOS.find((s) => s.id === scenario)?.multiplier ?? 1.5;
}

function generateTemperatureAnomaly(year: number, scenario: string): number {
  const mult = getScenarioMultiplier(scenario);
  const progress = (year - 2015) / (2100 - 2015);
  return mult * (progress + 0.3 * Math.pow(progress, 2)) * (1 + (Math.random() * 0.1 - 0.05));
}

function generateHumidityChange(year: number, scenario: string, baseHumidity: number): number {
  const mult = getScenarioMultiplier(scenario);
  const progress = (year - 2015) / (2100 - 2015);
  const humidityMultiplier = baseHumidity > 70 ? 1.08 : 0.97;
  return baseHumidity * Math.pow(humidityMultiplier, progress * mult * 0.5);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/temperature", async (req, res): Promise<void> => {
  const regionFilter = req.query["region"] as string | undefined;
  const scenario = (req.query["scenario"] as string) || "ssp245";

  const qs = new URLSearchParams({ scenario, ...(regionFilter ? { region: regionFilter } : {}) });
  const realData = await tryPython(`/api/climate/temperature?${qs}`);
  if (realData) {
    res.json(realData);
    return;
  }

  const filteredRegions = regionFilter
    ? REGIONS.filter((r) => r.id === regionFilter || r.name === regionFilter)
    : REGIONS;

  const data = [];
  for (const region of filteredRegions) {
    for (let year = 2015; year <= 2100; year += 5) {
      const anomaly = generateTemperatureAnomaly(year, scenario);
      data.push({
        year,
        region: region.name,
        regionId: region.id,
        temperature: parseFloat((region.baseTemp + anomaly).toFixed(2)),
        temperatureAnomaly: parseFloat(anomaly.toFixed(3)),
        scenario,
        model: "CMIP6 Ensemble (synthetic fallback)",
      });
    }
  }

  res.json({
    data,
    metadata: {
      source: "NEX GDDP CMIP6 (synthetic fallback — start python-service for real data)",
      model: "CMIP6 Multi-model Ensemble",
      baseline: "1981-2010 climatological mean",
      unit: "°C",
    },
  });
});

router.get("/humidity", async (req, res): Promise<void> => {
  const yearFilter = req.query["year"] ? parseInt(req.query["year"] as string) : undefined;
  const scenario = (req.query["scenario"] as string) || "ssp245";

  const qs = new URLSearchParams({ scenario, ...(yearFilter ? { year: String(yearFilter) } : {}) });
  const realData = await tryPython(`/api/climate/humidity?${qs}`);
  if (realData) {
    res.json(realData);
    return;
  }

  const data = [];
  for (const region of REGIONS) {
    const years = yearFilter ? [yearFilter] : Array.from({ length: 18 }, (_, i) => 2015 + i * 5);
    for (const year of years) {
      const humidity = generateHumidityChange(year, scenario, region.baseHumidity);
      const specificHumidity = (humidity / 100) * 15 * Math.exp(0.07 * (region.baseTemp - 10));
      data.push({
        year,
        region: region.name,
        regionId: region.id,
        humidity: parseFloat(humidity.toFixed(1)),
        specificHumidity: parseFloat(specificHumidity.toFixed(2)),
        scenario,
      });
    }
  }

  res.json({
    data,
    metadata: {
      source: "NEX GDDP CMIP6 (synthetic fallback — start python-service for real data)",
      model: "CMIP6 Multi-model Ensemble",
      baseline: "1981-2010 climatological mean",
      unit: "% RH",
    },
  });
});

router.get("/globe", async (req, res): Promise<void> => {
  const year = req.query["year"] ? parseInt(req.query["year"] as string) : 2015;
  const scenario = (req.query["scenario"] as string) || "ssp245";

  const qs = new URLSearchParams({ year: String(year), scenario });
  const realData = await tryPython(`/api/climate/globe?${qs}`);
  if (realData) {
    res.json(realData);
    return;
  }

  const points = [];
  const globalAnomaly = generateTemperatureAnomaly(year, scenario);
  for (let lat = -85; lat <= 85; lat += 10) {
    for (let lon = -175; lon <= 175; lon += 10) {
      const latFactor = Math.cos((lat * Math.PI) / 180);
      const arcticAmplification = lat > 60 ? 2.0 : 1.0;
      const tropicalCooling = Math.abs(lat) < 20 ? 0.85 : 1.0;
      const noise = (Math.random() - 0.5) * 0.4;
      const baseTemp = 25 * Math.cos((lat * Math.PI) / 180) - 10 + Math.sin(((lon + lat) * Math.PI) / 90) * 3;
      const anomaly = globalAnomaly * arcticAmplification * tropicalCooling * (0.7 + 0.3 * latFactor) + noise;
      points.push({
        lat,
        lon,
        temperature: parseFloat((baseTemp + anomaly).toFixed(2)),
        temperatureAnomaly: parseFloat(anomaly.toFixed(3)),
      });
    }
  }

  res.json({ year, scenario, points });
});

router.get("/regions", async (_req, res): Promise<void> => {
  const realData = await tryPython("/api/climate/regions");
  if (realData) {
    res.json(realData);
    return;
  }
  res.json({
    regions: REGIONS.map((r) => ({ id: r.id, name: r.name, lat: r.lat, lon: r.lon, color: r.color })),
  });
});

router.get("/scenarios", async (_req, res): Promise<void> => {
  const realData = await tryPython("/api/climate/scenarios");
  if (realData) {
    res.json(realData);
    return;
  }
  res.json({
    scenarios: SCENARIOS.map((s) => ({ id: s.id, name: s.name, description: s.description, warming: s.warming })),
  });
});

export default router;
