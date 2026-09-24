import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share2, Facebook, MessageSquare, Copy } from "lucide-react";
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

  const buttons = [
    ...(typeof navigator !== "undefined" && (navigator as any).share
      ? [{ label: "Share", Icon: Share2, onClick: act(() => navigator.share({ title: "Dimes Only World", text })) }]
      : []),
    {
      label: "Facebook",
      Icon: Facebook,
      onClick: act(() => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank", "noopener");
      }),
    },
    {
      label: "Text",
      Icon: MessageSquare,
      onClick: act(() => {
        window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
      }),
    },
    {
      label: "Copy link",
      Icon: Copy,
      onClick: act(async () => {
        await navigator.clipboard.writeText(link);
        toast({ title: "Link copied", description: link });
      }),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share your link</DialogTitle>
        </DialogHeader>
        <p className="break-all rounded-md bg-muted px-3 py-2 text-xs">{link}</p>
        <div className="grid grid-cols-2 gap-2">
          {buttons.map(({ label, Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex flex-col items-center gap-1 rounded-lg border border-border p-3 text-sm font-semibold hover:bg-muted"
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLinkDialog;
