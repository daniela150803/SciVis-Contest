# NEX GDDP CMIP6 Climate Explorer

Visualize how **air temperature changes from 2015 to 2100** using real NASA NEX GDDP CMIP6 climate data,
exploring patterns and variations across different regions.

Data source: OpenVisus / atlantis.sci.utah.edu  
Variables: `tas` (Daily Near-Surface Air Temperature), `hurs` (Relative Humidity)  
Model: ACCESS-CM2 | Scenarios: SSP1-2.6, SSP2-4.5, SSP3-7.0, SSP5-8.5

---

## Requirements

| Software | Download | Required? |
|----------|----------|-----------|
| Node.js 18+ | https://nodejs.org | YES |
| pnpm | `npm install -g pnpm` | YES |
| Python 3.9+ | https://python.org | Recommended (for real data) |

---

## How to Run

1. Extract this folder anywhere on your PC.
2. Right-click inside the folder → **Open in Terminal** (or PowerShell).
3. Run:
   ```
   powershell -ExecutionPolicy Bypass -File .\start.ps1
   ```
4. Open **http://localhost:5173** in your browser.

---

## Data Modes

### With Python installed (Real CMIP6 data)
The startup script automatically installs `OpenVisus`, `Flask`, and `NumPy`.
On first launch it connects to the NEX GDDP CMIP6 dataset and fetches real
temperature data. **First data load takes 30–60 seconds** while files download.

The script reads:
- `tas_day_ACCESS-CM2_historical_r1i1p1f1_gn` — for years before 2015
- `tas_day_ACCESS-CM2_ssp585_r1i1p1f1_gn` — for 2015 onwards

This is exactly the same approach as the original Jupyter notebook.

### Without Python (Synthetic data)
The app still works with realistic synthetic climate projections based on
published IPCC AR6 warming trajectories. All charts and regions are functional.

---

## Troubleshooting

**App still blank after startup?**  
→ Wait 15–20 seconds after opening. The API server needs to build first.

**`pnpm` not found?**  
→ Run `npm install -g pnpm` first, then restart PowerShell.

**Python packages fail to install?**  
→ The app continues with synthetic data. Real data is optional.

**Port already in use?**  
→ Change ports by editing `start.ps1` (PORT=3001 for API, PORT=5173 for frontend).
