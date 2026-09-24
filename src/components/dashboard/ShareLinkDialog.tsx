import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share2, Facebook, MessageSquare, Copy, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  username?: string;
}

export const markLinkShared = (userId?: string) => {
  if (!userId) return;
  localStorage.setItem(`dimes-shared-link-${userId}`, "1");
  window.dispatchEvent(new Event("dimes-checklist-updated"));
};

const ShareLinkDialog: React.FC<Props> = ({ open, onOpenChange, userId, username }) => {
  const { toast } = useToast();
  const link = `https://DimesOnly.World?ref=${encodeURIComponent(username || "")}`;
  const text = `Join me on Dimes Only World ${link}`;

  const act = (fn: () => void | Promise<void>) => async () => {
    markLinkShared(userId);
    try {
      await fn();
    } catch {
      /* cancelled */
    }
    onOpenChange(false);
  };

  const enc = encodeURIComponent;
  const openUrl = (u: string): void => { window.open(u, "_blank", "noopener"); };
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: link });
  };

  const buttons = [
    {
      label: "Share",
      Icon: Share2,
      cls: "border border-border bg-background",
      onClick: act(async () => {
        if ((navigator as any).share) await navigator.share({ title: "Dimes Only World", text });
        else await copy();
      }),
    },
    { label: "Facebook", Icon: Facebook, cls: "bg-[#2563eb] text-white", onClick: act(() => openUrl(`https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`)) },
    {
      label: "Instagram",
      Icon: Instagram,
      cls: "bg-[#db2777] text-white",
      onClick: act(async () => {
        await copy();
        openUrl("https://www.instagram.com/");
      }),
    },
    { label: "Contacts", Icon: MessageSquare, cls: "border border-border bg-background", onClick: act(() => { window.location.href = `sms:?&body=${enc(text)}`; }) },
    { label: "WhatsApp", Icon: null, cls: "bg-[#22c55e] text-white", onClick: act(() => openUrl(`https://wa.me/?text=${enc(text)}`)) },
    { label: "Telegram", Icon: null, cls: "bg-[#60a5fa] text-white", onClick: act(() => openUrl(`https://t.me/share/url?url=${enc(link)}&text=${enc("Join me on Dimes Only World")}`)) },
    { label: "X", Icon: null, cls: "bg-[#0284c7] text-white", onClick: act(() => openUrl(`https://twitter.com/intent/tweet?text=${enc(text)}`)) },
    { label: "Email", Icon: null, cls: "bg-[#ef4444] text-white", onClick: act(() => { window.location.href = `mailto:?subject=${enc("Join me on Dimes Only World")}&body=${enc(text)}`; }) },
    { label: "Copy link", Icon: Copy, cls: "border border-border bg-background", onClick: act(copy) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share your link</DialogTitle>
        </DialogHeader>
        <p className="break-all rounded-md bg-muted px-3 py-2 text-xs">{link}</p>
        <div className="grid grid-cols-2 gap-2">
          {buttons.map(({ label, Icon, onClick, cls }) => (
            <button
              key={label}
              onClick={onClick}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold hover:opacity-90 ${cls}`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLinkDialog;
