export default function FinanceAllLoading() {
  return (
    <div className="w-full h-full p-4 md:p-8 lg:p-12 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 skeleton-theme rounded-xl" />
            <div className="h-4 w-96 skeleton-theme rounded-lg" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 skeleton-theme rounded-xl" />
            <div className="h-10 w-32 skeleton-theme rounded-xl" />
          </div>
        </div>
        <div className="bg-card rounded-[2.5rem] p-8 shadow-sm border border-border h-[600px] w-full skeleton-theme" />
      </div>
    </div>
  );
}
