"use client";

import React, { useState, useMemo } from"react";
import { useQuery } from"@tanstack/react-query";
import { 
 m, 
 AnimatePresence 
} from"framer-motion";
import { 
 TrendingUp, 
 Brain, 
 ArrowRight, 
 AlertCircle, 
 RefreshCw,
 DollarSign,
 Users,
 Activity
} from"lucide-react";
import dynamic from"next/dynamic";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from"recharts";
import { ChartContainer } from"@/components/charts/ChartContainer";

const RevenueProjectionChart = dynamic(() => import("@/components/charts/PredictionCharts").then(mod => mod.RevenueProjectionChart), { ssr: false });
const ChurnForecastChart = dynamic(() => import("@/components/charts/PredictionCharts").then(mod => mod.ChurnForecastChart), { ssr: false });
import { getPredictions, refreshPredictions, PredictionResult } from"@/actions/predictions";
import { formatCurrency, formatCompactNumber, cn } from"@/lib/utils";
import { toast } from"sonner";

export default function PredictionsPage() {
 const [modelType, setModelType] = useState<'lr'|'nn'>('lr');
 const [activeStat, setActiveStat] = useState(0);
 const touchStartX = React.useRef<number | null>(null);

 const { data: predictions, isLoading, refetch, isFetching } = useQuery({
 queryKey: ['predictions', modelType],
 queryFn: () => getPredictions(modelType),
 staleTime: 300000 // 5 minutes
 });

 const handleRefresh = async () => {
 toast.promise(refreshPredictions(), {
 loading:'Refreshing metrics...',
 success: () => {
 refetch();
 return'Data synchronized!';
 },
 error:'Failed to refresh database.'
 });
 };

 // Gabungkan data aktual dan prediksi untuk chart
 const chartData = useMemo(() => {
 if (!predictions) return [];
 
 // 1. Ambil data aktual
 const actuals = predictions.actual.map(d => ({
 ...d,
 revenue_actual: Number(d.revenue),
 churn_actual: Number(d.churn_rate),
 type:'Actual'
 }));

 type ChartDataPoint = Partial<typeof actuals[0]> & {
 month: string;
 type: string;
 revenue_forecast?: number;
 churn_forecast?: number;
 revenue_actual?: number;
 churn_actual?: number;
 };

 const lastActual = actuals[actuals.length - 1];

 // 2. Tambahkan titik prediksi (dimulai dari titik aktual terakhir agar nyambung)
 const combined: ChartDataPoint[] = [...actuals];
 
 // Titik prediksi bulan depan
 combined.push({
 month: predictions.predicted.month,
 revenue_forecast: predictions.predicted.revenue,
 churn_forecast: predictions.predicted.churn_rate,
 type:'Predicted'
 });

 // Agar garis nyambung, titik terakhir ACTUAL juga harus punya nilai FORECAST
 combined[combined.length - 2] = {
 ...lastActual,
 revenue_forecast: Number(lastActual.revenue),
 churn_forecast: Number(lastActual.churn_rate)
 };

 return combined;
 }, [predictions]);

 const calculateChange = (current: number, previous: number, isDirectDiff = false) => {
 if (!previous || isNaN(current) || isNaN(previous)) return"0.0";
 if (isDirectDiff) return (current - previous).toFixed(2);
 const diff = ((current / previous) - 1) * 100;
 return isFinite(diff) ? diff.toFixed(1) :"0.0";
 };

 return (
 <div className="space-y-8 p-2">
 {/* Header */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
 <div>
 <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">Predictive Analysis</h1>
 <p className="text-muted-foreground font-medium mt-1">Next-Month Financial & Churn Projections</p>
 </div>

 <div className="flex flex-nowrap items-center gap-1 bg-muted px-2 py-1.5 rounded-[2rem] border border-border shadow-inner w-full lg:w-fit overflow-hidden">
 <button 
 onClick={() => setModelType('lr')}
 disabled={isLoading}
 className={`flex items-center justify-center gap-1 lg-phone:gap-2 px-2 lg-phone:px-5 py-1.5 lg-phone:py-2.5 rounded-[1.5rem] text-[9px] lg-phone:text-sm font-black transition-all duration-300 whitespace-nowrap flex-1 ${
 modelType === 'lr'
 ? "bg-card dark:bg-primary text-primary dark:text-primary-foreground shadow-sm ring-1 ring-border dark:ring-primary/50"
 : "text-muted-foreground hover:text-foreground dark:hover:text-slate-200"
 }`}
 >
 <TrendingUp size={12} className="lg-phone:w-[16px] lg-phone:h-[16px] shrink-0"/>
 <span className="truncate">Linear Regression</span>
 </button>
 <button 
 onClick={() => setModelType('nn')}
 disabled={isLoading}
 className={`flex items-center justify-center gap-1 lg-phone:gap-2 px-2 lg-phone:px-5 py-1.5 lg-phone:py-2.5 rounded-[1.5rem] text-[9px] lg-phone:text-sm font-black transition-all duration-300 whitespace-nowrap flex-1 ${
 modelType === 'nn'
 ? "bg-card dark:bg-primary text-primary dark:text-primary-foreground shadow-sm ring-1 ring-border dark:ring-primary/50"
 : "text-muted-foreground hover:text-foreground dark:hover:text-slate-200"
 }`}
 >
 <Brain size={12} className="lg-phone:w-[16px] lg-phone:h-[16px] shrink-0"/>
 <span className="truncate">Neural Network</span>
 </button>
 <div className="w-px h-6 bg-muted mx-2"/>
 <button 
 onClick={handleRefresh}
 disabled={isFetching || isLoading}
 aria-label="Refresh Data"
 className="p-2.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
 title="Refresh Data"
 >
 <RefreshCw size={14} className={cn("lg-phone:w-[18px] lg-phone:h-[18px]", (isFetching || isLoading) &&"animate-spin")} />
 </button>
 </div>
 </div>

 {isLoading && !predictions ? (
 <div className="space-y-8 animate-pulse">
  {/* Prediction Highlights */}
  <div className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-6">
  <PredictionCardSkeleton />
  <PredictionCardSkeleton />
  <PredictionCardSkeleton />
  </div>
  <div className="block lg:hidden h-[195px] sm:h-[250px] w-full relative overflow-hidden !-mt-2 sm:!-mt-4 !mb-6">
    <div className="absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[145px] sm:h-[190px] skeleton-theme rounded-[1.5rem] shadow-xl"/>
  </div>

 {/* Charts Section */}
 <div className="grid grid-cols-1 gap-8">
 <ChartSkeleton />
 <ChartSkeleton />
 </div>
 </div>
 ) : !predictions ? (
 <div className="bg-card border border-border rounded-[2.5rem] p-20 text-center">
 <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4"/>
 <h2 className="text-xl font-black text-foreground">Insufficient Data</h2>
 <p className="text-muted-foreground mt-2">Need at least 3 months of historical data to run projections.</p>
 </div>
 ) : (
 <AnimatePresence mode="popLayout">
 <m.div 
 key={modelType}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className="space-y-8"
 >
 {/* Prediction Highlights */}
 <div className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-6">
 <PredictionCard 
 title="Predicted Revenue"
 value={`Rp ${formatCompactNumber(predictions.predicted.revenue)}`}
 change={calculateChange(predictions.predicted.revenue, predictions.actual[predictions.actual.length-1].revenue)}
 icon={<DollarSign />}
 color="primary"
 />
 <PredictionCard 
 title="Estimated Churn"
 value={`${predictions.predicted.churn_rate}%`}
 change={calculateChange(predictions.predicted.churn_rate, predictions.actual[predictions.actual.length-1].churn_rate, true)}
 icon={<Users />}
 color="rose"
 reverseColor
 />
 <PredictionCard 
 title="Projected OPEX"
 value={`Rp ${formatCompactNumber(predictions.predicted.expenses)}`}
 change={calculateChange(predictions.predicted.expenses, predictions.actual[predictions.actual.length-1].expenses)}
 icon={<Activity />}
 color="amber"
 reverseColor
 />
 </div>

 {/* MOBILE CAROUSEL */}
 <div 
 className="block lg:hidden h-[195px] sm:h-[250px] w-full relative overflow-hidden !-mt-2 sm:!-mt-4 !mb-6 touch-pan-y"
 onTouchStart={(e) => {
 touchStartX.current = e.touches[0].clientX;
 }}
 onTouchEnd={(e) => {
 if (touchStartX.current === null) return;
 const touchEndX = e.changedTouches[0].clientX;
 const diff = touchStartX.current - touchEndX;
 const N = 3;
 if (diff > 40) setActiveStat((prev) => (prev + 1) % N);
 else if (diff < -40) setActiveStat((prev) => (prev - 1 + N) % N);
 touchStartX.current = null;
 }}
 >
 {[
 { 
 title: "Predicted Revenue", 
 value: `Rp ${formatCompactNumber(predictions.predicted.revenue)}`, 
 change: calculateChange(predictions.predicted.revenue, predictions.actual[predictions.actual.length-1].revenue),
 icon: DollarSign, color: "primary", reverseColor: false 
 },
 { 
 title: "Estimated Churn", 
 value: `${predictions.predicted.churn_rate}%`, 
 change: calculateChange(predictions.predicted.churn_rate, predictions.actual[predictions.actual.length-1].churn_rate, true),
 icon: Users, color: "rose", reverseColor: true 
 },
 { 
 title: "Projected OPEX", 
 value: `Rp ${formatCompactNumber(predictions.predicted.expenses)}`, 
 change: calculateChange(predictions.predicted.expenses, predictions.actual[predictions.actual.length-1].expenses),
 icon: Activity, color: "amber", reverseColor: true 
 }
 ].map((k, i) => {
 const N = 3;
 const offset = (i - activeStat + N) % N;
 const isCenter = offset === 0;
 const isRight = offset === 1;
 const isLeft = offset === N - 1;
 const isVisible = isCenter || isRight || isLeft;
 
 const x = isCenter ? "0%" : isRight ? "85%" : isLeft ? "-85%" : "0%";
 const scale = isCenter ? 1 : 0.85;
 const zIndex = isCenter ? 30 : (isVisible ? 20 : 10);
 const opacity = isCenter ? 1 : (isVisible ? 0.7 : 0);

 const isPositive = parseFloat(k.change) > 0;
 const isGood = k.reverseColor ? !isPositive : isPositive;

 const colorMap: Record<string, string> = {
 primary: "text-primary bg-primary/10",
 rose: "text-rose-500 bg-rose-500/10",
 amber: "text-amber-500 bg-amber-500/10"
 };

 const shadowMap: Record<string, string> = {
 primary: "shadow-[0_0_25px_3px_color-mix(in_srgb,var(--primary),transparent_70%)] dark:shadow-[0_0_35px_5px_color-mix(in_srgb,var(--primary),transparent_60%)] border-primary/50",
 rose: "shadow-[0_0_25px_3px_rgba(244,63,94,0.3)] dark:shadow-[0_0_35px_5px_rgba(244,63,94,0.4)] border-rose-500/50",
 amber: "shadow-[0_0_25px_3px_rgba(245,158,11,0.3)] dark:shadow-[0_0_35px_5px_rgba(245,158,11,0.4)] border-amber-500/50"
 };

 return (
 <m.div
 key={k.title}
 onClick={() => isVisible && setActiveStat(i)}
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.2}
 onDragEnd={(e, { offset }) => {
 if (offset.x < -40) setActiveStat((prev) => (prev + 1) % N);
 else if (offset.x > 40) setActiveStat((prev) => (prev - 1 + N) % N);
 }}
 animate={{ x, scale, zIndex, opacity }}
 transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
 className={cn(
 "absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[145px] sm:h-[190px] rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer p-5 sm:p-8 flex flex-col justify-between transition-colors duration-300 border",
 isCenter ? `bg-card ${shadowMap[k.color]}` : "bg-muted/80 border-border shadow-none",
 !isVisible && "pointer-events-none"
 )}
 >
 <div className="flex items-center gap-3">
 <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center", isCenter ? colorMap[k.color] : "bg-muted text-muted-foreground")}>
 <k.icon className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <span className={cn("text-[10px] sm:text-xs font-black tracking-widest uppercase", isCenter ? "text-foreground" : "text-muted-foreground")}>{k.title}</span>
 </div>
 <div>
 <div className={cn("text-3xl sm:text-5xl font-black tracking-tight", isCenter ? "text-foreground" : "text-muted-foreground")}>{k.value}</div>
 <div className="flex items-center gap-2 mt-2">
 <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black shadow-sm", 
 isCenter ? (isGood ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" : "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20") : "bg-muted text-muted-foreground"
 )}>
 {isPositive ? "+" : ""}{k.change}%
 <ArrowRight size={10} className={cn("transition-transform", isPositive ? "-rotate-45" : "rotate-45")} />
 </div>
 <span className="text-[10px] font-bold text-muted-foreground">vs Last Month</span>
 </div>
 </div>
 </m.div>
 );
 })}
 </div>

 {/* Charts Section */}
 <div className="grid grid-cols-1 gap-8">
 {/* Revenue Projection Chart */}
 <m.div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col">
 <div className="flex items-center justify-between mb-10">
 <div>
 <h2 className="text-xl font-black text-foreground tracking-tight">Revenue Projection</h2>
 <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-widest">Actual vs Forecasted Analysis</p>
 </div>
 <div className="px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
 <span className="text-[10px] font-black text-primary uppercase tracking-wider">1-Month Outlook</span>
 </div>
 </div>
 <ChartContainer className="h-[320px] w-full mt-auto">
 <RevenueProjectionChart data={chartData} />
 </ChartContainer>
 </m.div>

 {/* Churn Rate Trend Chart */}
 <m.div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col">
 <div className="flex items-center justify-between mb-10">
 <div>
 <h2 className="text-xl font-black text-foreground tracking-tight">Churn Rate Forecast</h2>
 <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-widest">Subscriber Retention Projections</p>
 </div>
 </div>
 <ChartContainer className="h-[320px] w-full mt-auto">
 <ChurnForecastChart data={chartData} />
 </ChartContainer>
 </m.div>
 </div>
 </m.div>
 </AnimatePresence>
 )}
 </div>
 );
}

interface PredictionCardProps {
 title: string;
 value: string;
 change: string;
 icon: React.ReactNode;
 color: 'primary' | 'rose' | 'amber';
 reverseColor?: boolean;
}

function PredictionCard({ title, value, change, icon, color, reverseColor = false }: PredictionCardProps) {
 const isPositive = parseFloat(change) > 0;
 const isGood = reverseColor ? !isPositive : isPositive;

 const colorMap: Record<string, string> = {
 primary: "text-primary bg-primary/10 border-primary/20",
 rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
 amber: "text-amber-500 bg-amber-500/10 border-amber-500/20"
 };

 const glowMap: Record<string, string> = {
 primary: "bg-primary/10",
 rose: "bg-rose-500/10",
 amber: "bg-amber-500/10"
 };

 return (
 <div className="bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden group">
 <div className={`absolute top-0 right-0 w-32 h-32 ${glowMap[color]} rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-700`} />
 
 <div className="flex items-center gap-4 mb-5">
 <div className={`p-3 rounded-2xl ${colorMap[color].split('').slice(0, 2).join('')}`}>
 {icon}
 </div>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</span>
 </div>
 
 <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tighter tabular-nums whitespace-nowrap leading-none">
 {value}
 </h2>
 
 <div className="flex items-center gap-2 mt-4">
 <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black shadow-sm ${
 isGood ?"bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20":"bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20"
 }`}>
 {isPositive ?"+":""}{change}%
 <ArrowRight size={10} className={cn("transition-transform", isPositive ?"-rotate-45":"rotate-45")} />
 </div>
 <span className="text-[10px] font-bold text-muted-foreground">vs Last Month</span>
 </div>
 </div>
 );
}

interface TooltipPayloadEntry {
 name: string;
 value: number;
 color: string;
}

interface CustomTooltipProps {
 active?: boolean;
 payload?: TooltipPayloadEntry[];
 label?: string;
 unit?: string;
}

function CustomTooltip({ active, payload, label, unit =""}: CustomTooltipProps) {
 if (active && payload && payload.length) {
 return (
 <div className="bg-white p-4 border border-border shadow-2xl rounded-2xl">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
 <div className="space-y-1.5">
 {payload.map((entry, index: number) => (
 <div key={index} className="flex items-center justify-between gap-4">
 <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
 <div className="w-2 h-2 rounded-full"style={{ backgroundColor: entry.color }} />
 {entry.name}:
 </span>
 <span className="text-xs font-black text-foreground">
 {unit ==="%"?`${entry.value}%`: formatCurrency(entry.value)}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
 }
 return null;
}

function PredictionCardSkeleton() {
  return (
    <div className="bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden h-[178px]">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl skeleton-card shrink-0"/>
        <div className="w-24 h-4 skeleton-card rounded"/>
      </div>
      <div className="w-36 h-8 skeleton-card rounded mb-4"/>
      <div className="flex items-center gap-2">
        <div className="w-16 h-5 skeleton-card rounded-xl"/>
        <div className="w-20 h-3 skeleton-card rounded"/>
      </div>
    </div>
  );
}

const CHART_SKELETON_HEIGHTS = ["30%","45%","60%","35%","50%","70%","85%","60%","40%","55%","75%","90%"];
const CHART_SKELETON_BARS = Array.from({ length: 12 });

function ChartSkeleton() {
  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-[442px]">
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-2">
          <div className="w-48 h-6 skeleton-card rounded"/>
          <div className="w-32 h-3 skeleton-card rounded"/>
        </div>
        <div className="w-24 h-6 skeleton-card rounded-xl"/>
      </div>
      <div className="flex-1 w-full skeleton-theme rounded-[2rem] flex items-end justify-between p-6 gap-2">
        {CHART_SKELETON_BARS.map((_, i) => (
          <div 
            key={i} 
            className="w-full skeleton-card rounded-t-lg"
            style={{ height: CHART_SKELETON_HEIGHTS[i] }} 
          />
        ))}
      </div>
    </div>
  );
}
