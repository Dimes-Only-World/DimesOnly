import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  referral_code: string | null;
  action_taken: string;
  created_at: string;
  registration_completed?: boolean;
  registered_username?: string | null;
  registered_at?: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  submitted: "Form submitted",
  continued_registration: "Continued registration",
  more_information: "More information",
};


const AdminLeadsTab: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const getAdminUserId = () => {
    const data = sessionStorage.getItem("adminUser");
    return data ? JSON.parse(data).id : null;
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "fetchAgeGateLeads", adminUserId: getAdminUserId() },
      });
      if (error) throw error;
      setLeads(data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filtered = leads.filter((l) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.full_name.toLowerCase().includes(q) ||
      l.phone.toLowerCase().includes(q) ||
      (l.referral_code || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Home Page Leads</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Visitors who filled out the intro form on the home page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search by name, phone or referrer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading leads...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Phone</th>
                  <th className="py-2 pr-4 font-medium">Date of Birth</th>
                  <th className="py-2 pr-4 font-medium">Referrer</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Registration</th>
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>

                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{lead.full_name}</td>
                    <td className="py-2 pr-4">{lead.phone}</td>
                    <td className="py-2 pr-4">{lead.date_of_birth}</td>
                    <td className="py-2 pr-4">{lead.referral_code || "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={lead.action_taken === "continued_registration" ? "default" : "secondary"}>
                        {ACTION_LABEL[lead.action_taken] || lead.action_taken}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {lead.registration_completed ? (
                        <Badge className="bg-green-600 text-white hover:bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                          {lead.registered_username ? ` · ${lead.registered_username}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Incomplete</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">

                      {new Date(lead.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminLeadsTab;
