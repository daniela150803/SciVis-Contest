/**
 * Heatmap.tsx — Choropleth World Map
 *
 * Renders a D3 Natural-Earth projection where countries belonging to the
 * 10 NEX-GDDP regions are coloured by temperature anomaly.
 * Reuses the same anomaly colour scale as Globe3D.
 *
 * Extra dependency (run once):
 *   npm install topojson-client @types/topojson-client world-atlas
 */

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import * as d3 from "d3";
// @ts-ignore
import * as topojson from "topojson-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemperatureRecord {
  year: number;
  region: string;
  regionId?: string;
  region_id?: string;
  temperature: number;
  temperatureAnomaly: number;
  scenario: string;
}

interface Region {
  id: string;
  name: string;
  color: string;
}

interface Props {
  data: TemperatureRecord[];
  regions: Region[];
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  scenario?: string;
}

function getRegionId(d: TemperatureRecord): string {
  return (
    d.regionId ??
    d.region_id ??
    d.region.toLowerCase().replace(/\s+/g, "_")
  );
}

// ── Colour scale (same as Globe3D) ────────────────────────────────────────────

const COLOR_STOPS: [number, string][] = [
  [-1,   "#153DA0"],
  [ 0,   "#2E8CCC"],
  [ 0.5, "#8CCCE6"],
  [ 1,   "#F3FCDB"],
  [ 1.5, "#FCCD4D"],
  [ 2,   "#FC9F3D"],
  [ 3,   "#F24D24"],
  [ 4,   "#B21717"],
];

const anomalyScale = d3
  .scaleLinear<string>()
  .domain(COLOR_STOPS.map(([t]) => t))
  .range(COLOR_STOPS.map(([, c]) => c))
  .clamp(true);

// ── Region → ISO-3166-1 numeric country codes ─────────────────────────────────

const REGION_COUNTRIES: Record<string, number[]> = {
  north_america: [
    124, 840, 484, 320, 340, 222, 558, 188, 591,
    192, 214, 332, 388, 630, 308, 659, 662, 670,
    52, 28, 84,
  ],
  south_america: [32, 68, 76, 152, 170, 218, 328, 604, 600, 740, 858, 862, 254],
  europe: [
    8, 40, 56, 100, 191, 196, 203, 208, 233, 246,
    250, 276, 300, 348, 372, 380, 428, 440, 442, 470,
    528, 578, 616, 620, 642, 703, 705, 724, 752, 756,
    804, 826, 498, 112, 643, 688, 70, 807, 499, 20,
    336, 492, 674, 438,
  ],
  africa: [
    12, 24, 204, 72, 854, 108, 120, 132, 140, 148,
    174, 180, 178, 262, 818, 226, 232, 231, 266, 288,
    324, 624, 384, 404, 426, 430, 434, 450, 454, 466,
    478, 480, 504, 508, 516, 562, 566, 646, 678, 686,
    694, 706, 710, 728, 729, 748, 834, 768, 788, 800,
    894, 716,
  ],
  south_asia: [50, 64, 356, 462, 524, 586, 144, 4],
  east_asia: [156, 392, 410, 408, 496, 158],
  southeast_asia: [96, 116, 360, 418, 458, 104, 608, 702, 764, 626, 704],
  australia: [36, 554, 598, 90, 548, 242, 520, 585, 583, 584, 776, 882],
  middle_east: [48, 368, 364, 376, 400, 414, 422, 512, 634, 682, 275, 760, 792, 784, 887],
  arctic: [304, 352, 744],
};

const COUNTRY_TO_REGION: Record<number, string> = {};
for (const [rid, codes] of Object.entries(REGION_COUNTRIES)) {
  for (const code of codes) {
    if (!(code in COUNTRY_TO_REGION)) COUNTRY_TO_REGION[code] = rid;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Heatmap({ data, regions, selectedYear, onYearChange, scenario }: Props) {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef   = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData]       = useState<any>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Fetch TopoJSON once
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then(setWorldData)
      .catch(console.error);
  }, []);

  // Anomaly per region for the selected year
  const anomalyByRegion = useMemo(() => {
    const year = selectedYear ?? 2050;
    const map: Record<string, number> = {};
    for (const d of data) {
      if (d.year === year) map[getRegionId(d)] = d.temperatureAnomaly;
    }
    return map;
  }, [data, selectedYear]);

  const years = useMemo(
    () => [...new Set(data.map((d) => d.year))].sort((a, b) => a - b),
    [data]
  );

  const regionNameById = useMemo(
    () => Object.fromEntries(regions.map((r) => [r.id, r.name])),
    [regions]
  );

  // ── Draw ───────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const svg       = svgRef.current;
    const container = containerRef.current;
    const tooltip   = tooltipRef.current;
    if (!svg || !container || !worldData) return;

    const W = container.clientWidth;
    const H = Math.max(300, Math.round(W * 0.46));

    const root = d3.select(svg);
    root.selectAll("*").remove();
    root.attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`);

    const projection = d3
      .geoNaturalEarth1()
      .scale((W / 640) * 100)
      .translate([W / 2, H / 2]);

    const path = d3.geoPath().projection(projection);

    // Ocean
    root
      .append("path")
      .datum({ type: "Sphere" } as any)
      .attr("d", path)
      .attr("fill", "#0a1628")
      .attr("stroke", "rgba(100,160,255,0.12)")
      .attr("stroke-width", 0.8);

    // Graticule
    root
      .append("path")
      .datum(d3.geoGraticule()())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.04)")
      .attr("stroke-width", 0.4);

    // Countries
    const countries = topojson.feature(worldData, worldData.objects.countries);

    root
      .append("g")
      .selectAll<SVGPathElement, any>("path.country")
      .data((countries as any).features)
      .join("path")
      .attr("class", "country")
      .attr("d", path as any)
      .attr("fill", (d: any) => {
        const rid = COUNTRY_TO_REGION[+d.id];
        if (!rid) return "#1a2744";
        const a = anomalyByRegion[rid];
        return a !== undefined ? anomalyScale(a) : "#1e2d4a";
      })
      .attr("stroke", "rgba(0,0,0,0.4)")
      .attr("stroke-width", 0.35)
      .attr("opacity", (d: any) => {
        const rid = COUNTRY_TO_REGION[+d.id];
        if (hoveredRegion && rid !== hoveredRegion) return 0.35;
        return 0.9;
      })
      .style("cursor", (d: any) => (COUNTRY_TO_REGION[+d.id] ? "pointer" : "default"))
      .on("mouseover", function (event: MouseEvent, d: any) {
        const rid = COUNTRY_TO_REGION[+d.id];
        if (!rid || !tooltip) return;
        setHoveredRegion(rid);
        const a    = anomalyByRegion[rid];
        const sign = a >= 0 ? "+" : "";
        tooltip.innerHTML = `
          <div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">
            ${regionNameById[rid] ?? rid}
          </div>
          <div style="font-size:15px;font-weight:700;color:#fff">
            ${a !== undefined ? `${sign}${a.toFixed(2)}°C` : "Sin datos"}
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:2px">
            Anomalía · ${selectedYear ?? "—"}
          </div>`;
        tooltip.style.opacity = "1";
        tooltip.style.left = `${(event as any).offsetX + 14}px`;
        tooltip.style.top  = `${(event as any).offsetY - 10}px`;
      })
      .on("mousemove", function (event: MouseEvent) {
        if (!tooltip) return;
        tooltip.style.left = `${(event as any).offsetX + 14}px`;
        tooltip.style.top  = `${(event as any).offsetY - 10}px`;
      })
      .on("mouseout", function () {
        setHoveredRegion(null);
        if (tooltip) tooltip.style.opacity = "0";
      });

    // Border mesh
    root
      .append("path")
      .datum(topojson.mesh(worldData, worldData.objects.countries, (a: any, b: any) => a !== b))
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(0,0,0,0.45)")
      .attr("stroke-width", 0.25);

    // Anomaly labels on each region centroid
    const labelsByRegion: Record<string, { sumX: number; sumY: number; count: number }> = {};
    for (const f of (countries as any).features) {
      const rid = COUNTRY_TO_REGION[+f.id];
      if (!rid || anomalyByRegion[rid] === undefined) continue;
      const c = path.centroid(f);
      if (!c || !isFinite(c[0]) || !isFinite(c[1])) continue;
      if (!labelsByRegion[rid]) labelsByRegion[rid] = { sumX: 0, sumY: 0, count: 0 };
      labelsByRegion[rid].sumX  += c[0];
      labelsByRegion[rid].sumY  += c[1];
      labelsByRegion[rid].count += 1;
    }

    for (const [rid, { sumX, sumY, count }] of Object.entries(labelsByRegion)) {
      const cx = sumX / count;
      const cy = sumY / count;
      if (cx < 5 || cx > W - 5 || cy < 5 || cy > H - 5) continue;

      const a    = anomalyByRegion[rid];
      const sign = a >= 0 ? "+" : "";
      const lbl  = `${sign}${a.toFixed(1)}°`;

      root
        .append("rect")
        .attr("x", cx - 18).attr("y", cy - 9)
        .attr("width", 36).attr("height", 17)
        .attr("rx", 8)
        .attr("fill", "rgba(0,0,0,0.6)")
        .attr("stroke", anomalyScale(a))
        .attr("stroke-width", 1)
        .attr("pointer-events", "none");

      root
        .append("text")
        .attr("x", cx).attr("y", cy + 4.5)
        .attr("text-anchor", "middle")
        .attr("font-size", 9)
        .attr("font-weight", "700")
        .attr("font-family", "ui-monospace, 'Cascadia Code', monospace")
        .attr("fill", "#fff")
        .attr("pointer-events", "none")
        .text(lbl);
    }
  }, [worldData, anomalyByRegion, hoveredRegion, regionNameById, selectedYear]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const obs = new ResizeObserver(() => draw());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const gradientStyle = {
    background: `linear-gradient(to right, ${COLOR_STOPS.map(
      ([v, c]) => `${c} ${((+v + 1) / 5) * 100}%`
    ).join(", ")})`,
  };

  return (
    <div ref={containerRef} className="relative w-full px-5 pb-5 pt-3">
      {!worldData && (
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground animate-pulse">
          Cargando mapa mundial…
        </div>
      )}

      <svg ref={svgRef} className="w-full overflow-visible" />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-50 rounded-lg border border-white/10 bg-black/80 px-3 py-2 shadow-xl backdrop-blur-sm transition-opacity duration-100"
        style={{ opacity: 0 }}
      />

      {/* Year strip */}
      {years.length > 0 && (
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <span className="mr-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Año
          </span>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange?.(y)}
              className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
                y === selectedYear
                  ? "bg-white/15 text-white ring-1 ring-white/30"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-col gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Anomalía de temperatura (°C vs. línea base 2000)
        </span>
        <div className="h-3 w-full rounded-sm" style={gradientStyle} />
        <div className="flex justify-between">
          {[-1, 0, 1, 2, 3, 4].map((v) => (
            <span key={v} className="text-[10px] text-muted-foreground">
              {v > 0 ? `+${v}°C` : `${v}°C`}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground/40">
        Hover para ver anomalía regional · Clic en año para navegar · NEX GDDP CMIP6 ·{" "}
        {scenario?.toUpperCase() ?? ""}
      </p>
    </div>
  );
}