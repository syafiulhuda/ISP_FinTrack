import { Metadata } from "next";
import { InventoryAllClient } from "../_components/InventoryAllClient";

export const metadata: Metadata = {
  title: "All Assets | ISP-FinTrack",
  description: "Complete list of all network assets in the infrastructure.",
};

export default function InventoryAllPage() {
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <InventoryAllClient />
    </div>
  );
}
