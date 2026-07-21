import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";

export type ThemedPackage = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  price: number;
  is_active: boolean;
};

type Props = {
  selected: string[];
  onChange: (ids: string[]) => void;
};

const ThemedPackageSelector: React.FC<Props> = ({ selected, onChange }) => {
  const [packages, setPackages] = useState<ThemedPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("themed_packages")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });
        if (error) throw error;
        setPackages(data || []);
      } catch (e) {
        console.error("Load themed packages failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  if (loading) return null;
  if (!packages.length) return null;

  const addonTotal = packages
    .filter((p) => selected.includes(p.id))
    .reduce((s, p) => s + Number(p.price || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Themed Experiences</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {packages.map((p) => {
          const isOn = selected.includes(p.id);
          return (
            <Card
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`cursor-pointer transition-colors border ${
                isOn
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-card/40 hover:border-primary/50"
              }`}
            >
              <CardContent className="p-3 flex gap-2 items-start">
                <Checkbox checked={isOn} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-medium">
                      {p.icon ? `${p.icon} ` : ""}
                      {p.name}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      +${Number(p.price || 0).toLocaleString()}
                    </p>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {addonTotal > 0 && (
        <p className="text-xs text-primary text-right">
          Add-ons subtotal: +${addonTotal.toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default ThemedPackageSelector;
