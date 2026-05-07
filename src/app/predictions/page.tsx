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
import { formatCurrency } from "@/lib/utils";
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Predictive Analysis</h1>
          <p className="text-slate-500 font-medium mt-1">Next-Month Financial & Churn Projections</p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <button 
            onClick={() => setModelType('lr')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all ${
              modelType === 'lr' 
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <TrendingUp size={16} />
            Linear Regression
          </button>
          <button 
            onClick={() => setModelType('nn')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all ${
              modelType === 'nn' 
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Brain size={16} />
            Neural Network
          </button>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1" />
          <button 
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-3 text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
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
                value={formatCurrency(predictions.predicted.revenue)}
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
                value={formatCurrency(predictions.predicted.expenses)}
                change={calculateChange(predictions.predicted.expenses, predictions.actual[predictions.actual.length-1].expenses)}
                icon={<Activity />}
                color="amber"
                reverseColor
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Projection Chart */}
              <m.div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Revenue Projection</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Actual vs Forecasted</p>
                  </div>
                  <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                    <span className="text-[10px] font-black text-indigo-500 uppercase">1-Month Outlook</span>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                        tickFormatter={(val) => `Rp ${val/1000000}M`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" />
                      <Area 
                        type="monotone" 
                        dataKey="revenue_actual" 
                        stroke="#6366f1" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                        name="Actual Revenue"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue_forecast" 
                        stroke="#6366f1" 
                        strokeWidth={4} 
                        strokeDasharray="8 8" 
                        name="Forecasted"
                        dot={{ r: 6, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </m.div>

              {/* Churn Rate Trend Chart */}
              <m.div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Churn Rate Forecast</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Subscriber Retention Trend</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} unit="%" />
                      <Tooltip content={<CustomTooltip unit="%" />} />
                      <Area 
                        type="stepAfter" 
                        dataKey="churn_actual" 
                        stroke="#f43f5e" 
                        strokeWidth={4} 
                        fill="#f43f5e" 
                        fillOpacity={0.05} 
                        name="Historical Churn"
                      />
                      <Line 
                        type="stepAfter" 
                        dataKey="churn_forecast" 
                        stroke="#f43f5e" 
                        strokeWidth={4} 
                        strokeDasharray="8 8" 
                        name="Predicted Churn"
                        dot={{ r: 6, fill: '#fff', stroke: '#f43f5e', strokeWidth: 3 }}
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

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform`} />
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 bg-${color}-500/10 text-${color}-500 rounded-2xl`}>
          {icon}
        </div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{title}</span>
      </div>
      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
      <div className="flex items-center gap-2 mt-3">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
          isGood ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        }`}>
          {isPositive ? "+" : ""}{change}%
          <ArrowRight size={10} className={isPositive ? "-rotate-45" : "rotate-45"} />
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
