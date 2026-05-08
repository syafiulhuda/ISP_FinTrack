import { getCustomer360 } from "@/actions/customers";
import CustomerDetailView from "@/components/customers/CustomerDetailView";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Customer 360: ${id} | ISP-FinTrack`,
    description: `Detailed business intelligence and financial analysis for customer ${id}.`,
  };
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  if (!id) notFound();

  const data = await getCustomer360(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <CustomerDetailView data={data} />
    </div>
  );
}
