export default function LoadingCustomerDetail() {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="h-10 w-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-48 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <div className="h-[400px] w-full rounded-[2rem] bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        <div>
          <div className="h-[400px] w-full rounded-[2rem] bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
