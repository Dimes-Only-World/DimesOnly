import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

type Tier = "diamond_plus" | "silver_plus" | "elite_plus";

interface AgreementRow {
  id: string;
  user_id: string;
  username: string | null;
  tier: string;
  agreed_at: string;
  verification_status: string;
  id_document_url: string | null;
  selfie_url: string | null;
}

interface Props {
  tier: Tier;
  title: string;
}

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500 text-black",
  verified: "bg-green-600 text-white",
  invalid: "bg-red-600 text-white",
};

const AdminMembershipAgreementsTab: React.FC<Props> = ({ tier, title }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const adminUserId = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("adminUser") || "{}")?.id ?? null;
    } catch {
      return null;
    }
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "fetchMembershipAgreements", adminUserId, tier },
      });
      if (error) throw error;
      const payload: any = data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : [];
      setRows(list as AgreementRow[]);
    } catch (e: any) {
      toast({
        title: "Failed to load agreements",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [adminUserId, tier, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-data", {
        body: { action: "updateMembershipAgreementStatus", adminUserId, id, status },
      });
      if (error) throw error;
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, verification_status: status } : r))
      );
      toast({ title: "Status updated" });
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const filtered = rows.filter((r) =>
    (r.username || "").toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search username"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading agreements...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No signed agreements yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">Agreement Date &amp; Time</th>
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Selfie w/ ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b align-middle">
                    <td className="py-2 pr-4 font-medium">{r.username || r.user_id}</td>
                    <td className="py-2 pr-4">{new Date(r.agreed_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      {r.id_document_url ? (
                        <a
                          href={r.id_document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          View ID
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {r.selfie_url ? (
                        <a href={r.selfie_url} target="_blank" rel="noreferrer">
                          <img
                            src={r.selfie_url}
                            alt={`Verification selfie for ${r.username || "member"}`}
                            className="h-14 w-14 object-cover rounded border"
                          />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge className={statusColor[r.verification_status] || ""}>
                        {r.verification_status}
                      </Badge>
                    </td>
                    <td className="py-2 space-x-2 whitespace-nowrap">
                      <Button size="sm" onClick={() => setStatus(r.id, "verified")}>
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setStatus(r.id, "invalid")}
                      >
                        Invalid
                      </Button>
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

export default AdminMembershipAgreementsTab;
