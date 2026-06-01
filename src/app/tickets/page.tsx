import { Metadata } from"next";
import { getTickets } from"@/actions/tickets";
import { TicketsKanban } from"@/components/tickets/TicketsKanban";
import { LifeBuoy } from"lucide-react";

export const metadata: Metadata = {
 title:"Trouble Tickets | ISP-FinTrack",
 description:"Network operations center (NOC) ticketing system.",
};

export default async function TicketsPage() {
 const tickets = await getTickets();

 return (
 <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
 <div className="mb-6 sm:mb-8">
 <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2 sm:gap-3">
 <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
 <LifeBuoy className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <span className="truncate">NOC Trouble Tickets</span>
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mt-3 sm:mt-2">
 <span className="sm:hidden">Update tickets via buttons or drag. Synced in real-time.</span>
 <span className="hidden sm:inline">Update ticket status by clicking the action buttons or dragging them. All status changes are synced in real-time with the central database.</span>
 </p>
 </div>

 <TicketsKanban initialTickets={tickets} />
 </div>
 );
}
