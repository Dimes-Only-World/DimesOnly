import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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
  const { user } = useAppContext();
  const [leads, setLeads] = useState<SharedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-data", {
        body: { action: "fetchSharedLeads", userId: user?.id },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const q = search.trim().toLowerCase();
  const filtered = leads.filter(
    (l) => !q || l.full_name.toLowerCase().includes(q) || l.area_code.includes(q)
  );
  const total = filtered.length;
  const completeCount = filtered.filter((l) => l.status === "complete").length;
  const incompleteCount = filtered.filter((l) => l.status === "incomplete").length;
  const moreInfoCount = filtered.filter((l) => l.status === "more_info").length;
  const pct = (n: number) => (total ? ((n / total) * 100).toFixed(1) : "0.0");

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          My Leads
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

        {leads.length > 0 && <LeadProductionChart leads={filtered} />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-lg font-semibold">{total}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Incomplete</p>
            <p className="text-lg font-semibold text-red-500">
              {incompleteCount} <span className="text-sm">({pct(incompleteCount)}%)</span>
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">More Info</p>
            <p className="text-lg font-semibold text-yellow-500">
              {moreInfoCount} <span className="text-sm">({pct(moreInfoCount)}%)</span>
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Complete</p>
            <p className="text-lg font-semibold text-green-500">
              {completeCount} <span className="text-sm">({pct(completeCount)}%)</span>
            </p>
          </div>
        </div>

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
                    <th className="py-2 pr-4 font-medium">Area Code</th>
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

interface LeadProductionChartProps {
  leads: SharedLead[];
}

const LeadProductionChart: React.FC<LeadProductionChartProps> = ({ leads }) => {
  const data = React.useMemo(() => {
    const map = new Map<string, { total: number; complete: number; incomplete: number; more_info: number }>();
    for (const lead of leads) {
      const key = new Date(lead.created_at).toISOString().slice(0, 10);
      const bucket = map.get(key) || { total: 0, complete: 0, incomplete: 0, more_info: 0 };
      bucket.total += 1;
      bucket[lead.status] += 1;
      map.set(key, bucket);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, counts]) => ({
        date,
        Total: counts.total,
        Complete: counts.complete,
        Incomplete: counts.incomplete,
        "More Info": counts.more_info,
      }));
  }, [leads]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-md border p-4">
      <h4 className="text-sm font-medium mb-4">Lead Production Over Time</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Total" stackId="a" fill="#3B82F6" />
            <Bar dataKey="Complete" stackId="a" fill="#16A34A" />
            <Bar dataKey="Incomplete" stackId="a" fill="#DC2626" />
            <Bar dataKey="More Info" stackId="a" fill="#EAB308" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SharedLeadsList;
