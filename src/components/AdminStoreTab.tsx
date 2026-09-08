import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import AdminStoreProducts from "@/components/store-admin/AdminStoreProducts";
import AdminStoreOrders from "@/components/store-admin/AdminStoreOrders";
import {
  AdminStoreOverview,
  AdminStoreDiscounts,
  AdminStoreCustomers,
  AdminStoreSettings,
} from "@/components/store-admin/AdminStoreOps";

const SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "discounts", label: "Promo Codes" },
  { key: "settings", label: "Settings" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const AdminStoreTab: React.FC = () => {
  const [section, setSection] = useState<SectionKey>("overview");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={section === s.key ? "default" : "outline"}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </Button>
        ))}
      </div>
      {section === "overview" && <AdminStoreOverview />}
      {section === "products" && <AdminStoreProducts />}
      {section === "orders" && <AdminStoreOrders />}
      {section === "customers" && <AdminStoreCustomers />}
      {section === "discounts" && <AdminStoreDiscounts />}
      {section === "settings" && <AdminStoreSettings />}
    </div>
  );
};

export default AdminStoreTab;
