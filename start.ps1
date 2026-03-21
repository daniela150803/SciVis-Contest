# NEX GDDP CMIP6 Climate Explorer - Windows Startup Script
# Usage: powershell -ExecutionPolicy Bypass -File .\start.ps1

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  NEX GDDP CMIP6 Climate Explorer" -ForegroundColor Cyan
Write-Host "  Air Temperature 2015-2100 (CMIP6 data)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot

# Check pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pnpm not found. Run: npm install -g pnpm" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 1. Install Node.js dependencies
Write-Host "[1/4] Installing Node.js dependencies..." -ForegroundColor Yellow
Set-Location $rootDir
pnpm install --ignore-scripts
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pnpm install failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "      Done." -ForegroundColor Green
Write-Host ""

# 2. Python data service (real OpenVisus CMIP6 data)
$pythonProc = $null
$pythonCmd = $null
if (Get-Command python3 -ErrorAction SilentlyContinue) { $pythonCmd = "python3" }
elseif (Get-Command python -ErrorAction SilentlyContinue) { $pythonCmd = "python" }

if ($pythonCmd) {
    Write-Host "[2/4] Python found. Installing OpenVisus + dependencies for real CMIP6 data..." -ForegroundColor Yellow
    Write-Host "      (This may take a few minutes on first run)" -ForegroundColor Gray
    & $pythonCmd -m pip install -r "$rootDir\artifacts\python-service\requirements.txt" -q
    if ($LASTEXITCODE -eq 0) {
        $env:PYTHON_SERVICE_PORT = "5001"
        $pythonProc = Start-Process "cmd.exe" `
            -ArgumentList "/c", "$pythonCmd `"$rootDir\artifacts\python-service\app.py`"" `
            -WorkingDirectory $rootDir `
            -PassThru -NoNewWindow
        Write-Host "      Real data service started on port 5001 (PID $($pythonProc.Id))" -ForegroundColor Green
        Write-Host "      NOTE: First data fetch takes 30-60s while OpenVisus downloads CMIP6 data." -ForegroundColor Gray
    } else {
        Write-Host "      pip install failed. Using synthetic fallback data." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "[2/4] Python not found - using synthetic climate data." -ForegroundColor DarkYellow
    Write-Host "      Install Python 3.9+ from https://python.org for real CMIP6 data." -ForegroundColor Gray
}
Write-Host ""

# 3. Build and start API server
Write-Host "[3/4] Starting API server on port 3001..." -ForegroundColor Yellow
$env:PORT = "3001"
$env:NODE_ENV = "development"
$env:PYTHON_SERVICE_URL = "http://localhost:5001"
$nodeJob = Start-Process "cmd.exe" `
    -ArgumentList "/c", "pnpm --filter @workspace/api-server run dev" `
    -WorkingDirectory $rootDir `
    -PassThru -NoNewWindow
Write-Host "      Waiting for API server to build (~12s)..." -ForegroundColor Gray
Start-Sleep -Seconds 12
Write-Host ""

# 4. Start frontend
Write-Host "[4/4] Starting frontend on port 5173..." -ForegroundColor Yellow
$env:PORT = "5173"
$env:BASE_PATH = "/"
$viteJob = Start-Process "cmd.exe" `
    -ArgumentList "/c", "pnpm --filter @workspace/climate-viz run dev" `
    -WorkingDirectory $rootDir `
    -PassThru -NoNewWindow
Start-Sleep -Seconds 4
Write-Host ""

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Open http://localhost:5173 in browser  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
if ($pythonProc) {
    Write-Host "  Data: Real NEX GDDP CMIP6 (OpenVisus)" -ForegroundColor Green
} else {
    Write-Host "  Data: Synthetic fallback (install Python for real data)" -ForegroundColor DarkYellow
}
Write-Host ""
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Gray
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 3
    }
} finally {
    Write-Host "Stopping services..." -ForegroundColor Yellow
    if ($viteJob -and -not $viteJob.HasExited) { Stop-Process -Id $viteJob.Id -ErrorAction SilentlyContinue }
    if ($nodeJob -and -not $nodeJob.HasExited) { Stop-Process -Id $nodeJob.Id -ErrorAction SilentlyContinue }
    if ($pythonProc -and -not $pythonProc.HasExited) { Stop-Process -Id $pythonProc.Id -ErrorAction SilentlyContinue }
    Write-Host "Done." -ForegroundColor Cyan
}
