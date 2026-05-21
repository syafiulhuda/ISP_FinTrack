import { useState, useMemo, useEffect, useRef } from "react";
import { Asset } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  getAssetRoster, 
  getStockAssets, 
  getWarehouses, 
  createAsset, 
  deleteAsset, 
  updateAssetCondition, 
  deployAsset, 
  startMaintenance 
} from "@/actions/assets";
import { getAdminProfile } from "@/actions/admin";
import { resolveMaintenance } from "@/actions/map";

export function useInventory() {
  const { data: assetRoster = [], isLoading: loadingAssets, refetch: refetchAssets } = useQuery({ 
    queryKey: ['assetRoster'], 
    queryFn: getAssetRoster,
    refetchInterval: 60000
  });

  const { data: stockAssets = [], isLoading: loadingStock, refetch: refetchStock } = useQuery({ 
    queryKey: ['stockAssets'], 
    queryFn: getStockAssets,
    refetchInterval: 60000
  });
  
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: getWarehouses
  });

  const { data: profile } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile
  });
  const isTimLapangan = profile?.role === 'Tim Lapangan' || profile?.role === 'Pekerja';

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [selectedOwnership, setSelectedOwnership] = useState("All");
  const [selectedUsage, setSelectedUsage] = useState("All");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const itemsPerPage = 10;

  // Form State
  const [newAsset, setNewAsset] = useState<{
    sn: string;
    mac: string;
    type: string;
    location: string;
    condition: string;
    kepemilikan: string;
    latitude?: number;
    longitude?: number;
  }>({
    sn: '', mac: '', type: 'Router', location: '', condition: 'Good', kepemilikan: 'Dimiliki'
  });

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [resolvingAssetSn, setResolvingAssetSn] = useState<string | null>(null);
  const [techName, setTechName] = useState("");
  const [techDesc, setTechDesc] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  
  const [isStartingMaintenance, setIsStartingMaintenance] = useState(false);
  const [startingAssetSn, setStartingAssetSn] = useState<string | null>(null);
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [techNameStart, setTechNameStart] = useState("");
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAssetSn, setDeletingAssetSn] = useState<string | null>(null);
  const [deployingAssetSn, setDeployingAssetSn] = useState<string | null>(null);
  const [deployData, setDeployData] = useState({ warehouse: '', city: '', province: '', latitude: -6.2088, longitude: 106.8456 });

  useEffect(() => {
    if (isRegisterModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRegisterModalOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        if (isResolving || isStartingMaintenance || isDeleting || deployingAssetSn !== null) {
          return;
        }
        setActiveActionMenu(null);
        setIsResolving(false);
        setIsStartingMaintenance(false);
        setIsDeleting(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isResolving, isStartingMaintenance, isDeleting, deployingAssetSn]);

  const dynamicStats = useMemo(() => {
    const total = assetRoster.length + stockAssets.length;
    const active = assetRoster.filter((a: Asset) => a.condition === "Good" && a.kepemilikan !== "Dijual" && a.kepemilikan !== "Telah Dijual").length;
    const faulty = assetRoster.filter((a: Asset) => (a.condition === "Broken" || a.condition === "Maintenance" || a.condition === "Warning") && a.kepemilikan !== "Dijual" && a.kepemilikan !== "Telah Dijual").length;
    const stock = stockAssets.length;
    const owned = assetRoster.filter((a: Asset) => a.kepemilikan === "Dimiliki" || !a.kepemilikan).length;
    const rented = assetRoster.filter((a: Asset) => a.kepemilikan === "Sewa").length;
    const sold = assetRoster.filter((a: Asset) => a.kepemilikan === "Dijual" || a.kepemilikan === "Telah Dijual").length;

    const deploymentRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return [
      {
        label: "Total Hardware",
        value: mounted ? total.toLocaleString() : "---",
        trend: "+12% this month",
        trendIcon: "trending-up",
        color: "bg-primary/5",
        isAlert: false
      },
      {
        label: "Active Deployed",
        value: mounted ? active.toLocaleString() : "---",
        trend: `${deploymentRate}% deployment rate`,
        trendIcon: "check-circle",
        color: "bg-primary/5",
        isAlert: false
      },
      {
        label: "Faulty / RMA",
        value: mounted ? faulty.toLocaleString() : "---",
        trend: "Action Required",
        trendIcon: "warning",
        color: "bg-orange-500/10",
        isAlert: true
      },
      {
        label: "Warehouse Stock",
        value: mounted ? stock.toLocaleString() : "---",
        trend: "Ready for dispatch",
        trendIcon: "warehouse",
        color: "bg-primary/5",
        isAlert: false
      },
      {
        label: "Dimiliki",
        value: mounted ? owned.toLocaleString() : "---",
        trend: "Aset aktif",
        trendIcon: "check-circle",
        color: "bg-emerald-500/10",
        isAlert: false
      },
      {
        label: "Sewa",
        value: mounted ? rented.toLocaleString() : "---",
        trend: "Aset sewa",
        trendIcon: "check-circle",
        color: "bg-blue-500/10",
        isAlert: false
      },
      {
        label: "Telah Dijual",
        value: mounted ? sold.toLocaleString() : "---",
        trend: sold > 0 ? "Archived" : "None sold",
        trendIcon: "warning",
        color: "bg-red-500/10",
        isAlert: sold > 0
      },
    ];
  }, [mounted, assetRoster, stockAssets]);

  const allAssets = useMemo(() => {
    const deployed = assetRoster.map((a: Asset) => ({ ...a, isStock: false, is_used: true }));
    const stock = stockAssets.map((a: Asset & { is_used?: boolean | null }) => ({ ...a, isStock: true, is_used: !!a.is_used }));
    return [...deployed, ...stock];
  }, [assetRoster, stockAssets]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    allAssets.forEach((a: Asset) => {
      if (a.type) types.add(a.type);
    });
    return Array.from(types).sort();
  }, [allAssets]);

  const uniqueConditions = useMemo(() => {
    const conditions = new Set<string>();
    allAssets.forEach((a: Asset) => {
      if (a.condition) conditions.add(a.condition);
    });
    return Array.from(conditions).sort();
  }, [allAssets]);

  const uniqueOwnerships = useMemo(() => {
    const ownerships = new Set<string>();
    allAssets.forEach((a: Asset) => {
      if (a.kepemilikan) {
        ownerships.add(a.kepemilikan);
      }
    });
    return Array.from(ownerships).sort();
  }, [allAssets]);

  const filteredAssets = useMemo(() => {
    return allAssets.filter(asset => {
      const typeMatch = selectedType === "All" || asset.type === selectedType;
      const conditionMatch = selectedCondition === "All" || asset.condition === selectedCondition;
      const isSold = asset.kepemilikan === "Dijual" || asset.kepemilikan === "Telah Dijual";
      
      let ownershipMatch = false;
      if (selectedOwnership === "All") {
        ownershipMatch = !isSold; 
      } else if (selectedOwnership === "Dijual") {
        ownershipMatch = isSold; 
      } else {
        ownershipMatch = asset.kepemilikan === selectedOwnership || (selectedOwnership === "Dimiliki" && !asset.kepemilikan);
      }
      
      const usageMatch = selectedUsage === "All" || (selectedUsage === "Stock" && !asset.is_used) || (selectedUsage === "Deployed" && asset.is_used);
      
      return typeMatch && conditionMatch && ownershipMatch && usageMatch;
    });
  }, [selectedType, selectedCondition, selectedOwnership, selectedUsage, mounted, allAssets]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleResetFilters = () => {
    setSelectedType("All");
    setSelectedCondition("All");
    setSelectedOwnership("All");
    setSelectedUsage("All");
    setCurrentPage(1);
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createAsset(newAsset);
    if (res.success) {
      toast.success("Asset registered successfully!");
      setIsRegisterModalOpen(false);
      setNewAsset({ sn: '', mac: '', type: 'Router', location: '', condition: 'Good', kepemilikan: 'Dimiliki', latitude: undefined, longitude: undefined });
      refetchAssets();
      refetchStock();
    } else {
      toast.error("Failed to register asset.");
    }
  };

  const handleUpdateCondition = async (sn: string, condition: string) => {
    const res = await updateAssetCondition(sn, condition);
    if (res.success) {
      toast.success(`Asset marked as ${condition}`);
      refetchAssets();
      refetchStock();
      setActiveActionMenu(null);
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleDeploy = async (sn: string) => {
    if (!deployData.warehouse || !deployData.city || !deployData.province) {
      toast.error("Please fill all deployment fields");
      return;
    }
    const res = await deployAsset(sn, {
      location: deployData.warehouse,
      latitude: deployData.latitude,
      longitude: deployData.longitude
    });
    if (res.success) {
      toast.success("Asset deployed to field!");
      setDeployingAssetSn(null);
      setActiveActionMenu(null);
      refetchAssets();
      refetchStock();
    } else {
      toast.error("Failed to deploy asset");
    }
  };

  const handleDeleteAsset = async () => {
    if (!deletingAssetSn) return;
    
    if (!window.confirm(`Are you sure you want to permanently delete asset ${deletingAssetSn}?`)) {
      return;
    }

    const res = await deleteAsset(deletingAssetSn);
    if (res.success) {
      toast.success("Asset permanently deleted");
      setIsDeleting(false);
      setDeletingAssetSn(null);
      refetchAssets();
      refetchStock();
      setActiveActionMenu(null);
    } else {
      toast.error("Failed to delete asset.");
    }
  };

  const handleStartMaintenance = async () => {
    if (!startingAssetSn || !techNameStart || !maintenanceReason) {
      toast.error("Please fill in maintenance details.");
      return;
    }
    if (!window.confirm(`Are you sure you want to move asset ${startingAssetSn} to Maintenance mode?`)) {
      return;
    }

    const res = await startMaintenance(startingAssetSn, techNameStart, maintenanceReason);
    if (res.success) {
      toast.success("Asset moved to Maintenance!");
      setIsStartingMaintenance(false);
      setActiveActionMenu(null);
      setStartingAssetSn(null);
      setTechNameStart("");
      setMaintenanceReason("");
      refetchAssets();
      refetchStock();
    } else {
      toast.error("Failed to start maintenance.");
    }
  };

  const handleResolveMaintenance = async () => {
    if (!resolvingAssetSn || !techName || !techDesc) {
      toast.error("Please fill in technician details.");
      return;
    }
    if (!window.confirm(`Are you sure you want to mark asset ${resolvingAssetSn} as Healthy? This will set status to Online.`)) {
      return;
    }

    const res = await resolveMaintenance(resolvingAssetSn, techName, techDesc);
    if (res.success) {
      toast.success("Maintenance resolved!");
      setIsResolving(false);
      setActiveActionMenu(null);
      setResolvingAssetSn(null);
      setTechName("");
      setTechDesc("");
      refetchAssets();
      refetchStock();
    } else {
      toast.error("Failed to resolve.");
    }
  };

  const isLoadingAll = loadingAssets || loadingStock;

  return {
    // Data & Loaders
    assetRoster, stockAssets, warehouses, profile, isTimLapangan, isLoadingAll,
    // Pagination
    currentPage, setCurrentPage, totalPages, itemsPerPage,
    // Filters
    selectedType, setSelectedType, selectedCondition, setSelectedCondition, 
    selectedOwnership, setSelectedOwnership, selectedUsage, setSelectedUsage,
    uniqueTypes, uniqueConditions, uniqueOwnerships,
    // Modal/Form State
    isRegisterModalOpen, setIsRegisterModalOpen, newAsset, setNewAsset,
    isMaintenanceModalOpen, setIsMaintenanceModalOpen,
    activeActionMenu, setActiveActionMenu, actionMenuRef, mounted,
    // Action States
    resolvingAssetSn, setResolvingAssetSn, techName, setTechName, techDesc, setTechDesc, isResolving, setIsResolving,
    isStartingMaintenance, setIsStartingMaintenance, startingAssetSn, setStartingAssetSn, maintenanceReason, setMaintenanceReason, techNameStart, setTechNameStart,
    isDeleting, setIsDeleting, deletingAssetSn, setDeletingAssetSn,
    deployingAssetSn, setDeployingAssetSn, deployData, setDeployData,
    // Computed
    dynamicStats, allAssets, filteredAssets, paginatedAssets,
    // Handlers
    handleResetFilters, handleRegisterAsset, handleUpdateCondition, handleDeploy, 
    handleDeleteAsset, handleStartMaintenance, handleResolveMaintenance,
    refetchAssets, refetchStock
  };
}
