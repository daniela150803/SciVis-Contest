import { useMemo, useState } from "react";

interface TemperatureRecord {
  year: number;
  region: string;
  temperature: number;
  temperatureAnomaly: number;
  scenario: string;
  model: string;
}

interface Region {
  id: string;
  name: string;
  lat: number;
  lon: number;
  color: string;
}

interface Props {
  data: TemperatureRecord[];
  regions: Region[];
  selectedRegion: string | undefined;
  onYearChange: (year: number) => void;
  scenario: string;
}

export function TemperatureTimeline({
  data,
  regions,
  selectedRegion: externalSelected,
  onYearChange,
  scenario,
}: Props) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);

  const activeRegion = internalSelected ?? externalSelected ?? null;

  const years = useMemo(
    () => [...new Set(data.map((d) => d.year))].sort((a, b) => a - b),
    [data]
  );

  const currentYear = years[frameIdx];

  const anomalyMap = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    regions.forEach((r) => {
      map[r.id] = {};
      years.forEach((y) => {
        const rec = data.find((d) => d.year === y && d.region === r.name);
        map[r.id][y] = rec?.temperatureAnomaly ?? 0;
      });
    });
    return map;
  }, [data, regions, years]);

  const baseline = useMemo(() => {
    const baseYears = years.slice(0, Math.max(1, Math.floor(years.length * 0.2)));
    const b: Record<string, number> = {};
    regions.forEach((r) => {
      const vals = baseYears.map((y) => anomalyMap[r.id][y]);
      b[r.id] = vals.reduce((a, c) => a + c, 0) / vals.length;
    });
    return b;
  }, [anomalyMap, regions, years]);

  const peakByRegion = useMemo(() => {
    const pk: Record<string, { year: number; anomaly: number }> = {};
    regions.forEach((r) => {
      let best = { year: years[0], anomaly: -Infinity };
      years.forEach((y) => {
        const v = anomalyMap[r.id][y];
        if (v > best.anomaly) best = { year: y, anomaly: v };
      });
      pk[r.id] = best;
    });
    return pk;
  }, [anomalyMap, regions, years]);

  const raceFrame = useMemo(() => {
    return [...regions]
      .map((r) => ({ ...r, anomaly: anomalyMap[r.id][currentYear] ?? 0 }))
      .sort((a, b) => b.anomaly - a.anomaly);
  }, [regions, anomalyMap, currentYear]);

  const maxRaceAnomaly = useMemo(
    () => Math.max(...raceFrame.map((r) => r.anomaly), 0.01),
    [raceFrame]
  );

  const detailSeries = useMemo(() => {
    if (!activeRegion) return [];
    return years.map((y) => ({
      year: y,
      anomaly: anomalyMap[activeRegion][y] ?? 0,
    }));
  }, [activeRegion, anomalyMap, years]);

  const detailMax = useMemo(
    () => Math.max(...detailSeries.map((p) => p.anomaly), 0.01),
    [detailSeries]
  );

  const detailMin = useMemo(
    () => Math.min(...detailSeries.map((p) => p.anomaly), 0),
    [detailSeries]
  );

  const rankOverTime = useMemo(() => {
    if (!activeRegion) return {};
    const rk: Record<number, number> = {};
    years.forEach((y) => {
      const sorted = [...regions].sort(
        (a, b) => (anomalyMap[b.id][y] ?? 0) - (anomalyMap[a.id][y] ?? 0)
      );
      rk[y] = sorted.findIndex((r) => r.id === activeRegion) + 1;
    });
    return rk;
  }, [activeRegion, anomalyMap, regions, years]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    setFrameIdx(idx);
    onYearChange(years[idx]);
  };

  const handleSelectRegion = (id: string) => {
    setInternalSelected((prev) => (prev === id ? null : id));
  };

  const selectedRegionData = activeRegion
    ? regions.find((r) => r.id === activeRegion)
    : null;

  const currentRank = activeRegion ? rankOverTime[currentYear] : null;
  const currentAnomaly = activeRegion ? anomalyMap[activeRegion][currentYear] : null;
  const currentAbove = activeRegion
    ? (anomalyMap[activeRegion][currentYear] ?? 0) - baseline[activeRegion]
    : null;

  const sparkPath = useMemo(() => {
    if (!detailSeries.length) return "";
    const W = 600;
    const H = 80;
    const range = detailMax - Math.min(detailMin, 0);
    return detailSeries
      .map((p, i) => {
        const x = (i / (detailSeries.length - 1)) * W;
        const y = H - ((p.anomaly - Math.min(detailMin, 0)) / range) * H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [detailSeries, detailMax, detailMin]);

  const sparkFill = useMemo(() => {
    if (!detailSeries.length || !activeRegion) return "";
    const W = 600;
    const H = 80;
    const range = detailMax - Math.min(detailMin, 0);
    const lastX = W.toFixed(1);
    const baselineY = (
      H - ((baseline[activeRegion] - Math.min(detailMin, 0)) / range) * H
    ).toFixed(1);
    return sparkPath + ` L${lastX},${baselineY} L0,${baselineY} Z`;
  }, [sparkPath, detailSeries, detailMax, detailMin, baseline, activeRegion]);

  return (
    <div className="px-2 pb-4 pt-2">
      {/* ── HEADER ── */}
      <div className="flex items-start gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-4xl font-medium text-foreground leading-none">
            {currentYear}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{scenario}</div>
        </div>

        {selectedRegionData && currentAnomaly !== null && (
          <div
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: selectedRegionData.color + "40" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedRegionData.color }}
            />
            <span className="font-medium text-foreground">
              {selectedRegionData.name}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium" style={{ color: selectedRegionData.color }}>
              #{currentRank}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-foreground">
              {currentAnomaly >= 0 ? "+" : ""}
              {currentAnomaly.toFixed(2)}°C
            </span>
            {currentAbove !== null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  currentAbove > 0
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}
              >
                {currentAbove >= 0 ? "+" : ""}
                {currentAbove.toFixed(2)}°C vs línea base
              </span>
            )}
            <button
              className="ml-1 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setInternalSelected(null)}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── DETAIL PANEL ── */}
      {activeRegion && selectedRegionData && (
        <div
          className="mb-4 p-3 rounded-xl border"
          style={{ borderColor: selectedRegionData.color + "30" }}
        >
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Evolución — {selectedRegionData.name}
            </span>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>
                Peor año:{" "}
                <strong className="text-foreground">
                  {peakByRegion[activeRegion].year}
                </strong>{" "}
                (+{peakByRegion[activeRegion].anomaly.toFixed(2)}°C)
              </span>
              <span>
                Línea base:{" "}
                <strong className="text-foreground">
                  {baseline[activeRegion] >= 0 ? "+" : ""}
                  {baseline[activeRegion].toFixed(2)}°C
                </strong>
              </span>
            </div>
          </div>

          <div className="relative w-full" style={{ height: 80 }}>
            <svg viewBox="0 0 600 80" width="100%" height="80" preserveAspectRatio="none">
              <path d={sparkFill} fill={selectedRegionData.color} fillOpacity={0.12} />
              <path
                d={sparkPath}
                fill="none"
                stroke={selectedRegionData.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {(() => {
                const H = 80;
                const range = detailMax - Math.min(detailMin, 0);
                const pt = detailSeries[frameIdx];
                if (!pt) return null;
                const x = (frameIdx / (detailSeries.length - 1)) * 600;
                const y = H - ((pt.anomaly - Math.min(detailMin, 0)) / range) * H;
                return (
                  <>
                    <line
                      x1={x} y1={0} x2={x} y2={80}
                      stroke={selectedRegionData.color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <circle
                      cx={x} cy={y} r={4}
                      fill={selectedRegionData.color}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  </>
                );
              })()}
            </svg>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>{years[0]}</span>
              <span>{years[Math.floor(years.length / 2)]}</span>
              <span>{years[years.length - 1]}</span>
            </div>
          </div>

          {/* Ranking strip */}
          <div className="mt-3">
            <div className="text-[10px] text-muted-foreground mb-1">
              Ranking global a lo largo del tiempo
            </div>
            <div className="flex gap-0.5">
              {years.map((y, i) => {
                const rk = rankOverTime[y];
                const intensity = 1 - (rk - 1) / regions.length;
                const isCurrent = i === frameIdx;
                return (
                  <div
                    key={y}
                    className="flex-1 rounded-sm flex items-center justify-center cursor-pointer"
                    style={{
                      height: 20,
                      backgroundColor:
                        selectedRegionData.color +
                        Math.round(intensity * 200).toString(16).padStart(2, "0"),
                      outline: isCurrent ? `2px solid ${selectedRegionData.color}` : "none",
                      outlineOffset: 1,
                    }}
                    title={`${y}: #${rk}`}
                    onClick={() => {
                      setFrameIdx(i);
                      onYearChange(y);
                    }}
                  >
                    {isCurrent && (
                      <span className="text-[9px] font-medium" style={{ color: "#fff" }}>
                        #{rk}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── BARS ── */}
      <div className="flex flex-col gap-1.5">
        {raceFrame.map((r, i) => {
          const pct = (r.anomaly / maxRaceAnomaly) * 100;
          const isSelected = activeRegion === r.id;
          const isDimmed = activeRegion !== null && !isSelected;

          return (
            <div
              key={r.id}
              className="flex items-center h-10 cursor-pointer"
              onClick={() => handleSelectRegion(r.id)}
            >
              <div
                className="w-32 flex-shrink-0 text-right pr-3 text-sm font-medium truncate transition-opacity"
                style={{
                  color: isSelected ? r.color : "var(--foreground)",
                  opacity: isDimmed ? 0.35 : 1,
                }}
              >
                {r.name}
              </div>

              <div
                className="flex-1 relative h-8 rounded-md overflow-hidden transition-opacity"
                style={{
                  backgroundColor: isSelected ? r.color + "20" : "var(--muted)",
                  opacity: isDimmed ? 0.3 : 1,
                  outline: isSelected ? `1.5px solid ${r.color}60` : "none",
                  borderRadius: 6,
                }}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-md flex items-center justify-end pr-2.5"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: r.color,
                    transition: "width 0.45s cubic-bezier(0.4,0,0.2,1)",
                    minWidth: pct > 0 ? "2rem" : 0,
                  }}
                >
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: "#fff" }}>
                    {r.anomaly >= 0 ? "+" : ""}
                    {r.anomaly.toFixed(2)}°C
                  </span>
                </div>
              </div>

              <div
                className="w-8 flex-shrink-0 text-center text-xs ml-2 transition-opacity"
                style={{
                  color: isSelected ? r.color : "var(--muted-foreground)",
                  fontWeight: isSelected ? 500 : 400,
                  opacity: isDimmed ? 0.25 : 1,
                }}
              >
                #{i + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SLIDER ── */}
      <div className="flex items-center gap-3 mt-5">
        <span className="text-xs text-muted-foreground min-w-[36px]">{years[0]}</span>
        <input
          type="range"
          min={0}
          max={years.length - 1}
          value={frameIdx}
          step={1}
          onChange={handleSlider}
          className="flex-1 accent-primary"
        />
        <span className="text-xs text-muted-foreground min-w-[36px] text-right">
          {years[years.length - 1]}
        </span>
      </div>

      <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
        {activeRegion
          ? "Clic en la región seleccionada para deseleccionar"
          : "Arrastra para navegar · Clic en una región para ver su detalle"}
      </p>
    </div>
  );
}