"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  m, 
  AnimatePresence 
} from "framer-motion";
import { 
  TrendingUp, 
  Brain, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw,
  DollarSign,
  Users,
  Activity
} from "lucide-react";
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts";
import { getPredictions, refreshPredictions, PredictionResult } from "@/actions/predictions";
import { formatCurrency, formatCompactNumber, cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PredictionsPage() {
  const [modelType, setModelType] = useState<'lr' | 'nn'>('lr');

  const { data: predictions, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['predictions', modelType],
    queryFn: () => getPredictions(modelType),
    staleTime: 300000 // 5 minutes
  });

  const handleRefresh = async () => {
    toast.promise(refreshPredictions(), {
      loading: 'Refreshing metrics...',
      success: () => {
        refetch();
        return 'Data synchronized!';
      },
      error: 'Failed to refresh database.'
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
      type: 'Actual'
    }));

    const lastActual = actuals[actuals.length - 1];

    // 2. Tambahkan titik prediksi (dimulai dari titik aktual terakhir agar nyambung)
    const combined = [...actuals];
    
    // Titik prediksi bulan depan
    combined.push({
      month: predictions.predicted.month,
      revenue_forecast: predictions.predicted.revenue,
      churn_forecast: predictions.predicted.churn_rate,
      type: 'Predicted'
    } as any);

    // Agar garis nyambung, titik terakhir ACTUAL juga harus punya nilai FORECAST
    actuals[actuals.length - 1] = {
      ...lastActual,
      revenue_forecast: Number(lastActual.revenue),
      churn_forecast: Number(lastActual.churn_rate)
    } as any;

    return combined;
  }, [predictions]);

  const calculateChange = (current: number, previous: number, isDirectDiff = false) => {
    if (!previous || isNaN(current) || isNaN(previous)) return "0.0";
    if (isDirectDiff) return (current - previous).toFixed(2);
    const diff = ((current / previous) - 1) * 100;
    return isFinite(diff) ? diff.toFixed(1) : "0.0";
  };

  if (isLoading && !predictions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">Running Predictive Models...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Predictive Analysis</h1>
          <p className="text-slate-500 font-medium mt-1">Next-Month Financial & Churn Projections</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-inner w-fit">
          <button 
            onClick={() => setModelType('lr')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-300 whitespace-nowrap ${
              modelType === 'lr' 
              ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-indigo-500/50" 
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <TrendingUp size={16} />
            Linear Regression
          </button>
          <button 
            onClick={() => setModelType('nn')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-300 whitespace-nowrap ${
              modelType === 'nn' 
              ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-indigo-500/50" 
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Brain size={16} />
            Neural Network
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />
          <button 
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2.5 text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {!predictions ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-20 text-center">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Insufficient Data</h3>
          <p className="text-slate-500 mt-2">Need at least 3 months of historical data to run projections.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <m.div 
            key={modelType}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Prediction Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PredictionCard 
                title="Predicted Revenue" 
                value={`Rp ${formatCompactNumber(predictions.predicted.revenue)}`}
                change={calculateChange(predictions.predicted.revenue, predictions.actual[predictions.actual.length-1].revenue)}
                icon={<DollarSign />}
                color="indigo"
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-8">
              {/* Revenue Projection Chart */}
              <m.div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Revenue Projection</h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Actual vs Forecasted Analysis</p>
                  </div>
                  <div className="px-3 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">1-Month Outlook</span>
                  </div>
                </div>
                <div className="h-[320px] w-full mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}}
                        tickFormatter={(val) => `Rp${val/1000000}M`}
                        width={60}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{value}</span>}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue_actual" 
                        stroke="#6366f1" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                        name="Actual"
                        animationDuration={1500}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue_forecast" 
                        stroke="#818cf8" 
                        strokeWidth={4} 
                        strokeDasharray="6 6" 
                        name="Forecast"
                        dot={{ r: 5, fill: '#fff', stroke: '#818cf8', strokeWidth: 3 }}
                        activeDot={{ r: 8, fill: '#818cf8', stroke: '#fff', strokeWidth: 3 }}
                        animationDuration={2000}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </m.div>

              {/* Churn Rate Trend Chart */}
              <m.div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Churn Rate Forecast</h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Subscriber Retention Projections</p>
                  </div>
                </div>
                <div className="h-[320px] w-full mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} unit="%" width={40} />
                      <Tooltip content={<CustomTooltip unit="%" />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{value}</span>}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="churn_actual" 
                        stroke="#f43f5e" 
                        strokeWidth={4} 
                        fill="#f43f5e" 
                        fillOpacity={0.05} 
                        name="Historical"
                        animationDuration={1500}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="churn_forecast" 
                        stroke="#fb7185" 
                        strokeWidth={4} 
                        strokeDasharray="6 6" 
                        name="Predicted"
                        dot={{ r: 5, fill: '#fff', stroke: '#fb7185', strokeWidth: 3 }}
                        activeDot={{ r: 8, fill: '#fb7185', stroke: '#fff', strokeWidth: 3 }}
                        animationDuration={2000}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </m.div>
            </div>
          </m.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function PredictionCard({ title, value, change, icon, color, reverseColor = false }: any) {
  const isPositive = parseFloat(change) > 0;
  const isGood = reverseColor ? !isPositive : isPositive;

  const colorMap: any = {
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20"
  };

  const glowMap: any = {
    indigo: "bg-indigo-500/10",
    rose: "bg-rose-500/10",
    amber: "bg-amber-500/10"
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 ${glowMap[color]} rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-700`} />
      
      <div className="flex items-center gap-4 mb-5">
        <div className={`p-3 rounded-2xl ${colorMap[color].split(' ').slice(0, 2).join(' ')}`}>
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</span>
      </div>
      
      <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums whitespace-nowrap leading-none">
        {value}
      </h3>
      
      <div className="flex items-center gap-2 mt-4">
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black shadow-sm ${
          isGood ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" : "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20"
        }`}>
          {isPositive ? "+" : ""}{change}%
          <ArrowRight size={10} className={cn("transition-transform", isPositive ? "-rotate-45" : "rotate-45")} />
        </div>
        <span className="text-[10px] font-bold text-slate-400">vs Last Month</span>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, unit = "" }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {unit === "%" ? `${entry.value}%` : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
