# NEX GDDP CMIP6 Python Data Service

Fetches **real** climate data from the OpenVisus server at Utah using the NEX GDDP CMIP6 dataset.

## Variables Used
- `tas`  — Daily Near-Surface Air Temperature (Kelvin → converted to °C)
- `hurs` — Near-Surface Relative Humidity (%)

## Model
ACCESS-CM2 (scenarios: historical, ssp126, ssp245, ssp370, ssp585)

## Setup

```bash
cd artifacts/python-service
pip install -r requirements.txt
python app.py
```

Service runs on port **5001** by default.

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/climate/status` | Health check |
| `GET /api/climate/globe?year=2050&scenario=ssp585` | Global grid for 3D globe |
| `GET /api/climate/temperature?scenario=ssp245` | Temperature time series 2015-2100 |
| `GET /api/climate/humidity?scenario=ssp245` | Humidity time series 2015-2100 |
| `GET /api/climate/regions` | Available regions |
| `GET /api/climate/scenarios` | Available scenarios |

## Notes
- First request will be slow (~10-30s) while OpenVisus downloads and caches data
- Data is cached locally in `./visus_cache_can_be_erased/` for faster subsequent runs
- The Node.js API server automatically proxies to this service and falls back to synthetic data if unavailable
