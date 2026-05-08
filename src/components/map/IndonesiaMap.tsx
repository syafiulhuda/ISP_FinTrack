"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useEffect, memo, useMemo } from 'react';

// ─── Server-computed color logic (mirrored here for icon creation only) ────────
const getMarkerColor = (condition: string, status: string): string => {
  const s = (condition || status || '').toLowerCase();
  if (s === 'good' || s === 'online') return '#10b981';    // green
  if (s === 'maintenance' || s === 'maint.') return '#f59e0b'; // amber
  if (s === 'warning') return '#ef4444';                   // red
  if (s === 'offline') return '#64748b';                   // slate
  if (s === 'broken') return '#dc2626';                    // red-600
  return '#64748b';
};

// ─── Memoized icon factory (keyed by color to avoid redundant DOM creation) ───
const iconCache = new Map<string, L.DivIcon>();
const createStatusIcon = (condition: string, status: string): L.DivIcon => {
  const color = getMarkerColor(condition, status);
  if (iconCache.has(color)) return iconCache.get(color)!;

  const icon = L.divIcon({
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:${color};opacity:0.15;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div>
        <div style="position:relative;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${color}80;"></div>
      </div>
    `,
    className: 'custom-status-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  iconCache.set(color, icon);
  return icon;
};

// ─── Custom cluster icon ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClusterCustomIcon = (cluster: any): L.DivIcon => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 32 : count < 100 ? 40 : 48;
  return L.divIcon({
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:linear-gradient(135deg,#3b82f6,#6366f1);
        color:white;font-weight:900;font-size:${size < 40 ? '11' : '13'}px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 12px rgba(99,102,241,0.4);
        border:2px solid rgba(255,255,255,0.3);
      ">${count}</div>
    `,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};


// ─── Props ──────────────────────────────────────────────────────────────────────
interface AssetMapItem {
  id: number;
  sn: string;
  type: string;
  status: string;
  condition: string;
  location: string;
  latitude: string | number;
  longitude: string | number;
  mac?: string;
  kepemilikan?: string;
  tanggal_perubahan?: string;
}

interface IndonesiaMapProps {
  assets: AssetMapItem[];
  onSelectNode: (node: AssetMapItem) => void;
  selectedNode: AssetMapItem | null;
  zoom?: number;
  center?: [number, number] | null;
}

// ─── ChangeView helper ──────────────────────────────────────────────────────────
function ChangeView({ center, zoom }: { center: [number, number] | null | undefined; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (center) {
      const id = setTimeout(() => map.setView(center, zoom, { animate: true }), 0);
      return () => clearTimeout(id);
    } else {
      map.setZoom(zoom, { animate: true });
    }
  }, [center, zoom, map]);

  return null;
}

// ─── Memoized single Marker ─────────────────────────────────────────────────────
const MemoizedMarker = memo(function AssetMarker({
  asset,
  onSelect,
}: {
  asset: AssetMapItem;
  onSelect: (node: AssetMapItem) => void;
}) {
  const lat = parseFloat(String(asset.latitude));
  const lng = parseFloat(String(asset.longitude));

  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <Marker
      position={[lat, lng]}
      icon={createStatusIcon(asset.condition, asset.status)}
      eventHandlers={{ click: () => onSelect(asset) }}
    >
      <Popup>
        <div className="p-1">
          <p className="font-bold text-xs">{asset.sn}</p>
          <p className="text-[10px] text-slate-500">{asset.type} — {asset.condition || asset.status}</p>
        </div>
      </Popup>
    </Marker>
  );
});

// ─── Main Map Component ─────────────────────────────────────────────────────────
export default function IndonesiaMap({
  assets,
  onSelectNode,
  selectedNode,
  zoom = 5,
  center: propsCenter,
}: IndonesiaMapProps) {
  const defaultCenter: [number, number] = [-2.5489, 118.0149]; // Center of Indonesia

  const focusCenter = useMemo(() => {
    if (!selectedNode) return propsCenter;
    const lat = parseFloat(String(selectedNode.latitude));
    const lng = parseFloat(String(selectedNode.longitude));
    return (isNaN(lat) || isNaN(lng)) ? propsCenter : [lat, lng] as [number, number];
  }, [selectedNode, propsCenter]);

  const focusZoom = selectedNode ? 12 : zoom;

  return (
    <div className="w-full h-full relative" id="map-parent">
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        zoomControl={false}
        scrollWheelZoom={true}
        preferCanvas={true}   // ← Task 1: Render via HTML5 Canvas, not SVG
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Task 2: Marker Clustering */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {/* Task 4: React.memo — markers that don't change won't re-render */}
          {assets.map((asset) => (
            <MemoizedMarker
              key={`asset-${asset.id}`}
              asset={asset}
              onSelect={onSelectNode}
            />
          ))}
        </MarkerClusterGroup>

        <ChangeView center={focusCenter} zoom={focusZoom} />
      </MapContainer>
    </div>
  );
}
