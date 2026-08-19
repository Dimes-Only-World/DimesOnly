import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, CheckCircle2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  referral_code: string | null;
  action_taken: string;
  created_at: string;
  deleted_at?: string | null;
  registration_completed?: boolean;
  registered_username?: string | null;
  registered_at?: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  submitted: "Form submitted",
  continued_registration: "Continued registration",
  more_information: "More information",
};

type View = "active" | "trash";

const AdminLeadsTab: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("active");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<null | { type: "permanent" | "empty"; ids?: string[] }>(null);
  const [displayFilter, setDisplayFilter] = useState<
    "all" | "incomplete" | "more_info" | "complete"
  >("all");

  const getAdminUserId = () => {
    const data = sessionStorage.getItem("adminUser");
    return data ? JSON.parse(data).id : null;
  };

  const fetchLeads = async (nextView: View = view) => {
    setLoading(true);
    setSelected([]);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "fetchAgeGateLeads", adminUserId: getAdminUserId(), view: nextView },
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
    fetchLeads(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const runAction = async (action: string, ids?: string[], successMsg?: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-data", {
        body: { action, adminUserId: getAdminUserId(), ids },
      });
      if (error) throw error;
      toast.success(successMsg || "Done");
      await fetchLeads(view);
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
    }
  };

  const searchFiltered = leads.filter((l) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.full_name.toLowerCase().includes(q) ||
      l.phone.toLowerCase().includes(q) ||
      (l.referral_code || "").toLowerCase().includes(q) ||
      (l.registered_username || "").toLowerCase().includes(q)
    );
  });

  const totalLeads = searchFiltered.length;
  const incompleteCount = searchFiltered.filter((l) => !l.registration_completed).length;
  const moreInfoCount = searchFiltered.filter((l) => l.action_taken === "more_information").length;
  const completeCount = searchFiltered.filter((l) => l.action_taken === "continued_registration").length;
  const pct = (count: number) => (totalLeads ? ((count / totalLeads) * 100).toFixed(1) : "0.0");

  const filtered = searchFiltered.filter((l) => {
    if (displayFilter === "all") return true;
    if (displayFilter === "incomplete") return !l.registration_completed;
    if (displayFilter === "more_info") return l.action_taken === "more_information";
    if (displayFilter === "complete") return l.action_taken === "continued_registration";
    return true;
  });

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const allSelected = paged.length > 0 && paged.every((l) => selected.includes(l.id));
  const toggleAll = () =>
    setSelected(allSelected ? [] : Array.from(new Set([...selected, ...paged.map((l) => l.id)])));
  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Home Page Leads</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Visitors who filled out the intro form on the home page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLeads(view)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="active">Active Leads</TabsTrigger>
            <TabsTrigger value="trash">Trash</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            variant={displayFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayFilter("all")}
            className="justify-between"
          >
            <span>Total Leads</span>
            <Badge variant="secondary">{totalLeads}</Badge>
          </Button>
          <Button
            variant={displayFilter === "incomplete" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayFilter(displayFilter === "incomplete" ? "all" : "incomplete")}
            className="justify-between"
          >
            <span>Incomplete</span>
            <Badge variant="secondary">{incompleteCount} ({pct(incompleteCount)}%)</Badge>
          </Button>
          <Button
            variant={displayFilter === "more_info" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayFilter(displayFilter === "more_info" ? "all" : "more_info")}
            className="justify-between"
          >
            <span>Need More Info</span>
            <Badge variant="secondary">{moreInfoCount} ({pct(moreInfoCount)}%)</Badge>
          </Button>
          <Button
            variant={displayFilter === "complete" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayFilter(displayFilter === "complete" ? "all" : "complete")}
            className="justify-between"
          >
            <span>Complete</span>
            <Badge variant="secondary">{completeCount} ({pct(completeCount)}%)</Badge>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name, phone or referrer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {selected.length > 0 && view === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => runAction("softDeleteAgeGateLeads", selected, "Moved to Trash")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Move {selected.length} to Trash
            </Button>
          )}
          {selected.length > 0 && view === "trash" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAction("restoreAgeGateLeads", selected, "Restored")}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Restore {selected.length}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirm({ type: "permanent", ids: selected })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selected.length} permanently
              </Button>
            </>
          )}
          {view === "trash" && leads.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="ml-auto"
              onClick={() => setConfirm({ type: "empty" })}
            >
              Empty Trash
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading leads...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {view === "trash" ? "Trash is empty." : "No leads yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Phone</th>
                  <th className="py-2 pr-4 font-medium">Date of Birth</th>
                  <th className="py-2 pr-4 font-medium">Referrer</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Registration</th>
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                  {view === "trash" && <th className="py-2 pr-4 font-medium">Deleted</th>}
                  <th className="py-2 pr-4 font-medium text-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Checkbox
                        checked={selected.includes(lead.id)}
                        onCheckedChange={() => toggleOne(lead.id)}
                        aria-label={`Select ${lead.full_name}`}
                      />
                    </td>
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
                        <Badge className="bg-red-600 text-white hover:bg-red-600">Incomplete</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleString()}
                    </td>
                    {view === "trash" && (
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {lead.deleted_at ? new Date(lead.deleted_at).toLocaleString() : "—"}
                      </td>
                    )}
                    <td className="py-2 pr-4 whitespace-nowrap text-right">
                      {view === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => runAction("softDeleteAgeGateLeads", [lead.id], "Moved to Trash")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => runAction("restoreAgeGateLeads", [lead.id], "Restored")}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirm({ type: "permanent", ids: [lead.id] })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "empty" ? "Empty the Trash?" : "Delete permanently?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "empty"
                ? "Every lead in the Trash will be permanently removed. This cannot be undone."
                : `${confirm?.ids?.length || 0} lead(s) will be permanently removed. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const c = confirm;
                setConfirm(null);
                if (!c) return;
                if (c.type === "empty") {
                  await runAction("emptyAgeGateLeadsTrash", undefined, "Trash emptied");
                } else {
                  await runAction("permanentlyDeleteAgeGateLeads", c.ids, "Deleted permanently");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminLeadsTab;
