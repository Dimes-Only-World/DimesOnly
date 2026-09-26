import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileImage } from "lucide-react";
import firstFlyer from "@/assets/flyers/dimes-only-world-flyer.png.asset.json";

const FALLBACK: Flyer[] = [{ id: "default", title: "Dimes Only World — Now Recruiting", url: firstFlyer.url }];

interface Flyer { id: string; title: string; url: string }

const downloadFile = async (url: string, name: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name || "dimes-only-flier"}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch {
    window.open(url, "_blank");
  }
};

const MakeMoneyFlyers: React.FC = () => {
  const [flyers, setFlyers] = useState<Flyer[]>(FALLBACK);
  useEffect(() => {
    supabase.functions
      .invoke("make-money", { body: { action: "listFlyers" } })
      .then(({ data, error }) => {
        if (error) console.error("Fliers failed to load", error);
        setFlyers(data?.flyers?.length ? data.flyers : FALLBACK);
      })
      .catch(() => setFlyers(FALLBACK));
  }, []);
  return (
    <Card className="border border-border" id="fliers">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileImage className="w-5 h-5" /> Downloadable Fliers
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {flyers.map((f) => (
          <div key={f.id} className="flex flex-col gap-2">
            <img src={f.url} alt={f.title || "Flier"} className="w-full rounded-lg border border-border object-contain bg-muted" loading="lazy" />
            {f.title && <p className="text-sm font-medium text-foreground">{f.title}</p>}
            <Button onClick={() => downloadFile(f.url, f.title.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase())} className="w-full">
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MakeMoneyFlyers;
