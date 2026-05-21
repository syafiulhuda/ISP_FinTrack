import { m, AnimatePresence } from "framer-motion";
import { X, Plus, ChevronDown } from "lucide-react";

export function InventoryModals({ inventory }: { inventory: any }) {
  const {
    isRegisterModalOpen,
    setIsRegisterModalOpen,
    newAsset,
    setNewAsset,
    warehouses,
    handleRegisterAsset
  } = inventory;

  return (
    <>
      <AnimatePresence>
        {isRegisterModalOpen && (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegisterModalOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[90]"
            />
            
            <div className="fixed top-0 right-0 z-[100] p-0 pointer-events-none w-full h-[100dvh] md:w-auto md:h-auto flex justify-end">
              <m.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full h-[100dvh] md:max-w-md bg-white dark:bg-slate-900 md:h-fit md:max-h-screen shadow-[-20px_20px_60px_rgba(0,0,0,0.15)] rounded-none md:rounded-bl-[3.5rem] border-none md:border-l md:border-b border-slate-200 dark:border-slate-800 p-6 md:p-10 pointer-events-auto flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Register Asset</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Add hardware to infrastructure.</p>
                  </div>
                  <m.button
                    aria-label="Close Modal"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <X size={24} />
                  </m.button>
                </div>
                
                <form onSubmit={handleRegisterAsset} className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-1">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="sn" className="text-[10px] font-black uppercase text-slate-400 px-1">Serial Number</label>
                      <input id="sn" required type="text" placeholder="SN-..." className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={newAsset.sn} onChange={e => setNewAsset({...newAsset, sn: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="mac" className="text-[10px] font-black uppercase text-slate-400 px-1">MAC Address</label>
                      <input id="mac" required type="text" placeholder="00:1A:..." className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={newAsset.mac} onChange={e => setNewAsset({...newAsset, mac: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="deviceType" className="text-[10px] font-black uppercase text-slate-400 px-1">Device Type</label>
                      <div className="relative">
                        <select id="deviceType" className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none" value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})}>
                          <option value="Router">Router</option>
                          <option value="Switch">Switch</option>
                          <option value="OLT">OLT</option>
                          <option value="ONT">ONT</option>
                          <option value="Server">Server</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="location" className="text-[10px] font-black uppercase text-slate-400 px-1">Location / Warehouse</label>
                      <div className="relative">
                        <select 
                          id="location"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none" 
                          value={newAsset.location} 
                          onChange={e => {
                            const wh = warehouses.find((w: any) => w.location === e.target.value);
                            if (wh) {
                              setNewAsset({
                                ...newAsset, 
                                location: wh.location,
                                latitude: Number(wh.latitude),
                                longitude: Number(wh.longitude)
                              });
                            }
                          }}
                        >
                          <option value="" disabled>Select Warehouse</option>
                          {warehouses.map((wh: any) => (
                            <option key={wh.id} value={wh.location}>
                              {wh.location} ({wh.city})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                    <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all hover:opacity-90 flex items-center justify-center gap-2">
                      <Plus size={18} /> Register Asset
                    </button>
                    <button 
                      type="button" 
                      aria-label="Close Modal" 
                      onClick={() => setIsRegisterModalOpen(false)} 
                      className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm transition-all hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </m.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
