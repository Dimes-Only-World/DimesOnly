import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Rocket } from "lucide-react";

const toInputValue = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const AdminAppLaunchSettings: React.FC = () => {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-data", {
      body: { action: "getAppSetting", params: { key: "app_public_launch_at" } },
    });
    if (!error) setValue(toInputValue(data?.data?.value?.value ?? null));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const iso = value ? new Date(`${value}T00:00:00Z`).toISOString() : null;
    const { error } = await supabase.functions.invoke("admin-data", {
      body: {
        action: "setAppSetting",
        params: { key: "app_public_launch_at", value: { value: iso } },
      },
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Saved",
      description: iso
        ? "The 3-year free memberships now run from this launch date."
        : "Launch date cleared — free memberships have not started yet.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          App Public Launch Date
        </CardTitle>
        <CardDescription>
          The 3-year free Silver / Diamond memberships do not start until this date. Leave empty
          while the app is still pre-launch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="launch-date">Launch date</Label>
          <Input
            id="launch-date"
            type="date"
            value={value}
            disabled={loading}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving..." : "Save launch date"}
          </Button>
          <Button variant="outline" onClick={() => setValue("")} disabled={saving || loading}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAppLaunchSettings;
