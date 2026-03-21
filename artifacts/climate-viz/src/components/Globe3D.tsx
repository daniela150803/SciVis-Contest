import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

interface GlobePoint {
  lat: number;
  lon: number;
  temperature: number;
  temperatureAnomaly: number;
}

interface Props {
  points: GlobePoint[];
  year: number;
  scenario: string;
}

function anomalyToColor(anomaly: number): string {
  const stops = [
    { t: -1, r: 21, g: 57, b: 160 },
    { t: 0, r: 46, g: 140, b: 204 },
    { t: 0.5, r: 140, g: 204, b: 230 },
    { t: 1, r: 243, g: 252, b: 219 },
    { t: 1.5, r: 252, g: 205, b: 77 },
    { t: 2, r: 252, g: 159, b: 61 },
    { t: 3, r: 242, g: 77, b: 36 },
    { t: 4, r: 178, g: 23, b: 23 },
  ];

  const clamped = Math.max(-1, Math.min(4, anomaly));
  let i = 0;
  while (i < stops.length - 2 && stops[i + 1].t <= clamped) i++;
  const s0 = stops[i];
  const s1 = stops[i + 1];
  const frac = (clamped - s0.t) / (s1.t - s0.t);
  const r = Math.round(s0.r + (s1.r - s0.r) * frac);
  const g = Math.round(s0.g + (s1.g - s0.g) * frac);
  const b = Math.round(s0.b + (s1.b - s0.b) * frac);
  return `rgb(${r},${g},${b})`;
}

const LEGEND = [
  { label: "−1°C", color: "#153DA0" },
  { label: "0°C", color: "#2E8CCC" },
  { label: "+1°C", color: "#F3FCDB" },
  { label: "+2°C", color: "#FC9F3D" },
  { label: "+3°C", color: "#F24D24" },
  { label: "+4°C", color: "#B21717" },
];

export function Globe3D({ points, year, scenario }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ lambda: -20, phi: 15 });
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const [size, setSize] = useState({ w: 600, h: 480 });
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = size;
    const radius = Math.min(w, h) / 2 - 20;
    const cx = w / 2;
    const cy = h / 2;

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .center([0, 0])
      .rotate([rotationRef.current.lambda, -rotationRef.current.phi])
      .translate([cx, cy]);

    const path = d3.geoPath(projection, ctx);

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius * 1.2);
    gradient.addColorStop(0, "#1a2744");
    gradient.addColorStop(0.5, "#0d1728");
    gradient.addColorStop(1, "#060d1a");
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(100, 150, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const pt of points) {
      const [x, y] = projection([pt.lon, pt.lat]) ?? [0, 0];
      if (!isFinite(x) || !isFinite(y)) continue;

      const geoPoint: GeoJSON.Point = { type: "Point", coordinates: [pt.lon, pt.lat] };
      const dist = d3.geoDistance(geoPoint.coordinates as [number, number], [
        -rotationRef.current.lambda,
        rotationRef.current.phi,
      ]);
      if (dist > Math.PI / 2) continue;

      const color = anomalyToColor(pt.temperatureAnomaly);
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    const glow = ctx.createRadialGradient(cx, cy - radius * 0.7, 0, cx, cy, radius);
    glow.addColorStop(0, "rgba(100, 180, 255, 0.0)");
    glow.addColorStop(0.7, "rgba(100, 180, 255, 0.0)");
    glow.addColorStop(1, "rgba(100, 180, 255, 0.04)");
    ctx.fillStyle = glow;
    ctx.fill();
  }, [points, size]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = entry.contentRect.width;
        setSize({ w, h: 480 });
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
      setSize({ w: containerRef.current.clientWidth, h: 480 });
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let lastTime = 0;
    const autoRotate = (time: number) => {
      if (!isDraggingRef.current) {
        const dt = time - lastTime;
        if (dt > 16) {
          rotationRef.current.lambda += 0.06;
          draw();
          lastTime = time;
        }
      }
      animRef.current = requestAnimationFrame(autoRotate);
    };
    animRef.current = requestAnimationFrame(autoRotate);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const onMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    rotationRef.current.lambda += dx * 0.4;
    rotationRef.current.phi = Math.max(-80, Math.min(80, rotationRef.current.phi - dy * 0.4));
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
    draw();
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        className="w-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />

      <div className="absolute bottom-4 left-5 flex flex-col gap-1.5">
        <span className="text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wider">
           Anomalía de Temp.
        </span>
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 right-5 text-[10px] text-muted-foreground/50 text-right">
        <p>Arrastra para rotar</p>
        <p className="mt-0.5">NEX GDDP CMIP6</p>
      </div>
    </div>
  );
}
