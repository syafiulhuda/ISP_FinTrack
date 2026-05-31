"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Receipt, Search, QrCode, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/actions/transactions";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";

export function FinanceAllClient() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
    refetchInterval: 60000
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const filteredTransactions = transactions.filter((trx: any) => {
    const matchesSearch = (trx.id?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (trx.method?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (trx.status?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "All" || trx.keterangan?.toLowerCase() === selectedType.toLowerCase();
    return matchesSearch && matchesType;
  }).sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ChevronLeft size={16} /> Back to Finance Dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
            <Receipt size={24} />
          </div>
          Full Transaction Log
        </h1>
        <p className="text-muted-foreground font-medium mt-2 max-w-2xl">
          Complete log of all processed financial transactions.
        </p>
      </div>

      <m.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-[2.5rem] shadow-sm border border-border"
      >
        <div className="p-4 md:p-6 lg:p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 w-full md:w-auto flex flex-col md:flex-row items-center gap-4 md:gap-2">
            <div className="relative w-full md:w-96 shrink-0 h-fit">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ID, method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted border-none rounded-full pl-10 pr-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            <span className="text-xs font-bold text-muted-foreground bg-muted px-4 py-3 rounded-full border border-border shadow-sm shrink-0">
              Showing {filteredTransactions.length} transactions
            </span>
          </div>
        </div>

        <div className="p-0 sm:p-4">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground font-medium animate-pulse">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-medium">No transactions found.</div>
            ) : (
              filteredTransactions.map((trx: any, index: number) => (
                <div
                  key={`${trx.id}-${index}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted dark:hover:bg-muted/30 transition-all cursor-pointer rounded-2xl"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                      {trx.type === 'qris' ? <QrCode size={20} /> : <Building2 size={20} />}
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-bold text-foreground">{trx.method}</p>
                      <p className="text-[10px] md:text-xs font-mono font-bold text-muted-foreground mt-0.5">{trx.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base md:text-lg font-black text-foreground">{trx.amount}</p>
                    <p className="text-[10px] md:text-xs font-medium text-muted-foreground">
                      {typeof trx.timestamp === 'object' && trx.timestamp !== null ? (trx.timestamp as Date).toLocaleString('id-ID') : trx.timestamp}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </m.section>
    </div>
  );
}
