"use client";

import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from'react-leaflet';

import MarkerClusterGroup from'react-leaflet-cluster';
import L from'leaflet';
import { useEffect, memo, useMemo, useState, useRef } from'react';

// ─── Server-computed color logic (mirrored here for icon creation only) ────────
const getMarkerColor = (condition: string, status: string): string => {
 const s = (condition || status ||'').toLowerCase();
 if (s ==='good'|| s ==='online') return'#10b981'; // green
 if (s ==='maintenance'|| s ==='maint.') return'#f59e0b'; // amber
 if (s ==='warning') return'#ef4444'; // red
 if (s ==='offline') return'#64748b'; // slate
 if (s ==='broken') return'#dc2626'; // red-600
 return'#64748b';
};

// ─── Memoized icon factory (keyed by color to avoid redundant DOM creation) ───
const iconCache = new Map<string, L.DivIcon>();
const createStatusIcon = (condition: string, status: string): L.DivIcon => {
 const color = getMarkerColor(condition, status);
 if (iconCache.has(color)) return iconCache.get(color)!;

 const icon = L.divIcon({
 html:`
 <div style="position:relative;display:flex;align-items:center;justify-content:center;">
 <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:${color};opacity:0.15;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div>
 <div style="position:relative;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${color}80;"></div>
 </div>
`,
 className:'custom-status-icon',
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
 html:`
 <div style="
 width:${size}px;height:${size}px;border-radius:50%;
 background:var(--background);
 color:var(--foreground);font-weight:900;font-size:${size < 40 ?'11':'13'}px;
 display:flex;align-items:center;justify-content:center;
 box-shadow:0 4px 12px color-mix(in srgb, var(--primary), transparent 60%);
 border:2px solid var(--primary);
 ">${count}</div>
`,
 className:'custom-cluster-icon',
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
 setZoom?: (zoom: number | ((prev: number) => number)) => void;
 setCenter?: (center: [number, number] | null | ((prev: [number, number] | null) => [number, number] | null)) => void;
 theme?: string;
}

// ─── MapStateListener helper ───────────────────────────────────────────────────
function MapStateListener({
 setZoom,
 setCenter,
}: {
 setZoom?: (zoom: number | ((prev: number) => number)) => void;
 setCenter?: (center: [number, number] | null) => void;
}) {
 const map = useMapEvents({
 zoomend: () => {
 if (setZoom) {
 setZoom(map.getZoom());
 }
 },
 dragend: () => {
 if (setCenter) {
 const center = map.getCenter();
 setCenter([center.lat, center.lng]);
 }
 },
 });
 return null;
}

// ─── ChangeView helper ──────────────────────────────────────────────────────────
function ChangeView({ center, zoom }: { center: [number, number] | null | undefined; zoom: number }) {
 const map = useMap();
 const prevCenterRef = useRef<string | null>(null);
 const prevZoomRef = useRef<number>(zoom);

 useEffect(() => {
 if (!map) return;
 try {
 const centerStr = center ?`${center[0]},${center[1]}`: null;
 const centerChanged = centerStr !== prevCenterRef.current;
 const zoomChanged = zoom !== prevZoomRef.current;

 prevCenterRef.current = centerStr;
 prevZoomRef.current = zoom;

 if (center) {
 if (centerChanged && zoomChanged) {
 // Both changed (e.g. Reset button clicked!)
 const id = setTimeout(() => {
 if (map.getContainer()) {
 map.setView(center, zoom, { animate: true });
 }
 }, 0);
 return () => clearTimeout(id);
 } else if (centerChanged) {
 // Only center changed (e.g. clicked a node!)
 // Keep current map zoom level perfectly so we don't zoom in to black background tiles
 const id = setTimeout(() => {
 if (map.getContainer()) {
 map.setView(center, map.getZoom(), { animate: true });
 }
 }, 0);
 return () => clearTimeout(id);
 } else if (zoomChanged) {
 // Only zoom changed (e.g. clicked Zoom In / Zoom Out!)
 const id = setTimeout(() => {
 if (map.getContainer()) {
 map.setZoom(zoom, { animate: true });
 }
 }, 0);
 return () => clearTimeout(id);
 }
 } else {
 map.closePopup();
 }
 } catch (e) {
 console.warn("Leaflet view update failed:", e);
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
 <Tooltip direction="top"offset={[0, -10]} opacity={1}>
 <div className="bg-card/95 /95 border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 min-w-[200px] text-white">
 <div className="flex justify-between items-center">
 <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
 {asset.type}
 </span>
 <div className="flex items-center gap-1.5">
 <div 
 className="w-1.5 h-1.5 rounded-full animate-pulse"
 style={{ backgroundColor: getMarkerColor(asset.condition, asset.status) }} 
 />
 <span className="text-[9px] font-bold text-muted-foreground">
 {asset.status}
 </span>
 </div>
 </div>
 <div>
 <h4 className="text-xs font-black tracking-tight text-white mb-0.5">{asset.sn}</h4>
 <p className="text-[9px] font-medium text-muted-foreground truncate max-w-[180px]">{asset.location}</p>
 </div>
 </div>
 </Tooltip>
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
 setZoom,
 setCenter,
 theme ='dark',
}: IndonesiaMapProps) {
 const [isReady, setIsReady] = useState(false);

 useEffect(() => {
 const t = setTimeout(() => setIsReady(true), 100);
 return () => clearTimeout(t);
 }, []);

 const defaultCenter: [number, number] = [-2.5489, 118.0149]; // Center of Indonesia

 const focusCenter = useMemo(() => {
 if (!selectedNode) return propsCenter;
 const lat = parseFloat(String(selectedNode.latitude));
 const lng = parseFloat(String(selectedNode.longitude));
 return (isNaN(lat) || isNaN(lng)) ? propsCenter : [lat, lng] as [number, number];
 }, [selectedNode, propsCenter]);

 const focusZoom = zoom;

 if (!isReady) return <div className="w-full h-full bg-card animate-pulse rounded-[2rem]"/>;

 return (
 <div className="w-full h-full relative">
 <MapContainer
 key="fintrack-geographic-map-engine"
 center={defaultCenter}
 zoom={zoom}
 style={{ height:'100%', width:'100%', background:'#0f172a'}}
 zoomControl={false}
 scrollWheelZoom={true}
 preferCanvas={true}
 >
 <TileLayer
 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
 url={
 theme ==='light'
 ?'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
 : theme ==='voyager'
 ?'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
 :'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
 }
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

 {setZoom || setCenter ? (
 <MapStateListener setZoom={setZoom} setCenter={setCenter} />
 ) : null}

 <ChangeView center={focusCenter} zoom={focusZoom} />
 </MapContainer>
 </div>
 );
}
