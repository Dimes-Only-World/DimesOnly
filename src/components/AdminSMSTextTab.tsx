import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Section = { title: string; text: string };

const DEFAULT_TITLES = [
  "Greetings",
  "More Info",
  "How does it work?",
  "What is this?",
  "Is this a pyramid scheme?",
  "How much money can I make?",
];

const STORAGE_KEY = "admin_sms_sections";
const LEGACY_KEY = "admin_sms_templates";

const loadSections = (): Section[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s?.title === "string")) {
        return parsed as Section[];
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) {
        return DEFAULT_TITLES.map((title, i) => ({ title, text: parsed[i] ?? "" }));
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_TITLES.map((title) => ({ title, text: "" }));
};

const AdminSMSTextTab: React.FC = () => {
  const [sections, setSections] = useState<Section[]>(loadSections);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  const persist = (next: Section[]) => {
    setSections(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const updateSection = (index: number, patch: Partial<Section>) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    persist(next);
  };

  const addSection = () => {
    const next = [...sections, { title: "New Section", text: "" }];
    persist(next);
    setOpenItem(`item-${next.length - 1}`);
  };

  const removeSection = (index: number) => {
    persist(sections.filter((_, i) => i !== index));
    setOpenItem(undefined);
  };

  const handleCopy = async (index: number) => {
    const text = sections[index]?.text || "";
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
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>SMS Text Templates</CardTitle>
        <Button type="button" size="sm" onClick={addSection}>
          <Plus className="w-4 h-4 mr-1" /> Add Section
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Add sections, rename their titles, and enter your message text. Use the copy button to
          paste into your texting app. Everything is saved in this browser.
        </p>

        <Accordion
          type="single"
          collapsible
          value={openItem}
          onValueChange={setOpenItem}
          className="w-full"
        >
          {sections.map((section, index) => (
            <AccordionItem key={`item-${index}`} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {section.title || "Untitled Section"}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(index, { title: e.target.value })}
                      placeholder="Section title"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(index)}
                      aria-label="Delete section"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea
                    value={section.text}
                    onChange={(e) => updateSection(index, { text: e.target.value })}
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
                      disabled={!section.text?.trim()}
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
                      {section.text?.length || 0} characters
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
