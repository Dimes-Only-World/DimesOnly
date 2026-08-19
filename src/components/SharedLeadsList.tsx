import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SharedLead {
  id: string;
  full_name: string;
  area_code: string;
  status: "complete" | "incomplete" | "more_info";
  created_at: string;
}

const PAGE_SIZE = 50;

const STATUS_STYLES: Record<SharedLead["status"], { label: string; className: string }> = {
  complete: { label: "Complete", className: "bg-green-600 text-white hover:bg-green-600" },
  incomplete: { label: "Incomplete", className: "bg-red-600 text-white hover:bg-red-600" },
  more_info: { label: "More Info", className: "bg-yellow-500 text-black hover:bg-yellow-500" },
};

const SharedLeadsList: React.FC = () => {
  const [leads, setLeads] = useState<SharedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-data", {
        body: { action: "fetchSharedLeads" },
      });
      if (error) throw error;
      setLeads(data?.data || []);
    } catch (err) {
      console.error(err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = leads.filter(
    (l) => !q || l.full_name.toLowerCase().includes(q) || l.area_code.includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Shared Leads
        </CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search by name or area code"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading leads...</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads to show yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Phone</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{lead.full_name}</td>
                      <td className="py-2 pr-4">{lead.area_code}</td>
                      <td className="py-2 pr-4">
                        <Badge className={STATUS_STYLES[lead.status].className}>
                          {STATUS_STYLES[lead.status].label}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {current * PAGE_SIZE + 1}-{current * PAGE_SIZE + visible.length} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current >= totalPages - 1}
                  onClick={() => setPage(current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SharedLeadsList;
