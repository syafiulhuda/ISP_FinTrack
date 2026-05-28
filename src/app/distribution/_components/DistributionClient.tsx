"use client";

import { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from"react";
import Image from"next/image";
import { m, AnimatePresence } from"framer-motion";
import { useQuery, useMutation, useQueryClient } from"@tanstack/react-query";
import { toast } from"sonner";


import {
 Map as LucideMap,
 Activity,
 AlertTriangle,
 Search as SearchIcon,
 Settings as SettingsIcon,
 X as XIcon,
 Filter,
 Info as InfoIcon,
 Wifi,
 Database,
 Cpu,
 ChevronRight,
 Clock,
 ZoomIn,
 ZoomOut,
 Maximize,
 Minimize,
 Navigation,
 Check,
 Server as ServerIcon
} from"lucide-react";
import dynamic from'next/dynamic';
import {
 getMapAssets,
 addMapNode,
 dispatchTechnician,
 getMaintenanceHistory
} from"@/actions/map";
import { cn } from"@/lib/utils";
import { LoadingState } from"@/components/LoadingState";

const IndonesiaMap = dynamic(() => import('@/components/map/IndonesiaMap'), {
 ssr: false,
 loading: () => <div className="w-full h-full bg-card animate-pulse flex items-center justify-center text-muted-foreground font-black">INITIALIZING GEOGRAPHIC ENGINE...</div>
});

function LegendContent({ nodeStats }: { nodeStats: any }) {
 return (
 <>
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Map Architecture</h2>
 <p className="text-lg font-black tracking-tighter">Network Nodes</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
 <Database size={20} />
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between group">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
 <Database size={16} />
 </div>
 <span className="text-[12px] font-bold">OLT Terminal</span>
 </div>
 <span className="text-[10px] font-bold text-muted-foreground">{String(nodeStats.olt).padStart(2,'0')} units</span>
 </div>
 <div className="flex items-center justify-between group">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:indigo-400">
 <Cpu size={16} />
 </div>
 <span className="text-[12px] font-bold">ODP Node</span>
 </div>
 <span className="text-[10px] font-bold text-muted-foreground">{String(nodeStats.odp).padStart(2,'0')} units</span>
 </div>
 <div className="flex items-center justify-between group">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground">
 <Wifi size={16} />
 </div>
 <span className="text-[12px] font-bold">ONT Terminal</span>
 </div>
 <span className="text-[10px] font-bold text-muted-foreground">{String(nodeStats.ont).padStart(2,'0')} units</span>
 </div>
 <div className="flex items-center justify-between group">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
 <ServerIcon size={16} />
 </div>
 <span className="text-[12px] font-bold">Core Server</span>
 </div>
 <span className="text-[10px] font-bold text-muted-foreground">{String(nodeStats.server).padStart(2,'0')} units</span>
 </div>

 <hr className="border-border my-4"/>

 <div className="grid grid-cols-2 gap-2">
 <div className="flex flex-col items-center gap-1">
 <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"/>
 <span className="text-[9px] font-bold text-muted-foreground uppercase">Good</span>
 </div>
 <div className="flex flex-col items-center gap-1">
 <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"/>
 <span className="text-[9px] font-bold text-muted-foreground uppercase">Maint.</span>
 </div>
 </div>
 </div>
 </>
 );
}

export function DistributionClient() {
 const [selectedNode, setSelectedNode] = useState<any>(null);
 const [searchQuery, setSearchQuery] = useState("");
 const deferredSearchQuery = useDeferredValue(searchQuery);
 const [mounted, setMounted] = useState(false);
 const [isMobile, setIsMobile] = useState(false);
 const [zoom, setZoom] = useState(5);
 const [center, setCenter] = useState<[number, number] | null>([-2.5489, 118.0149]);

 const nodeStatus = useMemo(() => {
 if (!selectedNode) return'Online';
 const cond = (selectedNode.condition ||'').toLowerCase();
 const stat = (selectedNode.status ||'').toLowerCase();
 if (cond ==='broken'|| stat ==='offline'|| stat ==='broken') return'Broken';
 if (cond ==='maintenance'|| stat ==='maintenance') return'Maintenance';
 if (stat ==='warning') return'Warning';
 return'Online';
 }, [selectedNode]);

 const healthInfo = useMemo(() => {
 if (nodeStatus ==='Broken') {
 return { label:'0.0%', value: 0, textColor:'text-red-500', barColor:'bg-red-500'};
 }
 if (nodeStatus ==='Maintenance') {
 return { label:'64.1%', value: 64, textColor:'text-amber-500', barColor:'bg-amber-500'};
 }
 if (nodeStatus ==='Warning') {
 return { label:'45.8%', value: 45, textColor:'text-rose-500', barColor:'bg-rose-500'};
 }
 return { label:'98.4%', value: 98, textColor:'text-green-500', barColor:'bg-green-500'};
 }, [nodeStatus]);

 const handleSelectNode = useCallback((node: any) => {
 setSelectedNode(node);
 if (node) {
 const lat = parseFloat(String(node.latitude));
 const lng = parseFloat(String(node.longitude));
 if (!isNaN(lat) && !isNaN(lng)) {
 setCenter([lat, lng]);
 }
 }
 }, []);

 useEffect(() => {
 const handleResize = () => {
 setIsMobile(window.innerWidth < 1024);
 };
 handleResize();
 window.addEventListener("resize", handleResize);
 return () => window.removeEventListener("resize", handleResize);
 }, []);
 const [isLayersOpen, setIsLayersOpen] = useState(false);
 const [activeLayers, setActiveLayers] = useState({
 OLT: true,
 ODP: true,
 ONT: true,
 Server: true,
 Good: true,
 Maintenance: true,
 });
 const deferredActiveLayers = useDeferredValue(activeLayers);


 const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
 const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
 const [isLegendOpen, setIsLegendOpen] = useState(false);
 const [mapTheme, setMapTheme] = useState("dark");
 const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
 const [isProfileOpen, setIsProfileOpen] = useState(false);
 const [isFullscreen, setIsFullscreen] = useState(false);
 const mapContainerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const handleFullscreenChange = () => {
 setIsFullscreen(!!document.fullscreenElement);
 };
 document.addEventListener("fullscreenchange", handleFullscreenChange);
 return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
 }, []);

 const toggleFullscreen = () => {
 const element = mapContainerRef.current;
 if (!element) return;

 if (!document.fullscreenElement) {
 element.requestFullscreen()
 .then(() => {
 toast.success("Entered Full Screen mode! 🖥️");
 })
 .catch((err) => {
 console.warn("Fullscreen error:", err);
 toast.error("Browser block fullscreen request.");
 });
 } else {
 document.exitFullscreen();
 }
 };

 const queryClient = useQueryClient();

 useEffect(() => {
 setMounted(true);
 }, []);

 const handleReset = () => {
 setZoom(5);
 setCenter([-2.5489, 118.0149]);
 setSelectedNode(null);
 };

 const { data: assets = [], isLoading } = useQuery({
 queryKey: ['map-assets'],
 queryFn: () => getMapAssets(),
 refetchInterval: 30000,
 staleTime: 30000,
 refetchOnWindowFocus: false,
 });

 const filteredAssets = useMemo(() => {
 const typeFilters = ['OLT','ODP','ONT','Server'];
 const statusFilters = ['Good','Maintenance'] as const;

 const activeTypeFilters = typeFilters.filter(t => deferredActiveLayers[t as keyof typeof deferredActiveLayers]);
 const activeStatusFilters = statusFilters.filter(s => deferredActiveLayers[s as keyof typeof deferredActiveLayers]);


 return assets.filter(a => {
 const matchesSearch = (a.sn ||'').toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
 (a.location ||'').toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
 String(a.id ||'').toLowerCase().includes(deferredSearchQuery.toLowerCase());

 const matchesType = activeTypeFilters.length === 0 || activeTypeFilters.includes(a.type);

 // Properly classify asset status ΓÇö Broken is NOT a fallback for Good
 const rawCondition = (a.condition || a.status ||'').toLowerCase();
 let assetStatus:'Good'|'Maintenance'|'Broken';
 if (rawCondition ==='good'|| rawCondition ==='online') {
 assetStatus ='Good';
 } else if (rawCondition ==='maintenance'|| rawCondition ==='maint.') {
 assetStatus ='Maintenance';
 } else {
 assetStatus ='Broken'; // offline, broken, warning, unknown ΓåÆ Broken
 }

 const matchesStatus = assetStatus !=='Broken'&& activeStatusFilters.includes(assetStatus);

 return matchesSearch && matchesType && matchesStatus;
 });


 }, [assets, deferredSearchQuery, deferredActiveLayers]);

 const nodeStats = useMemo(() => {
 return {
 olt: filteredAssets.filter(a => a.type ==='OLT').length,
 odp: filteredAssets.filter(a => a.type ==='ODP').length,
 ont: filteredAssets.filter(a => a.type ==='ONT').length,
 server: filteredAssets.filter(a => a.type ==='Server').length
 };
 }, [filteredAssets]);

 const mapComponent = useMemo(() => (
 <IndonesiaMap
 assets={filteredAssets}
 onSelectNode={handleSelectNode}
 selectedNode={selectedNode}
 zoom={zoom}
 center={center}
 setZoom={setZoom}
 setCenter={setCenter}
 theme={mapTheme}
 />
 ), [filteredAssets, handleSelectNode, selectedNode, zoom, center, mapTheme]);

 if (!mounted) return null;

 return (
 <div ref={mapContainerRef} className="flex-1 flex flex-col min-h-screen relative overflow-hidden bg-background pt-4 md:pt-6">
 {/* Header Overlay */}
 <header className="absolute top-4 md:top-6 left-0 w-full z-40 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md flex justify-between items-center h-16 px-2 sm-phone:px-4 md:px-8 border-b border-border/50">
 <div className="flex items-center gap-4">
 <div className="relative flex items-center">
 <SearchIcon className="absolute left-3 text-muted-foreground"size={18} />
 <input
 className="bg-white/80 dark:bg-slate-900/80 border border-border rounded-full pl-10 pr-4 py-1.5 text-sm w-full max-w-[180px] sm-phone:max-w-[220px] md:max-w-80 focus:ring-2 focus:ring-blue-500/20 placeholder:text-muted-foreground shadow-sm"
 placeholder="Search Node ID or Location"
 type="text"
 aria-label="Search nodes by ID or location"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 </div>
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-4 text-muted-foreground relative">
 {/* Map Reset Zoom Button */}
 <button
 onClick={() => {
 handleReset();
 toast.success("Map viewport reset to Center! 🗺️");
 }}
 className="hover:bg-muted/50 dark:hover:bg-muted/50 p-2 rounded-full transition-colors"
 aria-label="Reset map view"
 >
 <LucideMap size={18} />
 </button>

 {/* Map Settings Button */}
 <div className="relative">
 <button
 onClick={() => {
 setIsMapSettingsOpen(!isMapSettingsOpen);
 setIsProfileOpen(false);
 }}
 className={cn(
"hover:bg-muted/50 dark:hover:bg-muted/50 p-2 rounded-full transition-colors",
 isMapSettingsOpen &&"bg-muted"
 )}
 aria-label="Map settings"
 >
 <SettingsIcon size={18} />
 </button>
 <AnimatePresence>
 {isMapSettingsOpen && (
 <m.div
 initial={{ opacity: 0, scale: 0.95, y: -10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: -10 }}
 className="absolute right-0 top-full mt-3 w-52 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-border p-6 z-50 text-left"
 >
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Map Theme</p>
 <div className="space-y-2">
 {['dark','light','voyager'].map((theme) => (
 <button
 key={theme}
 onClick={() => {
 setMapTheme(theme);
 setIsMapSettingsOpen(false);
 toast.success(`Map style changed to ${theme.toUpperCase()}!`);
 }}
 className={cn(
"w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
 mapTheme === theme
 ?"bg-blue-600 text-white shadow-lg shadow-blue-500/20"
 :"hover:bg-muted dark:hover:bg-muted text-muted-foreground"
 )}
 >
 {theme ==='voyager'? (
 <span className="flex flex-col gap-0.5">
 <span className="flex items-center gap-1.5">🗺️ VOYAGER</span>
 <span className="text-[9px] opacity-80 tracking-widest pl-5 leading-none">STANDARD</span>
 </span>
 ) : theme ==='dark'? (
'🌌 Dark Mode'
 ) : (
'☀️ Light Mode'
 )}
 </button>
 ))}
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* User Profile Avatar AD */}
 <div className="relative hidden sm:block">
 <button
 onClick={() => {
 setIsProfileOpen(!isProfileOpen);
 setIsMapSettingsOpen(false);
 }}
 className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs hover:ring-4 hover:ring-blue-500/20 active:scale-95 transition-all"
 >
 AD
 </button>
 <AnimatePresence>
 {isProfileOpen && (
 <m.div
 initial={{ opacity: 0, scale: 0.95, y: -10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: -10 }}
 className="absolute right-0 top-full mt-3 w-64 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-border p-6 z-50 text-left"
 >
 <div className="flex items-center gap-3 mb-4">
 <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
 AD
 </div>
 <div>
 <h4 className="text-sm font-black text-foreground leading-tight">Admin FinTrack</h4>
 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Lead Infra Architect</p>
 </div>
 </div>
 <div className="border-t border-border pt-3 space-y-2">
 <div className="flex justify-between items-center text-[10px] font-bold">
 <span className="text-muted-foreground uppercase">Operator Zone</span>
 <span className="text-blue-600 dark:text-blue-400">HQ NATIONAL</span>
 </div>
 <div className="flex justify-between items-center text-[10px] font-bold">
 <span className="text-muted-foreground uppercase">Node Access</span>
 <span className="text-emerald-500">FULL (Level 5)</span>
 </div>
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </header>

 {/* Main Map Content */}
 <div
 className={cn(
"flex-1 mt-16 relative bg-background transition-all duration-300",
 isFullscreen ?"w-full h-full":""
 )}
 >
 <div className={cn(
"absolute inset-0 z-0 overflow-hidden transition-all duration-300",
 isFullscreen
 ?"m-0 rounded-none border-none shadow-none"
 :"mx-2 sm-phone:mx-4 my-4 md:m-0 rounded-[2rem] md:rounded-none border border-border md:border-none shadow-2xl md:shadow-none"
 )}>
 {mapComponent}
 </div>

 {/* Top Right Control - Layers */}
 <div className="absolute top-8 md:top-6 right-4 sm-phone:right-6 md:right-8 z-10 pointer-events-auto">
 <div className="relative">
 <button
 onClick={() => setIsLayersOpen(!isLayersOpen)}
 className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-md text-foreground px-6 py-3 rounded-2xl text-xs font-black shadow-xl border border-border/50 flex items-center gap-3 hover:bg-white dark:hover:bg-card transition-all"
 >
 <Filter size={18} className="text-primary"/>
 Layers
 </button>

 <AnimatePresence>
 {isLayersOpen && (
 <m.div
 initial={{ opacity: 0, scale: 0.95, y: -10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: -10 }}
 className="absolute top-full mt-3 right-0 w-52 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-border p-6 z-50"
 >
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Filter Viewport</p>
 <div className="space-y-3">
 {['OLT','ODP','ONT','Server','Good','Maintenance'].map((layer) => (

 <label key={layer} className="flex items-center gap-3 cursor-pointer group">
 <div className="relative flex items-center">
 <input
 type="checkbox"
 checked={activeLayers[layer as keyof typeof activeLayers]}
 onChange={() => setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer as keyof typeof activeLayers] }))}
 className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-border transition-all checked:bg-blue-600 checked:border-blue-600"
 />
 <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
 <Check size={12} strokeWidth={4} />
 </div>
 </div>
 <span className={cn(
"text-[13px] font-bold tracking-tight transition-colors",
 activeLayers[layer as keyof typeof activeLayers]
 ? (layer ==='Maintenance'?"text-amber-500": layer ==='Good'?"text-emerald-500":"text-foreground")
 :"text-muted-foreground dark:text-muted-foreground group-hover:text-muted-foreground"

 )}>
 {layer}
 </span>
 </label>
 ))}

 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* Floating Legend */}
 <div className="absolute top-8 md:top-6 left-4 sm-phone:left-6 md:left-8 z-40 flex flex-col gap-4 pointer-events-none">
 {/* Unified Map Legend Toggle */}
 <div className="relative pointer-events-auto block">
 <button
 onClick={() => setIsLegendOpen(!isLegendOpen)}
 className={cn(
"bg-white/90 dark:bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-border/50 text-primary transition-all active:scale-95",
 isLegendOpen &&"bg-primary text-primary-foreground border-primary"
 )}
 aria-label={isLegendOpen ?"Close legend":"Open map legend"}
 aria-expanded={isLegendOpen}
 >
 {isLegendOpen ? <XIcon size={20} /> : <Database size={20} />}
 </button>
 <AnimatePresence>
 {isLegendOpen && (
 <m.div
 initial={{ opacity: 0, scale: 0.95, x: -10 }}
 animate={{ opacity: 1, scale: 1, x: 0 }}
 exit={{ opacity: 0, scale: 0.95, x: -10 }}
 className="absolute top-full left-0 mt-3 md:top-0 md:left-full md:mt-0 md:ml-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-border p-5 md:p-6 w-[calc(100vw-2.5rem)] min-[350px]:w-64 z-50"
 >
 <LegendContent nodeStats={nodeStats} />
 </m.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* Selected Node Drawer & Location Card */}
 <AnimatePresence>
 {selectedNode && (
 <div className="absolute inset-x-0 bottom-0 top-auto lg:top-6 lg:bottom-6 lg:right-6 lg:left-auto lg:h-[calc(100%-48px)] flex flex-col lg:flex-row items-end lg:items-start justify-end gap-4 p-4 lg:p-0 z-50 pointer-events-none w-full lg:w-auto">
 {/* Location Detail Card (Left Side) - Hidden on mobile to save space */}
 <m.div
 initial={{ x: 100, opacity: 0, scale: 0.9 }}
 animate={{ x: 0, opacity: 1, scale: 1 }}
 exit={{ x: 100, opacity: 0, scale: 0.9 }}
 transition={{ type:"spring", damping: 25, stiffness: 200, delay: 0.1 }}
 className="w-64 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-border/50 p-6 flex flex-col pointer-events-auto h-full overflow-y-auto overflow-x-hidden custom-scrollbar hidden lg:flex"
 >
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
 <Navigation size={20} />
 </div>
 <div>
 <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Location</h3>
 <p className="text-[10px] font-bold text-muted-foreground">Node ID: {selectedNode.id}</p>
 </div>
 </div>

 <div className="space-y-5">
 <div>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Area Intelligence</p>
 <div className="space-y-3">
 <div className="bg-muted p-3 rounded-xl border border-border/50 /50">
 <p className="text-[9px] font-bold text-muted-foreground uppercase">Region</p>
 <p className="text-xs font-black truncate"title={selectedNode.location}>
 {(() => {
 if (selectedNode.location.includes(',')) {
 return selectedNode.location.split(',')[1]?.trim();
 } else if (selectedNode.location.includes('-')) {
 return selectedNode.location.split('-')[1]?.trim();
 }
 return selectedNode.location;
 })()}
 </p>
 </div>
 <div className="bg-muted p-3 rounded-xl border border-border/50 /50">
 <p className="text-[9px] font-bold text-muted-foreground uppercase">Specific Area</p>
 <p className="text-xs font-black truncate"title={selectedNode.location}>
 {(() => {
 if (selectedNode.location.includes(',')) {
 return selectedNode.location.split(',')[0]?.trim();
 } else if (selectedNode.location.includes('-')) {
 return selectedNode.location.split('-')[0]?.trim();
 }
 return'Main Hub';
 })()}
 </p>
 </div>
 </div>
 </div>

 <div className="pt-2">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Coordinates</p>
 <div className="flex gap-2">
 <div
 className="flex-1 bg-muted p-2 rounded-lg text-center font-mono text-[9px] lg:text-[10px] font-bold truncate overflow-hidden"
 title={String(selectedNode.latitude)}
 >
 {(() => {
 const num = Number(selectedNode.latitude);
 return isNaN(num) ? String(selectedNode.latitude) : num.toFixed(6);
 })()}
 </div>
 <div
 className="flex-1 bg-muted p-2 rounded-lg text-center font-mono text-[9px] lg:text-[10px] font-bold truncate overflow-hidden"
 title={String(selectedNode.longitude)}
 >
 {(() => {
 const num = Number(selectedNode.longitude);
 return isNaN(num) ? String(selectedNode.longitude) : num.toFixed(6);
 })()}
 </div>
 </div>
 </div>

 <div className="mt-4 p-4 bg-primary rounded-2xl text-primary-foreground">
 <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Signal Density</p>
 <p className="text-lg font-black tracking-tighter">High Density</p>
 <div className="mt-3 flex gap-1">
 {[1, 2, 3, 4, 5].map((i) => (
 <div key={i} className={cn("h-1 flex-1 rounded-full", i <= 4 ?"bg-white":"bg-white/30")} />
 ))}
 </div>
 </div>
 </div>
 </m.div>

 {/* Main Asset Drawer */}
 <m.div
 initial={isMobile ? { y:"100%", opacity: 0 } : { x: 400, opacity: 0 }}
 animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
 exit={isMobile ? { y:"100%", opacity: 0 } : { x: 400, opacity: 0 }}
 transition={{ type:"spring", damping: 30, stiffness: 250 }}
 style={{ contentVisibility:'auto'}}
 className="w-full max-w-full md:max-w-md lg:w-96 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-t-[2.5rem] lg:rounded-[2.5rem] shadow-2xl border border-border/50 flex flex-col overflow-hidden pointer-events-auto h-[65vh] lg:h-full"
 >
 {isMobile && (
 <div className="w-full flex justify-center pt-3 pb-1">
 <div className="w-12 h-1 rounded-full bg-slate-300 /60"/>
 </div>
 )}

 <div className="p-4 sm:p-5 lg:p-8 border-b border-border">
 <div className="flex justify-between items-start mb-4 lg:mb-6">
 <div>
 <span className={cn(
"text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
 nodeStatus ==='Online'?"bg-green-100 dark:bg-green-900/30 text-green-600":
 nodeStatus ==='Maintenance'?"bg-amber-100 dark:bg-amber-900/30 text-amber-600":
 (nodeStatus ==='Warning'|| nodeStatus ==='Broken') ?"bg-red-100 dark:bg-red-900/30 text-red-600":
"bg-muted /30 text-muted-foreground"
 )}>
 {nodeStatus} Node
 </span>
 <h2 className="text-xl lg:text-2xl font-black mt-2 lg:mt-3 tracking-tight truncate">{selectedNode.sn}</h2>
 </div>
 <button
 onClick={() => setSelectedNode(null)}
 className="p-2 hover:bg-muted dark:hover:bg-muted rounded-full transition-colors"
 aria-label="Close node details"
 >
 <XIcon size={20} />
 </button>
 </div>

 <div className="grid grid-cols-2 gap-3 lg:gap-4">
 <div className="bg-muted p-3 lg:p-4 rounded-2xl border border-border/50 /50">
 <p className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase mb-1">Capacity</p>
 <div className="flex items-baseline gap-1">
 <span className="text-base lg:text-lg font-black">12</span>
 <span className="text-[10px] md:text-xs text-muted-foreground font-bold">/ 16 Ports</span>
 </div>
 <div className="w-full bg-muted h-1 lg:h-1.5 rounded-full mt-2 lg:mt-3 overflow-hidden">
 <div className="bg-primary h-full w-[75%]"/>
 </div>
 </div>
 <div className="bg-muted p-3 lg:p-4 rounded-2xl border border-border/50 /50">
 <p className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase mb-1">Health</p>
 <div className="flex items-baseline gap-1">
 <span className={cn("text-base lg:text-lg font-black", healthInfo.textColor)}>
 {healthInfo.label}
 </span>
 </div>
 <div className="w-full bg-muted h-1 lg:h-1.5 rounded-full mt-2 lg:mt-3 overflow-hidden">
 <div className={cn("h-full", healthInfo.barColor)} style={{ width:`${healthInfo.value}%`}} />
 </div>
 </div>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-8 space-y-5 lg:space-y-8 custom-scrollbar">
 {/* Mobile/Tablet Portrait Location Info */}
 <section className="lg:hidden">
 <h3 className="text-[10px] md:text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
 <Navigation size={14} />
 Location Info
 </h3>
 <div className="space-y-4">
 {/* Area Intelligence */}
 <div className="bg-muted p-4 rounded-2xl border border-border/30 /30">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Area Intelligence</p>
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-border/50 /50">
 <p className="text-[9px] font-bold text-muted-foreground uppercase">Region</p>
 <p className="text-xs font-black truncate"title={selectedNode.location}>
 {(() => {
 if (selectedNode.location.includes(',')) {
 return selectedNode.location.split(',')[1]?.trim();
 } else if (selectedNode.location.includes('-')) {
 return selectedNode.location.split('-')[1]?.trim();
 }
 return selectedNode.location;
 })()}
 </p>
 </div>
 <div className="bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-border/50 /50">
 <p className="text-[9px] font-bold text-muted-foreground uppercase">Specific Area</p>
 <p className="text-xs font-black truncate"title={selectedNode.location}>
 {(() => {
 if (selectedNode.location.includes(',')) {
 return selectedNode.location.split(',')[0]?.trim();
 } else if (selectedNode.location.includes('-')) {
 return selectedNode.location.split('-')[0]?.trim();
 }
 return'Main Hub';
 })()}
 </p>
 </div>
 </div>
 </div>

 {/* Coordinates & Signal Density */}
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-muted p-4 rounded-2xl border border-border/30 /30 flex flex-col justify-between">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Coordinates</p>
 <div className="flex gap-2">
 <div className="flex-1 bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg text-center font-mono text-[9px] font-bold truncate">
 {(() => {
 const num = Number(selectedNode.latitude);
 return isNaN(num) ? String(selectedNode.latitude) : num.toFixed(6);
 })()}
 </div>
 <div className="flex-1 bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg text-center font-mono text-[9px] font-bold truncate">
 {(() => {
 const num = Number(selectedNode.longitude);
 return isNaN(num) ? String(selectedNode.longitude) : num.toFixed(6);
 })()}
 </div>
 </div>
 </div>

 <div className="bg-primary p-4 rounded-2xl text-primary-foreground flex flex-col justify-between">
 <div>
 <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Signal Density</p>
 <p className="text-sm font-black tracking-tighter">High Density</p>
 </div>
 <div className="mt-2 flex gap-1">
 {[1, 2, 3, 4, 5].map((i) => (
 <div key={i} className={cn("h-1 flex-1 rounded-full", i <= 4 ?"bg-white":"bg-white/30")} />
 ))}
 </div>
 </div>
 </div>
 </div>
 </section>

 <section>
 <h3 className="text-[10px] md:text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
 <InfoIcon size={14} />
 Technical Info
 </h3>
 <div className="space-y-3 lg:space-y-4">
 <div className="flex justify-between items-center bg-muted p-2.5 lg:p-3 rounded-xl border border-border/30 /30">
 <span className="text-[10px] md:text-xs font-bold text-muted-foreground">Model</span>
 <span className="text-[10px] md:text-xs font-black truncate max-w-[150px] lg:max-w-none text-right">Huawei MA5608T</span>
 </div>
 <div className="flex justify-between items-center bg-muted p-2.5 lg:p-3 rounded-xl border border-border/30 /30">
 <span className="text-[10px] md:text-xs font-bold text-muted-foreground">MAC</span>
 <span className="text-[10px] md:text-xs font-mono font-black">{selectedNode.mac}</span>
 </div>
 <div className="flex flex-col gap-1.5 lg:gap-2 bg-muted p-2.5 lg:p-3 rounded-xl border border-border/30 /30">
 <span className="text-[10px] md:text-xs font-bold text-muted-foreground">Physical Location</span>
 <span className="text-[10px] md:text-xs font-black leading-relaxed">{selectedNode.location}</span>
 </div>
 </div>
 </section>

 <section>
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-[10px] md:text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
 <AlertTriangle size={14} />
 Incidents
 </h3>
 {nodeStatus !=='Online'&& (
 <span className="text-[8px] md:text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-full font-black">1 Critical</span>
 )}
 </div>

 {nodeStatus ==='Online'? (
 <div className="flex flex-col items-center justify-center py-6 lg:py-8 bg-muted/20 rounded-2xl border border-dashed border-border">
 <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-500 mb-2 lg:mb-3">
 <Activity size={18} />
 </div>
 <p className="text-[10px] md:text-xs font-bold text-muted-foreground italic">Perfect condition</p>
 </div>
 ) : (
 <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-3 lg:p-4 rounded-r-2xl">
 <div className="flex justify-between mb-2">
 <p className="text-[10px] md:text-xs font-black text-amber-600">#TCK-8921-X</p>
 <div className="flex items-center gap-1 text-[8px] md:text-[10px] text-muted-foreground font-bold">
 <Clock size={10} />
 <span>2h ago</span>
 </div>
 </div>
 <p className="text-[11px] md:text-[12px] font-bold text-foreground leading-relaxed mb-3 lg:mb-4">
 Power loss detected at main supply.
 </p>
 <div className="flex items-center gap-2 lg:gap-3">
 <div className="h-7 w-7 lg:h-8 lg:w-8 rounded-full bg-muted overflow-hidden ring-2 ring-white">
 <Image
 unoptimized
 width={32}
 height={32}
 src="https://ui-avatars.com/api/?name=Budi+Santoso&background=random&size=100"
 className="w-full h-full object-cover"
 alt="Technician"
 />
 </div>
 <div>
 <p className="text-[10px] md:text-[11px] font-black">Budi Santoso</p>
 <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-tighter truncate max-w-[100px] lg:max-w-none">Field Engineer</p>
 </div>
 </div>
 </div>
 )}
 </section>
 </div>

 <div className="p-4 sm:p-5 lg:p-8 bg-muted/50 /30 space-y-3">
 <button
 onClick={async () => {
 const res = await dispatchTechnician(selectedNode.id, selectedNode.sn);
 if (res.success) {
 toast.success("Technician dispatched successfully!");
 queryClient.invalidateQueries({ queryKey: ['map-assets'] });
 } else {
 toast.error("Failed to dispatch technician.");
 }
 }}
 className="w-full bg-primary text-primary-foreground py-3 lg:py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:translate-y-[-2px] transition-all flex items-center justify-center gap-3"
 >
 <Activity size={18} />
 Dispatch
 </button>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>

 {/* Bottom Floating Stats */}
 <div className={cn("absolute bottom-16 md:bottom-10 left-4 sm-phone:left-6 md:left-8 z-40 flex flex-col min-[350px]:flex-row gap-2 md:gap-4 pointer-events-none transition-all duration-300", selectedNode &&"hidden lg:flex")}>
 <m.div
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-3 md:px-6 py-2 md:py-4 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-border/50 flex items-center gap-2 md:gap-4 group hover:bg-white dark:hover:bg-card transition-all cursor-default pointer-events-auto"
 >
 <div className="bg-blue-100 dark:bg-blue-900/30 p-2 md:p-3 rounded-xl md:rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
 <Activity size={16} className="md:w-6 md:h-6"/>
 </div>
 <div>
 <p className="text-sm md:text-2xl font-black leading-none tracking-tighter">
 {assets.length > 0 ? ((assets.filter(a => (a.condition || a.status) ==='Good'|| (a.condition || a.status) ==='Online').length / assets.length) * 100).toFixed(1) : 0}%
 </p>
 <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 md:mt-1">Health</p>
 </div>
 </m.div>
 <m.div
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ delay: 0.1 }}
 className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-3 md:px-6 py-2 md:py-4 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-border/50 flex items-center gap-2 md:gap-4 group hover:bg-white dark:hover:bg-card transition-all cursor-default pointer-events-auto"
 >
 <div className="bg-red-100 dark:bg-red-900/30 p-2 md:p-3 rounded-xl md:rounded-2xl text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
 <AlertTriangle size={16} className="md:w-6 md:h-6"/>
 </div>
 <div>
 <p className="text-sm md:text-2xl font-black leading-none tracking-tighter text-red-600">
 {String(assets.filter(a => (a.condition || a.status) !=='Good'&& (a.condition || a.status) !=='Online').length).padStart(2,'0')}
 </p>
 <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 md:mt-1">Outages</p>
 </div>
 </m.div>
 </div>

 {/* Zoom Controls (Bottom Right) */}
 <div className={cn("absolute bottom-32 sm-phone:bottom-16 md:bottom-12 right-4 sm-phone:right-6 md:right-8 z-50 flex flex-col gap-2 transition-all duration-300", selectedNode ?"hidden":"flex")}>
 <div className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-md rounded-xl shadow-xl border border-border/50 flex flex-col p-0.5 pointer-events-auto">
 <button
 onClick={() => setZoom(prev => Math.min(prev + 1, 18))}
 className="p-2 hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors text-muted-foreground"
 title="Zoom In"
 aria-label="Zoom in map"
 >
 <ZoomIn size={14} />
 </button>
 <div className="h-[1px] bg-muted/50 mx-1.5"/>
 <button
 onClick={() => setZoom(prev => Math.max(prev - 1, 3))}
 className="p-2 hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors text-muted-foreground"
 title="Zoom Out"
 aria-label="Zoom out map"
 >
 <ZoomOut size={14} />
 </button>
 <div className="h-[1px] bg-muted/50 mx-1.5"/>
 <button
 onClick={toggleFullscreen}
 className="p-2 hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors text-muted-foreground"
 title="Toggle Fullscreen"
 aria-label="Toggle full screen view"
 >
 {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
 </button>
 </div>
 </div>
 </div>


 {/* Maintenance History Modal */}
 <AnimatePresence>
 {isHistoryModalOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setIsHistoryModalOpen(false)}
 className="absolute inset-0 bg-card/60 backdrop-blur-sm"
 />
 <m.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="relative w-full max-w-2xl bg-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-border flex flex-col max-h-[80vh]"
 >
 <div className="p-8 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
 <div>
 <h3 className="text-2xl font-black tracking-tight">Maintenance Logs</h3>
 <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">Asset: {selectedNode?.sn}</p>
 </div>
 <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-muted dark:hover:bg-muted rounded-full transition-colors"aria-label="Close maintenance history">
 <XIcon size={20} />
 </button>
 </div>
 <div className="p-8 overflow-y-auto flex-1 scrollbar-hide">
 {maintenanceHistory.length > 0 ? (
 <div className="space-y-6">
 {maintenanceHistory.map((item, idx) => (
 <div key={item.id} className="relative pl-8 border-l-2 border-border pb-6 last:pb-0">
 <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-sm"/>
 <div className="bg-muted p-5 rounded-2xl border border-border/50 /50">
 <div className="flex justify-between items-start mb-2">
 <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">{item.technician_name}</p>
 <span className="text-[10px] font-bold text-muted-foreground">{new Date(item.date).toLocaleString()}</span>
 </div>
 <p className="text-sm font-bold leading-relaxed">{item.description}</p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
 <Activity size={48} className="mb-4 opacity-20"/>
 <p className="font-bold italic">No maintenance history found</p>
 </div>
 )}
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
}
