"""
NEX GDDP CMIP6 Python Data Service
Uses OpenVisus to fetch real climate data from:
  http://atlantis.sci.utah.edu/mod_visus?dataset=nex-gddp-cmip6&cached=arco

Variables:
  - tas  : Daily Near-Surface Air Temperature (Kelvin → converted to Celsius)
  - huss : Near-Surface Specific Humidity (kg/kg → converted to g/kg)

Scenarios: historical (up to 2014), ssp126, ssp245, ssp370, ssp585 (2015-2100)
"""

import os
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── OpenVisus dataset connection (lazy-loaded once) ──────────────────────────
_db = None

def get_db():
    global _db
    if _db is None:
        try:
            import OpenVisus as ov
            os.environ.setdefault("VISUS_CACHE", "./visus_cache_can_be_erased")
            _db = ov.LoadDataset(
                "http://atlantis.sci.utah.edu/mod_visus?dataset=nex-gddp-cmip6&cached=arco"
            )
            print("OpenVisus dataset connected.")
        except Exception as e:
            print(f"ERROR connecting to OpenVisus: {e}")
            raise
    return _db


# ─── Constants ────────────────────────────────────────────────────────────────
# Dataset grid (from readdataset metadata):
#   box:         0 1439  0  599  (1440 × 600 pixels)
#   physic_box:  0.125 359.875  -59.875 89.875  (lon, lat in degrees)
LON_MIN, LON_MAX = 0.125, 359.875
LAT_MIN, LAT_MAX = -59.875, 89.875

# Climate model used (available in the dataset)
MODEL = "ACCESS-CM2"

# Scenarios available
SCENARIOS = {
    "historical": "historical",
    "ssp126": "ssp126",
    "ssp245": "ssp245",
    "ssp370": "ssp370",
    "ssp585": "ssp585",
}

# Regions defined in 0-360 longitude space to match dataset coordinates
REGIONS = [
    {
        "id": "north_america",
        "name": "North America",
        "lat_min": 25, "lat_max": 75,
        "lon_min": 235, "lon_max": 300,
        "color": "#3B82F6",
    },
    {
        "id": "south_america",
        "name": "South America",
        "lat_min": -55, "lat_max": 15,
        "lon_min": 280, "lon_max": 330,
        "color": "#10B981",
    },
    {
        "id": "europe",
        "name": "Europe",
        "lat_min": 35, "lat_max": 72,
        "lon_min": 350, "lon_max": 60,  # wraps around
        "color": "#8B5CF6",
        "wraps": True,
    },
    {
        "id": "africa",
        "name": "Africa",
        "lat_min": -35, "lat_max": 37,
        "lon_min": 343, "lon_max": 52,
        "color": "#F59E0B",
        "wraps": True,
    },
    {
        "id": "south_asia",
        "name": "South Asia",
        "lat_min": 5, "lat_max": 35,
        "lon_min": 65, "lon_max": 100,
        "color": "#EF4444",
    },
    {
        "id": "east_asia",
        "name": "East Asia",
        "lat_min": 20, "lat_max": 55,
        "lon_min": 100, "lon_max": 145,
        "color": "#EC4899",
    },
    {
        "id": "southeast_asia",
        "name": "Southeast Asia",
        "lat_min": -10, "lat_max": 25,
        "lon_min": 95, "lon_max": 145,
        "color": "#06B6D4",
    },
    {
        "id": "australia",
        "name": "Australia",
        "lat_min": -45, "lat_max": -10,
        "lon_min": 113, "lon_max": 155,
        "color": "#F97316",
    },
    {
        "id": "middle_east",
        "name": "Middle East",
        "lat_min": 15, "lat_max": 42,
        "lon_min": 35, "lon_max": 65,
        "color": "#D97706",
    },
    {
        "id": "arctic",
        "name": "Arctic",
        "lat_min": 60, "lat_max": 89,
        "lon_min": 0, "lon_max": 360,
        "color": "#60A5FA",
    },
]

SCENARIO_META = [
    {
        "id": "ssp126",
        "name": "SSP1-2.6 (Low Emissions)",
        "description": "Sustainable development pathway with rapid decarbonization",
        "warming": "+1.5°C by 2100",
    },
    {
        "id": "ssp245",
        "name": "SSP2-4.5 (Intermediate)",
        "description": "Middle-of-the-road scenario with moderate emissions reduction",
        "warming": "+2.5°C by 2100",
    },
    {
        "id": "ssp370",
        "name": "SSP3-7.0 (High Emissions)",
        "description": "Regional rivalry scenario with high fossil fuel use",
        "warming": "+3.5°C by 2100",
    },
    {
        "id": "ssp585",
        "name": "SSP5-8.5 (Very High Emissions)",
        "description": "Fossil-fueled development scenario with maximum warming",
        "warming": "+4.5°C by 2100",
    },
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_timestep(year: int, day_of_year: int = 182) -> int:
    """Convert year + day-of-year to OpenVisus timestep index. Day 182 ≈ July 1."""
    return year * 365 + day_of_year


def get_scenario_str(year: int, scenario: str) -> str:
    """Return the correct scenario string for the given year."""
    if year <= 2014:
        return "historical"
    return scenario


def fetch_global_grid(field: str, year: int, scenario: str, quality: int = -4) -> np.ndarray:
    """
    Fetch a global 2D grid from OpenVisus.
    Returns a 2D numpy array (lat × lon) at the requested quality level.
    quality=-4 → ~90×37 grid (fast)
    quality=-3 → ~180×75 grid (balanced)
    quality=-2 → ~360×150 grid (detailed, slower)
    """
    db = get_db()
    scen = get_scenario_str(year, scenario)
    full_field = f"{field}_day_{MODEL}_{scen}_r1i1p1f1_gn"
    timestep = get_timestep(year)
    data = db.read(field=full_field, time=timestep, quality=quality)
    return np.array(data, dtype=np.float32)


def grid_to_latlon(data: np.ndarray):
    """Yield (lat, lon_neg180_180, value) tuples for each non-zero grid cell."""
    lat_count, lon_count = data.shape
    for li in range(lat_count):
        for loi in range(lon_count):
            val = float(data[li, loi])
            if val == 0.0:
                continue
            lat = LAT_MIN + (li / (lat_count - 1)) * (LAT_MAX - LAT_MIN)
            lon = LON_MIN + (loi / (lon_count - 1)) * (LON_MAX - LON_MIN)
            # Convert 0-360 → -180 to 180
            if lon > 180:
                lon -= 360
            yield lat, lon, val


def regional_mean(data: np.ndarray, region: dict) -> float | None:
    """Compute mean value over a region bounding box."""
    lat_count, lon_count = data.shape
    values = []
    for li in range(lat_count):
        lat = LAT_MIN + (li / (lat_count - 1)) * (LAT_MAX - LAT_MIN)
        if not (region["lat_min"] <= lat <= region["lat_max"]):
            continue
        for loi in range(lon_count):
            # Dataset uses 0-360 longitude
            lon_360 = LON_MIN + (loi / (lon_count - 1)) * (LON_MAX - LON_MIN)
            lon_min = region["lon_min"]
            lon_max = region["lon_max"]
            if region.get("wraps"):
                in_box = lon_360 >= lon_min or lon_360 <= lon_max
            else:
                in_box = lon_min <= lon_360 <= lon_max
            if in_box:
                val = float(data[li, loi])
                if val != 0.0:
                    values.append(val)
    if not values:
        return None
    return float(np.mean(values))


# ─── Baseline cache: fetch year 2000 historical data once ─────────────────────
_baseline_tas: np.ndarray | None = None
_baseline_huss: np.ndarray | None = None

def get_baseline_tas(quality: int = -4) -> np.ndarray:
    global _baseline_tas
    if _baseline_tas is None:
        print("Fetching baseline temperature (year 2000, historical)…")
        _baseline_tas = fetch_global_grid("tas", 2000, "historical", quality=quality)
        print(f"  → shape {_baseline_tas.shape}, mean {_baseline_tas.mean():.1f} K")
    return _baseline_tas


def get_baseline_huss(quality: int = -4) -> np.ndarray:
    global _baseline_huss
    if _baseline_huss is None:
        print("Fetching baseline specific humidity (year 2000, historical)…")
        _baseline_huss = fetch_global_grid("huss", 2000, "historical", quality=quality)
        print(f"  → shape {_baseline_huss.shape}, mean {_baseline_huss.mean():.4f} kg/kg")
    return _baseline_huss


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/api/climate/regions")
def regions():
    return jsonify({
        "regions": [
            {
                "id": r["id"],
                "name": r["name"],
                "lat": (r["lat_min"] + r["lat_max"]) / 2,
                "lon": ((r["lon_min"] + r["lon_max"]) / 2) - 180,
                "color": r["color"],
            }
            for r in REGIONS
        ]
    })


@app.route("/api/climate/scenarios")
def scenarios():
    return jsonify({"scenarios": SCENARIO_META})


@app.route("/api/climate/globe")
def globe():
    """
    Returns a coarse global temperature grid for the 3D globe visualization.
    Uses real NEX GDDP CMIP6 tas (temperature) data at quality=-4.
    """
    year = int(request.args.get("year", 2015))
    scenario = request.args.get("scenario", "ssp245")

    try:
        data = fetch_global_grid("tas", year, scenario, quality=-4)
        baseline = get_baseline_tas(quality=-4)

        # Resize baseline to match data if shapes differ
        if baseline.shape != data.shape:
            baseline = np.full(data.shape, baseline.mean())

        points = []
        for lat, lon, val in grid_to_latlon(data):
            temp_c = val - 273.15
            # Find corresponding baseline cell
            lat_idx = int((lat - LAT_MIN) / (LAT_MAX - LAT_MIN) * (baseline.shape[0] - 1))
            lon_idx = int(((lon + 180 if lon < 0 else lon) - LON_MIN) / (LON_MAX - LON_MIN) * (baseline.shape[1] - 1))
            lat_idx = max(0, min(lat_idx, baseline.shape[0] - 1))
            lon_idx = max(0, min(lon_idx, baseline.shape[1] - 1))
            base_c = float(baseline[lat_idx, lon_idx]) - 273.15
            anomaly = temp_c - base_c if base_c != -273.15 else 0.0

            points.append({
                "lat": round(lat, 2),
                "lon": round(lon, 2),
                "temperature": round(temp_c, 2),
                "temperatureAnomaly": round(anomaly, 3),
            })

        return jsonify({
            "year": year,
            "scenario": scenario,
            "points": points,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/climate/temperature")
def temperature():
    """
    Returns temperature anomaly time series for each region, 2015-2100.
    Uses real NEX GDDP CMIP6 tas data at quality=-4 (fast coarse grid).
    """
    region_filter = request.args.get("region")
    scenario = request.args.get("scenario", "ssp245")

    try:
        baseline = get_baseline_tas(quality=-4)
        baseline_regional = {}
        for r in REGIONS:
            mean_val = regional_mean(baseline, r)
            baseline_regional[r["id"]] = (mean_val - 273.15) if mean_val else None

        filtered = [r for r in REGIONS if not region_filter or r["id"] == region_filter]

        records = []
        years = list(range(2015, 2101, 5))
        for year in years:
            data = fetch_global_grid("tas", year, scenario, quality=-4)
            for r in filtered:
                mean_k = regional_mean(data, r)
                if mean_k is None:
                    continue
                temp_c = mean_k - 273.15
                base_c = baseline_regional.get(r["id"])
                anomaly = (temp_c - base_c) if base_c is not None else 0.0
                records.append({
                    "year": year,
                    "region": r["name"],
                    "regionId": r["id"],
                    "temperature": round(temp_c, 2),
                    "temperatureAnomaly": round(anomaly, 3),
                    "scenario": scenario,
                    "model": MODEL,
                })

        return jsonify({
            "data": records,
            "metadata": {
                "source": "NEX GDDP CMIP6",
                "model": MODEL,
                "baseline": "Year 2000 historical (ACCESS-CM2)",
                "unit": "°C",
            },
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/climate/humidity")
def humidity():
    """
    Returns specific humidity (huss) time series for each region, 2015-2100.
    Uses real NEX GDDP CMIP6 huss data at quality=-4.
    huss is in kg/kg → converted to g/kg (*1000) and exposed as:
      - humidity      : g/kg  (shown in UI as "humidity" for backwards compat)
      - specificHumidity : g/kg  (same value, explicit label)
    """
    year_filter = request.args.get("year", type=int)
    scenario = request.args.get("scenario", "ssp245")

    try:
        years = [year_filter] if year_filter else list(range(2015, 2101, 5))
        records = []

        for year in years:
            # huss: Near-Surface Specific Humidity (kg/kg), same field name as notebook
            data = fetch_global_grid("huss", year, scenario, quality=-4)
            for r in REGIONS:
                mean_kgkg = regional_mean(data, r)
                if mean_kgkg is None:
                    continue
                # Convert kg/kg → g/kg for readability
                specific_hum_gkg = round(mean_kgkg * 1000, 4)
                records.append({
                    "year": year,
                    "region": r["name"],
                    "regionId": r["id"],
                    "humidity": specific_hum_gkg,        # g/kg (kept for UI compat)
                    "specificHumidity": specific_hum_gkg, # g/kg
                    "scenario": scenario,
                })

        return jsonify({
            "data": records,
            "metadata": {
                "source": "NEX GDDP CMIP6",
                "model": MODEL,
                "baseline": "Year 2000 historical (ACCESS-CM2)",
                "unit": "g/kg",
            },
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/climate/status")
def status():
    """Health check for the Python service."""
    try:
        db = get_db()
        return jsonify({"status": "ok", "dataset": "nex-gddp-cmip6", "model": MODEL})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_SERVICE_PORT", 5001))
    print(f"Starting NEX GDDP CMIP6 data service on port {port}…")
    print("Endpoints:")
    print(f"  GET http://localhost:{port}/api/climate/status")
    print(f"  GET http://localhost:{port}/api/climate/globe?year=2050&scenario=ssp585")
    print(f"  GET http://localhost:{port}/api/climate/temperature?scenario=ssp245")
    print(f"  GET http://localhost:{port}/api/climate/humidity?scenario=ssp245")
    app.run(host="0.0.0.0", port=port, debug=False)