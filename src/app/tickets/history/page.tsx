import { Metadata } from"next";
import { getResolvedHistoryTickets } from"@/actions/tickets";
import { TicketsHistoryClient } from"../../../components/tickets/TicketsHistoryClient";
import { History, ChevronLeft } from"lucide-react";
import Link from"next/link";

export const metadata: Metadata = {
 title:"Resolved History | ISP-FinTrack",
 description:"History of resolved and closed tickets.",
};

export default async function TicketsHistoryPage() {
 const historyTickets = await getResolvedHistoryTickets();

 return (
 <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
 <div className="mb-8">
 <Link href="/tickets"className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-4 transition-colors">
 <ChevronLeft size={16} /> Back to Tickets List
 </Link>
 <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
 <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
 <History size={24} />
 </div>
 Resolved Tickets History
 </h1>
 <p className="text-muted-foreground font-medium mt-2 max-w-2xl">
 Complete log of all resolved and closed trouble tickets from previous days.
 </p>
 </div>

 <TicketsHistoryClient tickets={historyTickets as any[]} />
 </div>
 );
}
