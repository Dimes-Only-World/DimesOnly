import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Clock, CheckCircle, XCircle, Search, Eye, CheckCheck } from "lucide-react";

interface PayoutRequest {
  id: string;
  user_id: string;
  username: string;
  email: string;
  amount: number;
  payout_method: string;
  request_status: string | null;
  request_date: string | null;
  scheduled_payout_date: string | null;
  processed_date: string | null;
  notes: string | null;
  paypal_email: string | null;
  wire_bank_name: string | null;
  wire_routing_number: string | null;
  wire_account_number: string | null;
  wire_account_holder_name: string | null;
  wire_account_type: string | null;
  wire_swift_code: string | null;
  wire_bank_address: string | null;
  check_full_name: string | null;
  check_address_line1: string | null;
  check_address_line2: string | null;
  check_city: string | null;
  check_state: string | null;
  check_zip_code: string | null;
  check_country: string | null;
  cashapp_cashtag: string | null;
  cashapp_email: string | null;
  cashapp_phone: string | null;
  created_at: string | null;
}

const AdminPayoutTab: React.FC = () => {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const getAdminUserId = () => {
    const data = sessionStorage.getItem("adminUser");
    return data ? JSON.parse(data).id : null;
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "fetchPayoutRequests", adminUserId: getAdminUserId() },
      });
      if (error) throw error;
      setPayouts(data?.data || []);
    } catch (err: any) {
      toast.error("Failed to load payout requests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayouts(); }, []);

  const handleAction = async (action: string, requestId: string, extra: Record<string, string> = {}) => {
    setActionLoading(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action, adminUserId: getAdminUserId(), requestId, ...extra },
      });
      if (error) throw error;
      toast.success(`Payout request ${action.replace(/([A-Z])/g, " $1").toLowerCase()} successfully`);
      fetchPayouts();
    } catch (err: any) {
      toast.error("Action failed: " + (err.message || "Unknown error"));
    } finally {
      setActionLoading(null);
      setRejectDialogOpen(false);
      setRejectReason("");
    }
  };

  const filtered = payouts.filter((p) => {
    if (statusFilter !== "all" && p.request_status !== statusFilter) return false;
    if (search && !p.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredPending = filtered.filter((p) => p.request_status === "pending");

  const handleApproveAll = async () => {
    if (filteredPending.length === 0) return;
    setApproveAllLoading(true);
    try {
      await Promise.all(
        filteredPending.map((p) =>
          supabase.functions.invoke("admin-data", {
            body: { action: "approvePayoutRequest", adminUserId: getAdminUserId(), requestId: p.id },
          })
        )
      );
      toast.success(`Approved ${filteredPending.length} payout request(s)`);
      fetchPayouts();
    } catch (err: any) {
      toast.error("Bulk approve failed: " + (err.message || "Unknown error"));
    } finally {
      setApproveAllLoading(false);
    }
  };

  const summary = (status: string) => {
    const items = payouts.filter((p) => p.request_status === status);
    return { count: items.length, total: items.reduce((s, p) => s + p.amount, 0) };
  };

  const pending = summary("pending");
  const approved = summary("approved");
  const paid = summary("paid");

  const statusBadge = (status: string | null) => {
    const s = status || "pending";
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      paid: "bg-green-100 text-green-800",
    };
    return <Badge className={variants[s] || "bg-muted text-muted-foreground"}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
  };

  const methodLabel = (m: string) => {
    const map: Record<string, string> = { paypal: "PayPal", venmo: "Venmo", wire: "Wire Transfer", direct_deposit: "ACH/Direct Deposit", check: "Check" };
    return map[m] || m;
  };

  const methodSummary = (p: PayoutRequest) => {
    switch (p.payout_method) {
      case "paypal": return p.paypal_email || "—";
      case "venmo": return p.notes ? (() => { try { const n = JSON.parse(p.notes); return n.venmo_username || n.venmo_phone || "—"; } catch { return "See details"; } })() : "—";
      case "wire":
      case "direct_deposit": return p.wire_bank_name || "—";
      case "check": return `${p.check_full_name || ""}, ${p.check_city || ""}`;
      default: return "—";
    }
  };

  const renderMethodDetails = (p: PayoutRequest) => {
    switch (p.payout_method) {
      case "paypal":
        return <div><strong>PayPal Email:</strong> {p.paypal_email}</div>;
      case "wire":
      case "direct_deposit":
        return (
          <div className="space-y-1 text-sm">
            <div><strong>Bank:</strong> {p.wire_bank_name}</div>
            <div><strong>Account Holder:</strong> {p.wire_account_holder_name}</div>
            <div><strong>Account #:</strong> {p.wire_account_number}</div>
            <div><strong>Routing #:</strong> {p.wire_routing_number}</div>
            <div><strong>Type:</strong> {p.wire_account_type}</div>
            {p.wire_swift_code && <div><strong>SWIFT:</strong> {p.wire_swift_code}</div>}
            {p.wire_bank_address && <div><strong>Bank Address:</strong> {p.wire_bank_address}</div>}
          </div>
        );
      case "check":
        return (
          <div className="space-y-1 text-sm">
            <div><strong>Name:</strong> {p.check_full_name}</div>
            <div><strong>Address:</strong> {p.check_address_line1}{p.check_address_line2 ? `, ${p.check_address_line2}` : ""}</div>
            <div>{p.check_city}, {p.check_state} {p.check_zip_code}</div>
            {p.check_country && <div>{p.check_country}</div>}
          </div>
        );
      case "venmo":
        if (p.notes) {
          try { const n = JSON.parse(p.notes); return <div className="space-y-1 text-sm">{Object.entries(n).map(([k, v]) => <div key={k}><strong>{k}:</strong> {String(v)}</div>)}</div>; } catch {}
        }
        return <div>No details available</div>;
      default:
        return <div>{p.notes || "No details"}</div>;
    }
  };

  const renderActions = (p: PayoutRequest) => (
    <div className="flex gap-1 flex-wrap">
      <Button size="sm" variant="ghost" onClick={() => { setSelectedPayout(p); setDetailDialogOpen(true); }}>
        <Eye className="h-3 w-3" />
      </Button>
      {p.request_status === "pending" && (
        <>
          <Button size="sm" variant="default" disabled={actionLoading === p.id} onClick={() => handleAction("approvePayoutRequest", p.id)}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" disabled={actionLoading === p.id} onClick={() => { setSelectedPayout(p); setRejectDialogOpen(true); }}>
            Reject
          </Button>
        </>
      )}
      {p.request_status === "approved" && (
        <Button size="sm" variant="outline" disabled={actionLoading === p.id} onClick={() => handleAction("markPayoutPaid", p.id)}>
          Mark Paid
        </Button>
      )}
    </div>
  );

  /* ---- Mobile card for a single payout ---- */
  const renderMobileCard = (p: PayoutRequest) => (
    <Card key={p.id} className="md:hidden">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{p.username}</div>
            <div className="text-xs text-muted-foreground">{p.email}</div>
          </div>
          {statusBadge(p.request_status)}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">${p.amount.toFixed(2)}</span>
          <span className="text-muted-foreground">{methodLabel(p.payout_method)}</span>
        </div>
        <div className="text-xs text-muted-foreground truncate">{methodSummary(p)}</div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>Req: {p.request_date ? new Date(p.request_date).toLocaleDateString() : "—"}</span>
          <span>Sched: {p.scheduled_payout_date ? new Date(p.scheduled_payout_date).toLocaleDateString() : "—"}</span>
        </div>
        {renderActions(p)}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pending.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{pending.count} request{pending.count !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${approved.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{approved.count} request{approved.count !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paid.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{paid.count} request{paid.count !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by username..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Approve All */}
      {filteredPending.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleApproveAll} disabled={approveAllLoading} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            {approveAllLoading ? "Approving..." : `Approve All (${filteredPending.length})`}
          </Button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading payout requests...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No payout requests found.</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(renderMobileCard)}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Method</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Details</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Requested</th>
                  <th className="text-left p-3 font-medium hidden xl:table-cell">Scheduled</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{p.username}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="p-3 font-semibold">${p.amount.toFixed(2)}</td>
                    <td className="p-3">{methodLabel(p.payout_method)}</td>
                    <td className="p-3 text-xs max-w-[150px] truncate hidden lg:table-cell">{methodSummary(p)}</td>
                    <td className="p-3 text-xs hidden lg:table-cell">{p.request_date ? new Date(p.request_date).toLocaleDateString() : "—"}</td>
                    <td className="p-3 text-xs hidden xl:table-cell">{p.scheduled_payout_date ? new Date(p.scheduled_payout_date).toLocaleDateString() : "—"}</td>
                    <td className="p-3">{statusBadge(p.request_status)}</td>
                    <td className="p-3">{renderActions(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting payout for <strong>{selectedPayout?.username}</strong> — ${selectedPayout?.amount.toFixed(2)}
          </p>
          <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => selectedPayout && handleAction("rejectPayoutRequest", selectedPayout.id, { reason: rejectReason })}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>User:</strong> {selectedPayout.username}</div>
                <div><strong>Email:</strong> {selectedPayout.email}</div>
                <div><strong>Amount:</strong> ${selectedPayout.amount.toFixed(2)}</div>
                <div><strong>Method:</strong> {methodLabel(selectedPayout.payout_method)}</div>
                <div><strong>Status:</strong> {selectedPayout.request_status}</div>
                <div><strong>Requested:</strong> {selectedPayout.request_date ? new Date(selectedPayout.request_date).toLocaleDateString() : "—"}</div>
              </div>
              <hr />
              <h4 className="font-medium text-sm">Payment Method Details</h4>
              {renderMethodDetails(selectedPayout)}
              {selectedPayout.notes && !["venmo"].includes(selectedPayout.payout_method) && (
                <>
                  <hr />
                  <div><strong className="text-sm">Notes:</strong> <span className="text-sm">{selectedPayout.notes}</span></div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayoutTab;
