"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";


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
  User,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize,
  Navigation,
  Check,
  Server as ServerIcon
} from "lucide-react";
import dynamic from 'next/dynamic';
import { 
  getMapAssets, 
  addMapNode, 
  dispatchTechnician, 
  getMaintenanceHistory 
} from "@/actions/map";
import { cn } from "@/lib/utils";

const IndonesiaMap = dynamic(() => import('@/components/map/IndonesiaMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 font-black">INITIALIZING GEOGRAPHIC ENGINE...</div>
});

export default function DistributionMapPage() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    OLT: true,
    ODP: true,
    ONT: true,
    Server: true,
    Good: true,
    Maintenance: false
  });
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

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
    refetchInterval: 60000,
  });

  const filteredAssets = useMemo(() => {
    const typeFilters = ['OLT', 'ODP', 'ONT', 'Server'];
    const statusFilters = ['Good', 'Maintenance'];

    const activeTypeFilters = typeFilters.filter(t => activeLayers[t as keyof typeof activeLayers]);
    const activeStatusFilters = statusFilters.filter(s => activeLayers[s as keyof typeof activeLayers]);

    return assets.filter(a => {
      const matchesSearch = a.sn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            a.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = activeTypeFilters.length === 0 || activeTypeFilters.includes(a.type);
      
      // If no status filters are active, show all standard statuses (Good + Maintenance)
      // Otherwise, show only the active ones.
      // Note: 'Online' in DB corresponds to 'Good' in UI
      const assetStatus = a.status === 'Online' ? 'Good' : a.status;
      const matchesStatus = activeStatusFilters.length === 0 || activeStatusFilters.includes(assetStatus);
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [assets, searchQuery, activeLayers]);

  const nodeStats = useMemo(() => {
    return {
      olt: filteredAssets.filter(a => a.type === 'OLT').length,
      odp: filteredAssets.filter(a => a.type === 'ODP').length,
      ont: filteredAssets.filter(a => a.type === 'ONT').length,
      server: filteredAssets.filter(a => a.type === 'Server').length
    };
  }, [filteredAssets]);



  if (!mounted) return null;

  return (
    <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header Overlay */}
      <header className="absolute top-0 right-0 w-full z-40 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex justify-between items-center h-16 px-8 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-3 text-slate-400" size={18} />
            <input 
              className="bg-white/60 dark:bg-slate-800/60 border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-80 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400"
              placeholder="Search Node ID, SN, or Location..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-slate-500">
            <button className="hover:bg-slate-200/50 dark:hover:bg-slate-800/50 p-2 rounded-full transition-colors"><LucideMap size={18} /></button>
            <button className="hover:bg-slate-200/50 dark:hover:bg-slate-800/50 p-2 rounded-full transition-colors"><SettingsIcon size={18} /></button>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
            AD
          </div>
        </div>
      </header>

        {/* Main Map Content */}
        <div className="flex-1 mt-16 relative">
          <div className="absolute inset-0 z-0">
            <IndonesiaMap 
              assets={filteredAssets} 
              onSelectNode={setSelectedNode} 
              selectedNode={selectedNode}
              zoom={zoom}
              center={center}
            />
          </div>

          {/* Top Right Control - Layers */}
          <div className="absolute top-6 right-6 z-10 pointer-events-auto">
            <div className="relative">
              <button 
                onClick={() => setIsLayersOpen(!isLayersOpen)}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-slate-100 px-6 py-3 rounded-2xl text-xs font-black shadow-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-3 hover:bg-white dark:hover:bg-slate-900 transition-all"
              >
                <Filter size={18} className="text-primary" />
                Layers
              </button>
              
              <AnimatePresence>
                {isLayersOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute top-full mt-3 right-0 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-50"
                  >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Viewport</p>
                    <div className="space-y-3">
                      {['OLT', 'ODP', 'ONT', 'Server', 'Good', 'Maintenance'].map((layer) => (
                        <label key={layer} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={activeLayers[layer as keyof typeof activeLayers]}
                              onChange={() => setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer as keyof typeof activeLayers] }))}
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-slate-300 dark:border-slate-700 transition-all checked:bg-blue-600 checked:border-blue-600"
                            />
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                              <Check size={12} strokeWidth={4} />
                            </div>
                          </div>
                          <span className={cn(
                            "text-[13px] font-bold tracking-tight transition-colors",
                            activeLayers[layer as keyof typeof activeLayers] 
                              ? (layer === 'Maintenance' ? "text-amber-500" : layer === 'Good' ? "text-emerald-500" : "text-slate-900 dark:text-white")
                              : "text-slate-400 dark:text-slate-600 group-hover:text-slate-500"
                          )}>
                            {layer}
                          </span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        {/* Floating Legend */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 pointer-events-none">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 w-64 pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Map Architecture</h3>
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
                <span className="text-[10px] font-bold text-slate-400">{String(nodeStats.olt).padStart(2, '0')} units</span>
              </div>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:indigo-400">
                    <Cpu size={16} />
                  </div>
                  <span className="text-[12px] font-bold">ODP Node</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{String(nodeStats.odp).padStart(2, '0')} units</span>
              </div>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/30 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Wifi size={16} />
                  </div>
                  <span className="text-[12px] font-bold">ONT Terminal</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{String(nodeStats.ont).padStart(2, '0')} units</span>
              </div>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <ServerIcon size={16} />
                  </div>
                  <span className="text-[12px] font-bold">Core Server</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{String(nodeStats.server).padStart(2, '0')} units</span>
              </div>
              
              <hr className="border-slate-200 dark:border-slate-800 my-4"/>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Good</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Maint.</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Selected Node Drawer & Location Card */}
        <AnimatePresence>
          {selectedNode && (
            <div className="absolute top-6 bottom-6 right-6 flex items-start gap-4 z-50 pointer-events-none">
              {/* Location Detail Card (Left Side) */}
              <motion.div 
                initial={{ x: 100, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 100, opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.1 }}
                className="w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800/50 p-6 flex flex-col pointer-events-auto h-full overflow-y-auto scrollbar-hide"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Navigation size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Location</h4>
                    <p className="text-[10px] font-bold text-slate-500">Node ID: {selectedNode.id}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Area Intelligence</p>
                    <div className="space-y-3">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Region</p>
                        <p className="text-xs font-black truncate">
                          {selectedNode.location.includes(',') 
                            ? selectedNode.location.split(',')[1]?.trim() 
                            : selectedNode.location}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Specific Area</p>
                        <p className="text-xs font-black truncate">
                          {selectedNode.location.includes(',') 
                            ? selectedNode.location.split(',')[0]?.trim() 
                            : 'Main Hub'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Coordinates</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-center font-mono text-[10px] font-bold">
                        {selectedNode.latitude}
                      </div>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-center font-mono text-[10px] font-bold">
                        {selectedNode.longitude}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-blue-600 rounded-2xl text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Signal Density</p>
                    <p className="text-lg font-black tracking-tighter">High Density</p>
                    <div className="mt-3 flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={cn("h-1 flex-1 rounded-full", i <= 4 ? "bg-white" : "bg-white/30")} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Main Asset Drawer */}
              <motion.div 
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800/50 flex flex-col overflow-hidden pointer-events-auto h-full"
              >
                <div className="p-8 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                        selectedNode.status === 'Online' ? "bg-green-100 dark:bg-green-900/30 text-green-600" :
                        selectedNode.status === 'Maintenance' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                        "bg-red-100 dark:bg-red-900/30 text-red-600"
                      )}>
                        {selectedNode.status} Node
                      </span>
                      <h2 className="text-2xl font-black mt-3 tracking-tight">{selectedNode.sn}</h2>
                    </div>
                    <button 
                      onClick={() => setSelectedNode(null)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                      <XIcon size={20} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Capacity</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black">12</span>
                        <span className="text-xs text-slate-400 font-bold">/ 16 Ports</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-blue-600 h-full w-[75%]" />
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Health</p>
                      <div className="flex items-baseline gap-1">
                        <span className={cn("text-lg font-black", selectedNode.status === 'Online' ? "text-green-500" : "text-amber-500")}>
                          {selectedNode.status === 'Online' ? '98.4%' : '64.1%'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className={cn("h-full", selectedNode.status === 'Online' ? "bg-green-500 w-[98%]" : "bg-amber-500 w-[64%]")} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                  <section>
                    <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <InfoIcon size={14} />
                      Technical Intelligence
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                        <span className="text-xs font-bold text-slate-500">Model</span>
                        <span className="text-xs font-black">Huawei SmartAX MA5608T</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                        <span className="text-xs font-bold text-slate-500">MAC Address</span>
                        <span className="text-xs font-mono font-black">{selectedNode.mac}</span>
                      </div>
                      <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                        <span className="text-xs font-bold text-slate-500">Physical Location</span>
                        <span className="text-xs font-black leading-relaxed">{selectedNode.location}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                        <span className="text-xs font-bold text-slate-500">Kepemilikan</span>
                        <span className={cn(
                          "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                          (selectedNode.kepemilikan === 'Dimiliki' || !selectedNode.kepemilikan) 
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                            : "bg-red-100 dark:bg-red-900/30 text-red-600"
                        )}>
                          {selectedNode.kepemilikan || 'Dimiliki'}
                        </span>
                      </div>
                      {selectedNode.tanggal_perubahan && (
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                          <span className="text-xs font-bold text-slate-500">Tgl. Perubahan</span>
                          <span className="text-xs font-black">{selectedNode.tanggal_perubahan}</span>
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} />
                        Active Incidents
                      </h4>
                      {selectedNode.status !== 'Online' && (
                        <span className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-full font-black">1 Critical</span>
                      )}
                    </div>
                    
                    {selectedNode.status === 'Online' ? (
                      <div className="flex flex-col items-center justify-center py-8 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-500 mb-3">
                          <Activity size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-500 italic">No active incidents found</p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-4 rounded-r-2xl">
                        <div className="flex justify-between mb-2">
                          <p className="text-xs font-black text-amber-600">#TCK-8921-X</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                            <Clock size={10} />
                            <span>2h ago</span>
                          </div>
                        </div>
                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                          Power loss detected at main supply. Backup UPS engaged but reporting low voltage.
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white dark:ring-slate-800">
                            <img 
                              src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100" 
                              className="w-full h-full object-cover"
                              alt="Technician"
                            />
                          </div>
                          <div>
                            <p className="text-[11px] font-black">Budi Santoso</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Field Engineer (Dispatching)</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  <section>
                    <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Service Impact Analysis</h4>
                    <div className="bg-slate-900 dark:bg-black p-6 rounded-[2rem] flex items-center justify-between text-white shadow-xl shadow-slate-900/10">
                      <div className="text-center flex-1 border-r border-slate-800">
                        <p className="text-3xl font-black">24</p>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Subscribers</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className={cn("text-3xl font-black", selectedNode.status === 'Online' ? "text-green-400" : "text-red-400")}>
                          {selectedNode.status === 'Online' ? '0%' : '12%'}
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">SLA Drop</p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
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
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:translate-y-[-2px] transition-all flex items-center justify-center gap-3"
                  >
                    <Activity size={18} />
                    Dispatch Technician
                  </button>
                  <button 
                    onClick={async () => {
                      const history = await getMaintenanceHistory(selectedNode.id);
                      setMaintenanceHistory(history);
                      setIsHistoryModalOpen(true);
                    }}
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-4 rounded-2xl font-black text-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    View Maintenance History
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Bottom Floating Stats */}
        <div className="absolute bottom-6 left-6 z-10 flex gap-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4 group hover:bg-white dark:hover:bg-slate-900 transition-all cursor-default"
          >
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-2xl font-black leading-none tracking-tighter">
                {assets.length > 0 ? ((assets.filter(a => a.status === 'Online').length / assets.length) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Network Health</p>
            </div>
          </motion.div>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4 group hover:bg-white dark:hover:bg-slate-900 transition-all cursor-default"
          >
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-2xl text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-2xl font-black leading-none tracking-tighter text-red-600">
                {String(assets.filter(a => a.status !== 'Online').length).padStart(2, '0')}
              </p>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Active Outages</p>
            </div>
          </motion.div>
        </div>

        {/* Zoom Controls (Bottom Right) */}
        <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-2">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col p-0.5 pointer-events-auto">
            <button 
              onClick={() => setZoom(prev => Math.min(prev + 1, 18))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <div className="h-[1px] bg-slate-200/50 dark:bg-slate-800/50 mx-1.5" />
            <button 
              onClick={() => setZoom(prev => Math.max(prev - 1, 3))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <div className="h-[1px] bg-slate-200/50 dark:bg-slate-800/50 mx-1.5" />
            <button 
              onClick={handleReset}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
              title="Reset View"
            >
              <Maximize size={14} />
            </button>
          </div>
        </div>
      </div>


      {/* Maintenance History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Maintenance Logs</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Asset: {selectedNode?.sn}</p>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <XIcon size={20} />
                </button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 scrollbar-hide">
                {maintenanceHistory.length > 0 ? (
                  <div className="space-y-6">
                    {maintenanceHistory.map((item, idx) => (
                      <div key={item.id} className="relative pl-8 border-l-2 border-slate-100 dark:border-slate-800 pb-6 last:pb-0">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-sm" />
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">{item.technician_name}</p>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(item.date).toLocaleString()}</span>
                          </div>
                          <p className="text-sm font-bold leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p className="font-bold italic">No maintenance history found</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
