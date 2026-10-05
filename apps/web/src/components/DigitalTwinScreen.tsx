"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CloudRain, Map as MapIcon, GitBranch, Zap, RefreshCw, AlertTriangle,
  ChevronRight, Wind, Eye, Clock, Info,
  Newspaper, Loader2, CheckCircle2, XCircle, Activity
} from 'lucide-react';
import {
  estimateWeatherImpact,
  stormLabel,
  intensityToRainfall,
  intensityToDuration,
  type WeatherParam,
} from '@/lib/weatherImpact';
import { TripGraph } from '@yatrasarthi/graph';
import type { TripData } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimNodeResult {
  id: string;
  label: string;
  type: string;
  status: 'ok' | 'at_risk' | 'broken';
  addedDelayMin: number;
  strain: number;           // 0–1
  confidencePct: number;
  lat?: number;
  lng?: number;
}

interface SimEdgeResult {
  from: string;
  to: string;
  state: 'ok' | 'at_risk' | 'broken';
  strain: number;
  bufferMin: number;
}

interface SocialSignal {
  id: string;
  location: string;
  topic: string;
  mentionCount: number;
  headline: string;
  source: string;
  publishedAt: string;
  sentiment: 'warning' | 'critical' | 'info';
}

interface WeatherData {
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  temperature?: number;
}

interface LogEntry {
  id: number;
  msg: string;
  icon: string;
  level: 'info' | 'warn' | 'critical';
}

type ActiveParam = WeatherParam;
type TabId = 'graph' | 'map';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NODE_EMOJI: Record<string, string> = {
  flight: '✈️', train: '🚆', cab: '🚕', bus: '🚌',
  hotel: '🏨', restaurant: '🍽️', activity: '🎯', phantom: '👻',
};

function statusColor(status: 'ok' | 'at_risk' | 'broken'): string {
  return status === 'broken' ? '#E45B4D' : status === 'at_risk' ? '#E5A43F' : '#62A86B';
}

function strainToColor(strain: number): string {
  // green (#62A86B) → amber (#E5A43F) → red (#E45B4D)
  if (strain < 0.5) {
    const t = strain * 2;
    const r = Math.round(0x62 + t * (0xE5 - 0x62));
    const g = Math.round(0xA8 + t * (0xA4 - 0xA8));
    const b = Math.round(0x6B + t * (0x3F - 0x6B));
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (strain - 0.5) * 2;
    const r = Math.round(0xE5 + t * (0xE4 - 0xE5));
    const g = Math.round(0xA4 + t * (0x5B - 0xA4));
    const b = Math.round(0x3F + t * (0x4D - 0x3F));
    return `rgb(${r},${g},${b})`;
  }
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000 / 60;
  if (diff < 1) return 'just now';
  if (diff < 60) return `${Math.round(diff)}m ago`;
  return `${Math.round(diff / 60)}h ago`;
}

// ─── Confidence Ring SVG ──────────────────────────────────────────────────────

function ConfidenceRing({ pct, color }: { pct: number; color: string }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={34} height={34} viewBox="0 0 34 34">
      <circle cx={17} cy={17} r={r} stroke="#E2E8F0" strokeWidth={3.5} fill="none" />
      <circle
        cx={17} cy={17} r={r}
        stroke={color} strokeWidth={3.5} fill="none"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 17 17)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x={17} y={21} textAnchor="middle" fontSize={8} fontWeight={700} fill={color}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── Storm Gauge (SVG Dial) ───────────────────────────────────────────────────

function StormGauge({
  value, onChange, label
}: { value: number; onChange: (v: number) => void; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const needleAngle = (value / 100) * 180 - 90;

  const arcColor = value > 70 ? '#E45B4D' : value > 40 ? '#E5A43F' : '#62A86B';

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="relative" style={{ width: 180, height: 100 }}>
        {/* Hidden native range for accessibility + dragging */}
        <input
          ref={inputRef}
          type="range" min={0} max={100} value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
        />
        <svg viewBox="0 0 200 110" width={180} height={100}>
          {/* Track arc */}
          <path d="M15,100 A85,85 0 0,1 185,100" stroke="#E2E8F0" strokeWidth={12} fill="none" strokeLinecap="round" />
          {/* Filled arc (SVG clip trick via dashoffset) */}
          <path d="M15,100 A85,85 0 0,1 185,100"
            stroke={arcColor}
            strokeWidth={12} fill="none" strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 267} 267`}
            style={{ transition: 'stroke-dasharray 0.2s, stroke 0.3s' }}
          />
          {/* Zone marks */}
          {[0, 40, 70, 100].map((v) => {
            const a = ((v / 100) * 180 - 90) * (Math.PI / 180);
            const x = 100 + 78 * Math.cos(a - Math.PI);
            const y = 100 + 78 * Math.sin(a - Math.PI);
            return <circle key={v} cx={x} cy={y} r={3} fill="#CBD5CC" />;
          })}
          {/* Needle */}
          <line
            x1={100} y1={100} x2={100} y2={25}
            stroke="#172017" strokeWidth={3} strokeLinecap="round"
            style={{
              transformOrigin: '100px 100px',
              transform: `rotate(${needleAngle}deg)`,
              transition: 'transform 0.15s ease-out'
            }}
          />
          <circle cx={100} cy={100} r={7} fill="#172017" />
          <circle cx={100} cy={100} r={3} fill="#C5D82D" />
          {/* Labels */}
          <text x={18} y={115} fontSize={9} fill="#858B80" fontWeight={600}>Clear</text>
          <text x={155} y={115} fontSize={9} fill="#E45B4D" fontWeight={700}>Extreme</text>
        </svg>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-3xl font-extrabold tracking-tight" style={{ color: arcColor }}>{value}</span>
        <span className="text-xs font-semibold" style={{ color: arcColor }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Living Graph (D3-style with React SVG) ───────────────────────────────────

function LivingGraph({
  nodes, edges, logEntries, stormValue
}: {
  nodes: SimNodeResult[];
  edges: SimEdgeResult[];
  logEntries: LogEntry[];
  stormValue: number;
}) {
  // Lay out nodes in a force-like horizontal arrangement with vertical offsets
  const W = 900, H = 360;
  const count = nodes.length;

  const positions = nodes.map((n, i) => {
    const col = count <= 1 ? 0.5 : i / (count - 1);
    // Slight vertical wave so the graph feels organic
    const wave = Math.sin(i * 1.1) * 40;
    return {
      x: 80 + col * (W - 160),
      y: H / 2 + wave,
    };
  });

  // Map from node id → position index
  const posMap = new Map<string, number>(nodes.map((n, i) => [n.id, i] as [string, number]));

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Graph canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-[#D5D9CC]"
        style={{ background: 'radial-gradient(ellipse at 40% 40%, #F0F5EC 0%, #F8F6EE 100%)', minHeight: 360 }}>

        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}>
          <defs>
            <marker id="arrow-ok" markerWidth={5} markerHeight={5} refX={4} refY={2.5} orient="auto">
              <path d="M0,0.5 L0,4.5 L4.5,2.5 z" fill="#62A86B" opacity={0.7} />
            </marker>
            <marker id="arrow-risk" markerWidth={5} markerHeight={5} refX={4} refY={2.5} orient="auto">
              <path d="M0,0.5 L0,4.5 L4.5,2.5 z" fill="#E5A43F" opacity={0.7} />
            </marker>
            <marker id="arrow-broken" markerWidth={5} markerHeight={5} refX={4} refY={2.5} orient="auto">
              <path d="M0,0.5 L0,4.5 L4.5,2.5 z" fill="#E45B4D" opacity={0.9} />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const fromIdx = posMap.get(edge.from);
            const toIdx = posMap.get(edge.to);
            if (fromIdx === undefined || toIdx === undefined) return null;
            const from = positions[fromIdx];
            const to = positions[toIdx];
            const color = strainToColor(edge.strain);
            
            // Minimalistic edges: 1.5px baseline, up to 2.5px when highly strained.
            const width = isNaN(edge.strain) ? 1.5 : 1.5 + (1 - edge.strain) * 1;
            const isBroken = edge.state === 'broken';
            const markerId = edge.state === 'broken' ? 'arrow-broken'
              : edge.state === 'at_risk' ? 'arrow-risk' : 'arrow-ok';

            // Softer control point for a gentler curve
            const cx = (from.x + to.x) / 2;
            const cy = Math.min(from.y, to.y) - 15;

            return (
              <g key={i}>
                {isBroken ? (
                  <path
                    d={`M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`}
                    stroke={color} strokeWidth={width + 0.5} fill="none"
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                    markerEnd={`url(#${markerId})`}
                    style={{ animation: stormValue > 0 ? 'edgeSnap 0.7s ease-out forwards' : undefined }}
                    opacity={0.8}
                  />
                ) : (
                  <path
                    d={`M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`}
                    stroke={color} strokeWidth={width} fill="none"
                    strokeLinecap="round"
                    markerEnd={`url(#${markerId})`}
                    style={{ transition: 'stroke 0.4s, stroke-width 0.4s' }}
                    opacity={0.6}
                  />
                )}
                {/* Buffer label on edge */}
                {edge.bufferMin > 0 && (
                  <text
                    x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 12}
                    textAnchor="middle" fontSize={8} fill={color} fontWeight={600} opacity={0.85}
                  >
                    {edge.bufferMin}m buf
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const pos = positions[i];
            const color = statusColor(node.status);
            const isAffected = node.status !== 'ok';

            return (
              <g key={node.id}
                style={{ animation: isAffected && stormValue > 0 ? 'nodeShake 0.4s ease-in-out' : undefined }}>
                {/* Glow ring for affected nodes */}
                {isAffected && (
                  <circle cx={pos.x} cy={pos.y} r={32}
                    fill={color} opacity={0.12}
                    style={{ animation: 'nodePulse 1.8s ease-in-out infinite' }}
                  />
                )}
                {/* Main circle */}
                <circle cx={pos.x} cy={pos.y} r={24}
                  fill="white" stroke={color} strokeWidth={2.5}
                  style={{ transition: 'stroke 0.4s', filter: isAffected ? `drop-shadow(0 0 6px ${color}40)` : undefined }}
                />
                {/* Emoji */}
                <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>
                  {NODE_EMOJI[node.type] ?? '📌'}
                </text>
                {/* Status dot */}
                <circle cx={pos.x + 18} cy={pos.y - 18} r={6}
                  fill={color} stroke="white" strokeWidth={2}
                  style={{ transition: 'fill 0.4s' }}
                />
                {/* Label */}
                <text x={pos.x} y={pos.y + 40} textAnchor="middle" fontSize={10} fontWeight={700} fill="#172017">
                  {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                </text>
                {node.addedDelayMin > 0 && (
                  <text x={pos.x} y={pos.y + 52} textAnchor="middle" fontSize={9} fontWeight={600} fill={color}>
                    +{node.addedDelayMin}m
                  </text>
                )}
                {/* Confidence ring overlay for at-risk/broken */}
                {isAffected && (
                  <foreignObject x={pos.x - 40} y={pos.y - 50} width={38} height={38}>
                    <ConfidenceRing pct={node.confidencePct} color={color} />
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Empty state */}
          {nodes.length === 0 && (
            <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle"
              fontSize={14} fill="#858B80" fontWeight={600}>
              Select a trip to visualise its dependency graph
            </text>
          )}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-4 flex gap-3 text-xs font-semibold" style={{ color: '#5F665B' }}>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#62A86B] inline-block" /> On-track</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E5A43F] inline-block" /> At-risk</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E45B4D] inline-block" /> Broken</span>
        </div>

        {/* Storm intensity badge */}
        {stormValue > 0 && (
          <div className="absolute top-3 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: stormValue > 70 ? '#FDECEA' : stormValue > 40 ? '#FEF3CD' : '#EAF4EA', color: stormValue > 70 ? '#D93829' : stormValue > 40 ? '#B26A00' : '#3E6F4B' }}>
            <CloudRain size={12} />
            Storm {stormValue}%
          </div>
        )}
      </div>

      {/* Cascade ticker */}
      <div className="rounded-2xl border border-[#D5D9CC] overflow-hidden" style={{ background: '#1A1F1A' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2A352A]">
          <Activity size={13} className="text-[#C5D82D]" />
          <span className="text-xs font-bold text-[#C5D82D] tracking-wide uppercase">Cascade Log</span>
          {logEntries.length > 0 && (
            <span className="ml-auto text-xs text-[#5F7560]">{logEntries.length} event{logEntries.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="max-h-[130px] overflow-y-auto p-3 flex flex-col gap-1.5">
          {logEntries.length === 0 ? (
            <p className="text-xs text-[#4A5A4A] text-center py-3 font-medium">
              Move the storm gauge to simulate cascade effects
            </p>
          ) : (
            logEntries.map((entry) => (
              <div key={entry.id}
                className="flex items-start gap-2 text-xs font-medium animate-fade-in"
                style={{ color: entry.level === 'critical' ? '#FF8A80' : entry.level === 'warn' ? '#F0B04A' : '#8FBF8F' }}>
                <span className="mt-px">{entry.icon}</span>
                <span>{entry.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Map View (Mapbox — graceful text fallback if token missing) ──────────────

function MapView({
  nodes, stormValue, socialSignals, onRefreshSignals, loadingSignals
}: {
  nodes: SimNodeResult[];
  stormValue: number;
  socialSignals: SocialSignal[];
  onRefreshSignals: () => void;
  loadingSignals: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapboxLoaded = useRef(false);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Determine map bounds from node coordinates
  const nodesWithCoords = nodes.filter(n => n.lat !== undefined && n.lng !== undefined);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || mapboxLoaded.current || !mapRef.current) {
      if (!token) setMapError(true);
      return;
    }

    mapboxLoaded.current = true;

    // Dynamically load Mapbox GL JS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
    script.onload = () => {
      const mapboxgl = (window as any).mapboxgl;
      mapboxgl.accessToken = token;
      const center: [number, number] = nodesWithCoords.length > 0
        ? [nodesWithCoords[0].lng!, nodesWithCoords[0].lat!]
        : [72.8777, 19.0760]; // Mumbai default

      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom: 10,
      });

      mapInstance.current.on('load', () => setMapReady(true));
    };
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, []);

  // Update markers when nodes or storm changes
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const mapboxgl = (window as any).mapboxgl;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    nodesWithCoords.forEach(node => {
      const color = statusColor(node.status);
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width:40px;height:40px;border-radius:50%;background:white;
          border:3px solid ${color};display:flex;align-items:center;
          justify-content:center;font-size:18px;cursor:pointer;
          box-shadow:0 4px 12px ${color}40;
          transition:all 0.3s
        " title="${node.label}">
          ${NODE_EMOJI[node.type] ?? '📌'}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:8px;min-width:160px">
          <div style="font-weight:800;font-size:13px;color:#172017;margin-bottom:4px">${node.label}</div>
          <div style="font-size:11px;color:${color};font-weight:700;margin-bottom:3px">
            ${node.status === 'broken' ? '🔴 Broken' : node.status === 'at_risk' ? '🟡 At Risk' : '🟢 On Track'}
          </div>
          ${node.addedDelayMin > 0 ? `<div style="font-size:11px;color:#D93829;font-weight:700">+${node.addedDelayMin}m delay</div>` : ''}
          <div style="font-size:10px;color:#858B80;margin-top:3px">Confidence: ${Math.round(node.confidencePct)}%</div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([node.lng!, node.lat!])
        .setPopup(popup)
        .addTo(mapInstance.current);

      markersRef.current.push(marker);
    });

    // ─── Add/Update Route Line in Mapbox ───
    const coordinates = nodesWithCoords.map(n => [n.lng, n.lat]);
    const isDisrupted = nodes.some(n => n.status !== 'ok');

    if (mapInstance.current.getSource('route')) {
      mapInstance.current.getSource('route').setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates
        }
      });
      
      // Update line color based on disruption
      if (mapInstance.current.getLayer('route')) {
        mapInstance.current.setPaintProperty('route', 'line-color', isDisrupted ? '#E45B4D' : '#C8D8C0');
        mapInstance.current.setPaintProperty('route', 'line-dasharray', isDisrupted ? [2, 2] : [1]);
      }
    } else {
      mapInstance.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      });
      mapInstance.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': isDisrupted ? '#E45B4D' : '#C8D8C0',
          'line-width': 4,
          'line-dasharray': isDisrupted ? [2, 2] : [1]
        }
      });
    }
  }, [mapReady, nodes]);

  // Show a stylish placeholder map when Mapbox token is absent
  if (mapError || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col gap-4">
        {/* Static SVG placeholder map */}
        <div className="rounded-2xl border border-[#D5D9CC] overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #E8F0E2 0%, #DCE8D2 50%, #E8F0E2 100%)', minHeight: 300 }}>
          <svg width="100%" height="300" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">
            {/* Simple grid for map feel */}
            {[...Array(8)].map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 42 + 15} x2={800} y2={i * 42 + 15}
                stroke="#C8D8C0" strokeWidth={0.8} strokeDasharray="4 8" />
            ))}
            {[...Array(12)].map((_, i) => (
              <line key={`v${i}`} x1={i * 70 + 15} y1={0} x2={i * 70 + 15} y2={300}
                stroke="#C8D8C0" strokeWidth={0.8} strokeDasharray="4 8" />
            ))}

            {/* Plot nodes at approximate positions */}
            {nodes.map((node, i) => {
              const x = 80 + (i / Math.max(nodes.length - 1, 1)) * 640;
              const y = 120 + Math.sin(i * 1.4) * 60;
              const color = statusColor(node.status);
              return (
                <g key={node.id}>
                  {/* Connection line */}
                  {i < nodes.length - 1 && (() => {
                    const nx = 80 + ((i + 1) / Math.max(nodes.length - 1, 1)) * 640;
                    const ny = 120 + Math.sin((i + 1) * 1.4) * 60;
                    return (
                      <line x1={x} y1={y} x2={nx} y2={ny}
                        stroke={strainToColor(node.strain)} strokeWidth={2.5}
                        strokeDasharray={node.status === 'broken' ? '6 4' : undefined}
                        opacity={0.7} />
                    );
                  })()}
                  {/* Pulse ring */}
                  {node.status !== 'ok' && (
                    <circle cx={x} cy={y} r={22} fill={color} opacity={0.15}
                      style={{ animation: 'nodePulse 2s ease-in-out infinite' }} />
                  )}
                  <circle cx={x} cy={y} r={18} fill="white"
                    stroke={color} strokeWidth={2.5}
                    style={{ filter: `drop-shadow(0 2px 6px ${color}40)` }} />
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14}>
                    {NODE_EMOJI[node.type] ?? '📌'}
                  </text>
                  <text x={x} y={y + 32} textAnchor="middle" fontSize={9} fontWeight={700} fill="#172017">
                    {node.label.length > 12 ? node.label.slice(0, 10) + '…' : node.label}
                  </text>
                  {node.addedDelayMin > 0 && (
                    <text x={x} y={y + 43} textAnchor="middle" fontSize={8} fontWeight={700} fill={color}>
                      +{node.addedDelayMin}m
                    </text>
                  )}
                </g>
              );
            })}

            {/* Social signal pins */}
            {socialSignals.slice(0, 3).map((sig, i) => {
              const x = 120 + i * 220;
              const y = 45;
              const pinColor = sig.sentiment === 'critical' ? '#E45B4D' : sig.sentiment === 'warning' ? '#E5A43F' : '#4A6FA5';
              return (
                <g key={sig.id}>
                  <circle cx={x} cy={y} r={10} fill={pinColor} opacity={0.9} />
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={10}>
                    {sig.sentiment === 'critical' ? '🚨' : sig.sentiment === 'warning' ? '⚠️' : 'ℹ️'}
                  </text>
                  <rect x={x - 60} y={y + 14} width={120} height={22} rx={4}
                    fill="white" stroke={pinColor} strokeWidth={1} opacity={0.95} />
                  <text x={x} y={y + 26} textAnchor="middle" fontSize={7.5} fill="#172017" fontWeight={600}>
                    {sig.mentionCount} reports · {sig.location}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="absolute bottom-3 left-4 text-xs text-[#5F665B] font-medium bg-white/80 px-3 py-1.5 rounded-full border border-[#D5D9CC]">
            📍 Set NEXT_PUBLIC_MAPBOX_TOKEN for live Mapbox map
          </div>
        </div>
        <SocialSignalList signals={socialSignals} loading={loadingSignals} onRefresh={onRefreshSignals} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={mapRef} className="rounded-2xl overflow-hidden border border-[#D5D9CC]"
        style={{ height: 340 }} />
      {!mapReady && (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-[#858B80]">
          <Loader2 size={16} className="animate-spin" /> Loading map…
        </div>
      )}
      <SocialSignalList signals={socialSignals} loading={loadingSignals} onRefresh={onRefreshSignals} />
    </div>
  );
}

// ─── Social Signal List ───────────────────────────────────────────────────────

function SocialSignalList({
  signals, loading, onRefresh
}: { signals: SocialSignal[]; loading: boolean; onRefresh: () => void }) {
  return (
    <div className="rounded-2xl border border-[#D5D9CC] overflow-hidden" style={{ background: '#fff' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8EDE4]">
        <Newspaper size={14} className="text-[#4A6FA5]" />
        <span className="text-sm font-bold text-[#172017]">Social & News Signals</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#D5D9CC] hover:bg-[#F0F5EC] transition-all disabled:opacity-50"
          style={{ color: '#5F665B' }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      <div className="divide-y divide-[#F0F0EA]">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-[#858B80]">
            <Loader2 size={14} className="animate-spin" /> Fetching signals…
          </div>
        ) : signals.length === 0 ? (
          <div className="py-6 text-center text-sm text-[#858B80]">No signals found</div>
        ) : (
          signals.map(sig => {
            const sentimentColor = sig.sentiment === 'critical' ? '#E45B4D' : sig.sentiment === 'warning' ? '#C2922E' : '#4A6FA5';
            const sentimentBg = sig.sentiment === 'critical' ? '#FDECEA' : sig.sentiment === 'warning' ? '#FEF3CD' : '#EEF2FA';
            const sentimentIcon = sig.sentiment === 'critical' ? '🚨' : sig.sentiment === 'warning' ? '⚠️' : 'ℹ️';

            return (
              <div key={sig.id} className="px-4 py-3 flex items-start gap-3 hover:bg-[#FAFAF7] transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base mt-0.5"
                  style={{ background: sentimentBg }}>
                  {sentimentIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#172017] leading-snug line-clamp-2">{sig.headline}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: sentimentBg, color: sentimentColor }}>
                      {sig.mentionCount} mentions
                    </span>
                    <span className="text-[10px] text-[#858B80] font-medium">{sig.source}</span>
                    <span className="text-[10px] text-[#A8B89C] font-medium">{timeAgo(sig.publishedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Weather Status Bar ───────────────────────────────────────────────────────

function WeatherBar({ weather, loading }: { weather: WeatherData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#D5D9CC]"
        style={{ background: '#fff' }}>
        <Loader2 size={14} className="animate-spin text-[#858B80]" />
        <span className="text-xs text-[#858B80] font-medium">Fetching live weather…</span>
      </div>
    );
  }
  if (!weather) return null;

  const { precipitation, windSpeed, weatherCode, temperature } = weather;
  const isSevere = weatherCode >= 95 || precipitation > 10 || windSpeed > 60;
  const isModerate = weatherCode >= 51 || precipitation > 3 || windSpeed > 40;
  const badge = isSevere ? { label: 'Severe', bg: '#FDECEA', color: '#D93829', icon: '🌩️' }
    : isModerate ? { label: 'Moderate', bg: '#FEF3CD', color: '#B26A00', icon: '🌧️' }
    : { label: 'Clear', bg: '#EAF4EA', color: '#3E6F4B', icon: '☀️' };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-[#D5D9CC] flex-wrap"
      style={{ background: '#fff' }}>
      <span className="text-base">{badge.icon}</span>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ background: badge.bg, color: badge.color }}>
        {badge.label}
      </span>
      <div className="flex items-center gap-3 text-xs text-[#5F665B] font-semibold">
        <span className="flex items-center gap-1"><CloudRain size={11} />{precipitation}mm/hr</span>
        <span className="flex items-center gap-1"><Wind size={11} />{windSpeed}km/h</span>
        {temperature !== undefined && <span>🌡️ {temperature}°C</span>}
      </div>
      <span className="ml-auto text-[10px] text-[#A8B89C] font-medium">Live · Open-Meteo</span>
    </div>
  );
}

// ─── Main Digital Twin Screen ─────────────────────────────────────────────────

interface DigitalTwinScreenProps {
  trip: TripData | null;
  allTrips: TripData[];
  onSelectTrip?: (id: string) => void;
}

export function DigitalTwinScreen({ trip, allTrips, onSelectTrip }: DigitalTwinScreenProps) {
  const [activeTab, setActiveTab] = useState<TabId>('graph');
  const [stormValue, setStormValue] = useState(0);
  const [activeParam, setActiveParam] = useState<ActiveParam>('rainfall');
  const [simNodes, setSimNodes] = useState<SimNodeResult[]>([]);
  const [simEdges, setSimEdges] = useState<SimEdgeResult[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logCounter, setLogCounter] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [socialSignals, setSocialSignals] = useState<SocialSignal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const logTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Build initial node/edge state from trip ──────────────────────────────
  const buildBaseState = useCallback(() => {
    if (!trip?.nodes?.length) {
      setSimNodes([]);
      setSimEdges([]);
      return;
    }

    const nodes: SimNodeResult[] = trip.nodes.map((n: any) => {
      // Normalise: prefer the string id field, fall back to _id
      const id = (n.id && n.id !== '[object Object]') ? n.id : (n._id?.toString?.() ?? String(n._id ?? Math.random()));
      return {
        id,
        label: n.label ?? n.type ?? 'Node',
        type: n.type ?? 'phantom',
        status: (n.status === 'broken' || n.status === 'disrupted') ? 'at_risk' : 'ok',
        addedDelayMin: 0,
        strain: 0,
        confidencePct: 95,
        lat: n.lat,
        lng: n.lng,
      };
    });

    const nodeIdSet = new Set(nodes.map(n => n.id));

    // Build edges from trip.edges — normalise IDs to match what we just built
    let edges: SimEdgeResult[] = (trip.edges ?? [])
      .map((e: any) => ({
        from: e.fromNodeId ?? e.from ?? '',
        to: e.toNodeId ?? e.to ?? '',
        state: 'ok' as const,
        strain: 0,
        bufferMin: e.bufferMin ?? 60,
      }))
      .filter((e: SimEdgeResult) => nodeIdSet.has(e.from) && nodeIdSet.has(e.to));

    // Fallback: if no valid edges exist, infer sequential connections from node order
    if (edges.length === 0 && nodes.length > 1) {
      edges = nodes.slice(0, -1).map((n, i) => ({
        from: n.id,
        to: nodes[i + 1].id,
        state: 'ok' as const,
        strain: 0,
        bufferMin: 60,
      }));
    }

    setSimNodes(nodes);
    setSimEdges(edges);
    setLogEntries([]);
  }, [trip]);


  useEffect(() => { buildBaseState(); }, [buildBaseState]);

  // ── Fetch live weather on mount ───────────────────────────────────────────
  useEffect(() => {
    const firstNodeWithCoords = trip?.nodes?.find((n: any) => n.lat && n.lng);
    const lat = (firstNodeWithCoords as any)?.lat ?? 19.0760;
    const lng = (firstNodeWithCoords as any)?.lng ?? 72.8777;

    setWeatherLoading(true);
    fetch(`/api/social-signals?city=${encodeURIComponent(trip?.name?.split(' ')[0] ?? 'Mumbai')}&topic=weather`)
      .then(r => r.json())
      .then(d => setSocialSignals(d.signals ?? []))
      .catch(() => {})
      .finally(() => {});

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,wind_speed_10m,weathercode,temperature_2m&precipitation_unit=mm&forecast_days=1`)
      .then(r => r.json())
      .then(d => {
        if (d?.current) {
          setWeather({
            precipitation: d.current.precipitation ?? 0,
            windSpeed: d.current.wind_speed_10m ?? 0,
            weatherCode: d.current.weathercode ?? 0,
            temperature: d.current.temperature_2m,
          });
        }
      })
      .catch(() => {})
      .finally(() => setWeatherLoading(false));
  }, [trip]);

  // ── Refresh social signals ────────────────────────────────────────────────
  const fetchSocialSignals = useCallback(() => {
    setLoadingSignals(true);
    const city = trip?.name?.split(' ')[0] ?? 'Mumbai';
    fetch(`/api/social-signals?city=${encodeURIComponent(city)}&topic=flooding+delay`)
      .then(r => r.json())
      .then(d => setSocialSignals(d.signals ?? []))
      .catch(() => {})
      .finally(() => setLoadingSignals(false));
  }, [trip]);

  useEffect(() => { fetchSocialSignals(); }, [fetchSocialSignals]);

  // ── Run simulation ────────────────────────────────────────────────────────
  const runSimulation = useCallback(() => {
    if (!trip?.nodes?.length) return;

    setIsSimulating(true);
    // Clear previous log timers
    logTimersRef.current.forEach(clearTimeout);
    logTimersRef.current = [];

    const rainfall = intensityToRainfall(stormValue);
    const duration = intensityToDuration(stormValue);

    const nodes = trip.nodes.map((n: any) => ({
      ...n,
      id: (n.id && n.id !== '[object Object]') ? n.id : (n._id?.toString?.() ?? String(n._id ?? '')),
    }));

    const nodeIdSet = new Set(nodes.map((n: any) => n.id as string));

    let edges = (trip.edges ?? [])
      .map((e: any) => ({
        ...e,
        from: e.fromNodeId ?? e.from ?? '',
        to: e.toNodeId ?? e.to ?? '',
        bufferMin: e.bufferMin ?? 60,
        paddingMin: e.paddingMin ?? 0,
        constraint: e.constraint ?? 'soft',
      }))
      .filter((e: any) => nodeIdSet.has(e.from) && nodeIdSet.has(e.to));

    // Fallback: infer sequential edges from node order when none exist in DB
    if (edges.length === 0 && nodes.length > 1) {
      edges = nodes.slice(0, -1).map((n: any, i: number) => ({
        from: n.id, to: nodes[i + 1].id,
        bufferMin: 60, paddingMin: 0, constraint: 'soft',
      }));
    }

    // Build graph
    const graph = new TripGraph();
    nodes.forEach((n: any) => graph.addNode(n.id));
    edges.forEach((e: any) => graph.addEdge({
      from: e.from,
      to: e.to,
      bufferMin: e.bufferMin,
      paddingMin: e.paddingMin,
      constraint: e.constraint,
    }));


    // Compute per-node weather impact and find the worst-hit node as entry point
    const nodeImpacts = nodes.map((n: any) => {
      const mode = n.type ?? 'cab';
      const constraint = n.constraintType ?? 'soft';
      const rainfallImpact = estimateWeatherImpact(mode, 'rainfall', rainfall, constraint);
      const durationImpact = estimateWeatherImpact(mode, 'storm_duration', duration, constraint);
      const addedDelay = Math.max(rainfallImpact.addedDelayMin, durationImpact.addedDelayMin);
      return { node: n, addedDelay, impact: rainfallImpact };
    });

    const worstNode = nodeImpacts.reduce((a, b) => b.addedDelay > a.addedDelay ? b : a, nodeImpacts[0]);

    let cascadeResult: { broken: string[]; atRisk: string[]; delay: Map<string, number> } = {
      broken: [], atRisk: [], delay: new Map<string, number>()
    };

    if (worstNode && worstNode.addedDelay > 0) {
      cascadeResult = graph.propagateDelay(worstNode.node.id, worstNode.addedDelay);
    }

    const { broken, atRisk, delay } = cascadeResult;
    const brokenSet = new Set(broken);
    const atRiskSet = new Set(atRisk);

    // Build updated nodes
    const updatedNodes: SimNodeResult[] = nodeImpacts.map(({ node, addedDelay, impact }) => {
      const isBroken = brokenSet.has(node.id);
      const isAtRisk = atRiskSet.has(node.id);
      const cascadeDelay = delay.get(node.id) ?? addedDelay;
      const strain = addedDelay > 0 ? Math.min(1, addedDelay / 120) : 0;

      return {
        id: node.id,
        label: node.label ?? node.type ?? 'Node',
        type: node.type ?? 'phantom',
        status: isBroken ? 'broken' : isAtRisk ? 'at_risk' : addedDelay > 0 ? 'at_risk' : 'ok',
        addedDelayMin: Math.round(cascadeDelay),
        strain,
        confidencePct: impact.confidencePct,
        lat: node.lat,
        lng: node.lng,
      };
    });

    // Build updated edges
    const updatedEdges: SimEdgeResult[] = edges.map((e: any) => {
      const fromNode = nodeImpacts.find(ni => ni.node.id === e.from);
      const fromDelay = fromNode?.addedDelay ?? 0;
      const slack = e.bufferMin - fromDelay;
      const strain = Math.min(1, Math.max(0, 1 - slack / Math.max(e.bufferMin, 1)));
      const state = slack <= 0 && e.constraint === 'hard' ? 'broken'
        : strain > 0.6 ? 'at_risk' : 'ok';
      return { from: e.from, to: e.to, state: state as any, strain, bufferMin: e.bufferMin };
    });

    setSimNodes(updatedNodes);
    setSimEdges(updatedEdges);

    // Build cascade log with staggered reveal
    const newLogs: Omit<LogEntry, 'id'>[] = [];
    newLogs.push({ msg: `Storm at ${stormValue}% intensity — ${rainfall}mm/hr rainfall`, icon: '🌧️', level: 'info' });

    if (worstNode && worstNode.addedDelay > 0) {
      newLogs.push({
        msg: `${worstNode.node.label ?? worstNode.node.type} hit first — +${worstNode.addedDelay}m added`,
        icon: '⏱️', level: 'warn'
      });
    }

    broken.forEach(id => {
      const n = nodes.find((nn: any) => nn.id === id);
      if (n) newLogs.push({ msg: `${n.label ?? id} — HARD BREAK (buffer exceeded)`, icon: '💥', level: 'critical' });
    });

    atRisk.forEach(id => {
      const n = nodes.find((nn: any) => nn.id === id);
      if (n) newLogs.push({ msg: `${n.label ?? id} — at risk, buffer absorbing delay`, icon: '⚠️', level: 'warn' });
    });

    if (broken.length === 0 && atRisk.length === 0 && worstNode?.addedDelay === 0) {
      newLogs.push({ msg: 'Buffers holding — no cascade triggered at this intensity', icon: '✅', level: 'info' });
    }

    // Stagger log entries
    setLogEntries([]);
    let counter = logCounter;
    newLogs.forEach((entry, i) => {
      const t = setTimeout(() => {
        setLogEntries(prev => [{ ...entry, id: counter + i }, ...prev]);
      }, i * 280);
      logTimersRef.current.push(t);
    });
    setLogCounter(c => c + newLogs.length);
    setIsSimulating(false);
  }, [trip, stormValue, activeParam, logCounter]);

  // ── Auto-simulate on storm value change (debounced) ──────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleStormChange = useCallback((v: number) => {
    setStormValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSimulation(), 300);
  }, [runSimulation]);

  // Run on param change too
  useEffect(() => {
    if (stormValue > 0) runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParam]);

  const PARAMS: { id: ActiveParam; label: string; icon: React.ReactNode }[] = [
    { id: 'rainfall', label: 'Rainfall (mm/hr)', icon: <CloudRain size={13} /> },
    { id: 'storm_duration', label: 'Duration (hrs)', icon: <Clock size={13} /> },
    { id: 'wind_speed', label: 'Wind (km/h)', icon: <Wind size={13} /> },
    { id: 'visibility', label: 'Visibility (km)', icon: <Eye size={13} /> },
  ];

  const brokenCount = simNodes.filter(n => n.status === 'broken').length;
  const atRiskCount = simNodes.filter(n => n.status === 'at_risk').length;
  const label = stormLabel(stormValue);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#172017' }}>
            <Zap size={14} color="#C5D82D" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#172017]">
            Weather Digital Twin
          </h1>
          <span className="ml-2 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: '#E8F0E2', color: '#3E6F4B' }}>
            Task 1
          </span>
        </div>
        <p className="text-sm text-[#5F665B] font-medium">
          Simulate how weather cascades through your trip's dependency graph. Turn the storm gauge — watch the graph react.
        </p>
      </div>

      {/* ── Live weather bar ──────────────────────────────────────────────── */}
      <div className="mb-5">
        <WeatherBar weather={weather} loading={weatherLoading} />
      </div>

      {/* ── Trip selector (if no trip) ────────────────────────────────────── */}
      {!trip && allTrips.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl border border-[#D5D9CC] bg-white">
          <p className="text-sm font-bold text-[#172017] mb-3">Select a trip to simulate:</p>
          <div className="flex flex-wrap gap-2">
            {allTrips.map(t => (
              <button key={t.id}
                onClick={() => onSelectTrip?.(t.id)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#D5D9CC] hover:bg-[#F0F5EC] transition-all"
                style={{ color: '#172017' }}>
                {t.name ?? 'Unnamed Trip'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ── Left: Graph/Map ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 rounded-2xl border border-[#D5D9CC] w-fit"
            style={{ background: '#F0F5EC' }}>
            {([
              { id: 'graph', label: 'Living Graph', icon: <GitBranch size={13} /> },
              { id: 'map', label: 'Map View', icon: <MapIcon size={13} /> },
            ] as { id: TabId; label: string; icon: React.ReactNode }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: activeTab === tab.id ? '#172017' : 'transparent',
                  color: activeTab === tab.id ? '#C5D82D' : '#5F665B',
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* Status counters */}
          {simNodes.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Nodes', val: simNodes.length, color: '#172017', bg: '#F0F5EC' },
                { label: 'At Risk', val: atRiskCount, color: '#B26A00', bg: '#FEF3CD' },
                { label: 'Broken', val: brokenCount, color: '#D93829', bg: '#FDECEA' },
                { label: 'On Track', val: simNodes.length - brokenCount - atRiskCount, color: '#3E6F4B', bg: '#EAF4EA' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-[#D5D9CC]"
                  style={{ background: s.bg, color: s.color }}>
                  <span className="text-lg font-extrabold">{s.val}</span>
                  <span className="font-semibold">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Main view */}
          {activeTab === 'graph' ? (
            <LivingGraph nodes={simNodes} edges={simEdges} logEntries={logEntries} stormValue={stormValue} />
          ) : (
            <MapView
              nodes={simNodes}
              stormValue={stormValue}
              socialSignals={socialSignals}
              onRefreshSignals={fetchSocialSignals}
              loadingSignals={loadingSignals}
            />
          )}
        </div>

        {/* ── Right: Controls ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Storm Gauge card */}
          <div className="rounded-2xl border border-[#D5D9CC] bg-white overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-[#E8EDE4]">
              <div className="flex items-center gap-2 mb-0.5">
                <CloudRain size={14} className="text-[#4A6FA5]" />
                <span className="text-sm font-extrabold text-[#172017]">Storm Gauge</span>
              </div>
              <p className="text-xs text-[#858B80] font-medium">
                Drag the dial to simulate storm intensity
              </p>
            </div>
            <div className="flex flex-col items-center py-5 px-4">
              <StormGauge
                value={stormValue}
                onChange={handleStormChange}
                label={label}
              />
            </div>

            {/* Simulate button */}
            <div className="px-4 pb-4">
              <button
                onClick={runSimulation}
                disabled={isSimulating || !trip}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: '#172017', color: '#C5D82D' }}
              >
                {isSimulating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Simulate Cascade
              </button>
              {!trip && (
                <p className="text-xs text-center text-[#858B80] mt-2 font-medium">Select a trip above first</p>
              )}
            </div>
          </div>

          {/* Parameter selector */}
          <div className="rounded-2xl border border-[#D5D9CC] bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E8EDE4]">
              <span className="text-sm font-extrabold text-[#172017]">Weather Parameter</span>
            </div>
            <div className="p-3 flex flex-col gap-1.5">
              {PARAMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActiveParam(p.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left"
                  style={{
                    background: activeParam === p.id ? '#172017' : '#F8FAF6',
                    color: activeParam === p.id ? '#C5D82D' : '#5F665B',
                    border: activeParam === p.id ? '1.5px solid #172017' : '1.5px solid #E8EDE4',
                  }}
                >
                  {p.icon}
                  {p.label}
                  {activeParam === p.id && <ChevronRight size={12} className="ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Impact summary card */}
          {stormValue > 0 && (
            <div className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: brokenCount > 0 ? '#E45B4D' : atRiskCount > 0 ? '#E5A43F' : '#62A86B',
                background: brokenCount > 0 ? '#FFF8F7' : atRiskCount > 0 ? '#FFFBF0' : '#F6FBF4'
              }}>
              <div className="px-4 py-3 border-b"
                style={{ borderColor: brokenCount > 0 ? '#FDECEA' : atRiskCount > 0 ? '#FEF3CD' : '#E8F4E8' }}>
                <div className="flex items-center gap-1.5">
                  {brokenCount > 0 ? <XCircle size={14} color="#D93829" />
                    : atRiskCount > 0 ? <AlertTriangle size={14} color="#C2922E" />
                    : <CheckCircle2 size={14} color="#3E6F4B" />}
                  <span className="text-xs font-extrabold"
                    style={{ color: brokenCount > 0 ? '#D93829' : atRiskCount > 0 ? '#B26A00' : '#3E6F4B' }}>
                    {brokenCount > 0 ? `${brokenCount} Hard Break${brokenCount > 1 ? 's' : ''}`
                      : atRiskCount > 0 ? `${atRiskCount} At Risk`
                      : 'All Buffers Holding'}
                  </span>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {simNodes.filter(n => n.status !== 'ok').map(n => (
                  <div key={n.id} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172017] flex items-center gap-1.5">
                      <span>{NODE_EMOJI[n.type] ?? '📌'}</span>
                      {n.label}
                    </span>
                    <span className="font-bold px-2 py-0.5 rounded-full text-[10px]"
                      style={{
                        background: n.status === 'broken' ? '#FDECEA' : '#FEF3CD',
                        color: n.status === 'broken' ? '#D93829' : '#B26A00'
                      }}>
                      +{n.addedDelayMin}m
                    </span>
                  </div>
                ))}
                {simNodes.every(n => n.status === 'ok') && (
                  <p className="text-xs text-[#5F665B] font-medium">
                    Buffers are absorbing the current storm load. Increase intensity to trigger cascades.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="rounded-2xl border border-[#D5D9CC] p-4" style={{ background: '#F8FAF6' }}>
            <div className="flex items-start gap-2">
              <Info size={13} className="text-[#4A6FA5] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#5F665B] font-medium leading-relaxed">
                The simulation feeds weather delay into the same <code className="bg-[#E8EDE4] px-1 rounded text-[#172017] font-mono">propagateDelay()</code> engine that powers real disruption recovery — so every cascade you see here is what your trip would actually experience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes nodePulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.1); }
        }
        @keyframes nodeShake {
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
        @keyframes edgeSnap {
          0%   { stroke-dashoffset: 0; opacity: 1; }
          60%  { stroke-dashoffset: 24; opacity: 0.5; }
          100% { stroke-dashoffset: 48; opacity: 0.3; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out both; }
      `}</style>
    </div>
  );
}
