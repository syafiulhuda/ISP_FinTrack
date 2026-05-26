import { Metadata } from "next";
import { getTickets } from "@/actions/tickets";
import { TicketsKanban } from "@/components/tickets/TicketsKanban";
import { LifeBuoy } from "lucide-react";

export const metadata: Metadata = {
  title: "Trouble Tickets | ISP-FinTrack",
  description: "Network operations center (NOC) ticketing system.",
};

export default async function TicketsPage() {
  const tickets = await getTickets();

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
            <LifeBuoy size={24} />
          </div>
          NOC Trouble Tickets
        </h1>
        <p className="text-slate-500 font-medium mt-2 max-w-2xl">
          Drag and drop tickets to update their resolution status. All status changes are synced in real-time with the central database.
        </p>
      </div>

      <TicketsKanban initialTickets={tickets} />
    </div>
  );
}
