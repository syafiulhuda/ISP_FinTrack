import { ReactNode } from"react";
import { cn } from"@/lib/utils";
import { m, AnimatePresence } from"framer-motion";

interface Column<T> {
 header: string;
 accessor: keyof T | ((item: T) => ReactNode);
 className?: string;
 render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
 data: T[];
 columns: Column<T>[];
 keyExtractor: (item: T) => string | number;
 isLoading?: boolean;
 emptyMessage?: string;
 className?: string;
 rowClassName?: string | ((item: T) => string);
}

export function DataTable<T>({ 
 data, 
 columns, 
 keyExtractor, 
 isLoading, 
 emptyMessage ="No data found",
 className,
 rowClassName
}: DataTableProps<T>) {
 return (
 <div className={cn("overflow-x-auto no-scrollbar", className)}>
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-border">
 {columns.map((col, i) => (
 <th 
 key={i} 
 className={cn(
"px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest",
 col.className
 )}
 >
 {col.header}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
 <AnimatePresence>
 {isLoading ? (
 <tr>
 <td colSpan={columns.length} className="px-6 py-12 text-center">
 <div className="flex flex-col items-center gap-3">
 <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading data...</p>
 </div>
 </td>
 </tr>
 ) : data.length === 0 ? (
 <tr>
 <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
 {emptyMessage}
 </td>
 </tr>
 ) : (
 data.map((item, idx) => (
 <m.tr 
 key={keyExtractor(item)}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.05 }}
 className={cn(
"group hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors",
 typeof rowClassName ==='function'? rowClassName(item) : rowClassName
 )}
 >
 {columns.map((col, i) => (
 <td key={i} className={cn("px-6 py-4", col.className)}>
 {col.render 
 ? col.render(item) 
 : typeof col.accessor ==='function'
 ? col.accessor(item) 
 : (item[col.accessor] as ReactNode)
 }
 </td>
 ))}
 </m.tr>
 ))
 )}
 </AnimatePresence>
 </tbody>
 </table>
 </div>
 );
}
export default DataTable;
