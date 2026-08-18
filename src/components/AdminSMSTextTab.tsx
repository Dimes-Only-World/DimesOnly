import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const SECTION_TITLES = [
  "Greetings",
  "More Info",
  "How does it work?",
  "What is this?",
  "Is this a pyramid scheme?",
  "How much money can I make?",
];

const STORAGE_KEY = "admin_sms_templates";

const loadTemplates = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === SECTION_TITLES.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return SECTION_TITLES.map(() => "");
};

const AdminSMSTextTab: React.FC = () => {
  const [templates, setTemplates] = useState<string[]>(loadTemplates);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const persist = (next: string[]) => {
    setTemplates(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const handleChange = (index: number, value: string) => {
    const next = [...templates];
    next[index] = value;
    persist(next);
  };

  const handleCopy = async (index: number) => {
    const text = templates[index] || "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedIndex(index);
    toast.success("Copied!");
    setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Text Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Add your message text in each section, then use the copy button to paste it into your
          texting app. Templates are saved in this browser.
        </p>

        <Accordion type="multiple" className="w-full">
          {SECTION_TITLES.map((title, index) => (
            <AccordionItem key={title} value={`item-${index}`}>
              <AccordionTrigger className="text-left">{title}</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  <Textarea
                    value={templates[index]}
                    onChange={(e) => handleChange(index, e.target.value)}
                    placeholder="Enter your message text here…"
                    rows={6}
                    className="resize-y"
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(index)}
                      disabled={!templates[index]?.trim()}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-4 h-4 mr-1" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" /> Copy to Clipboard
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {templates[index]?.length || 0} characters
                    </span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default AdminSMSTextTab;
