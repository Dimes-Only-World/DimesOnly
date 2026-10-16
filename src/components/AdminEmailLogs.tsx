import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { getAdminUserId } from "@/lib/adminAuth";

interface EmailLogRow {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  category: string | null;
  subject: string | null;
  status: string;
  status_code: number | null;
  error: string | null;
  created_at: string;
}

const AdminEmailLogs: React.FC = () => {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const adminUserId = getAdminUserId();
      if (!adminUserId) throw new Error("Admin session expired");
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "fetchEmailLogs", adminUserId },
      });
      if (error) throw error;
      setRows(((data as { data?: EmailLogRow[] })?.data) || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load email log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.recipient_email, r.recipient_name, r.subject, r.category].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [rows, q]);

  const sent = rows.filter((r) => r.status === "sent").length;

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Email Delivery Log</CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {sent} sent · {rows.length - sent} failed (latest {rows.length}). "Sent" means the email service accepted it; it may still land in Promotions or Spam.
        </p>
        <Input placeholder="Search email, name or subject" value={q} onChange={(e) => setQ(e.target.value)} />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="max-h-[32rem] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left">
                <th className="p-2">When</th>
                <th className="p-2">Recipient</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">
                    <div className="font-medium break-all">{r.recipient_email}</div>
                    {r.recipient_name && <div className="text-muted-foreground">{r.recipient_name}</div>}
                  </td>
                  <td className="p-2">
                    <div>{r.subject}</div>
                    <div className="text-xs text-muted-foreground">{r.category}</div>
                  </td>
                  <td className="p-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "sent" ? "bg-primary/15 text-primary" : r.status === "skipped" ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive"}`}>
                      {r.status === "sent" ? "Sent" : r.status === "skipped" ? "Skipped (bounced)" : "Failed"}
                    </span>
                    {r.error && <div className="mt-1 max-w-xs break-words text-xs text-destructive">{r.error}</div>}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No emails logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminEmailLogs;
