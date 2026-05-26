import { getCustomer360 } from "@/actions/customers";
import { getCustomerTickets } from "@/actions/tickets";
import CustomerDetailView from "@/components/customers/CustomerDetailView";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getCustomer360(id);
  
  return {
    title: data ? `${data.name} | Customer 360` : `Customer ${id} | ISP-FinTrack`,
    description: data 
      ? `Detailed analysis for ${data.name} (${data.service} plan) in ${data.city}.`
      : `Detailed business intelligence and financial analysis for customer ${id}.`,
  };
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  if (!id) notFound();

  const data = await getCustomer360(id);

  if (!data) {
    notFound();
  }

  const tickets = await getCustomerTickets(id);

  return (
    <div className="p-4 md:p-8">
      <CustomerDetailView data={data} initialTickets={tickets} />
    </div>
  );
}
