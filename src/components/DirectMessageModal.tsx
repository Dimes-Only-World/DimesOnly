import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import {
  Loader2,
  ArrowLeft,
  Phone,
  Video,
  Camera,
  Mic,
  Image as ImageIcon,
  Smile,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";


type DirectMessage = Tables<"direct_messages">;

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUsername: string | null;
}

interface RecipientProfile {
  id: string;
  username: string;
  profile_photo?: string | null;
  membership_tier?: string | null;
}

const defaultAvatar = "/placeholder.svg";

const prettyTier = (tier?: string | null) => {
  if (!tier) return null;
  return tier
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  recipientUsername,
}) => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [recipient, setRecipient] = useState<RecipientProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    const resetState = () => {
      setRecipient(null);
      setMessages([]);
      setInput("");
    };

    if (!isOpen) {
      resetState();
      return () => {
        if (subscription) {
          try {
            subscription.unsubscribe();
          } catch {}
        }
      };
    }

    if (!recipientUsername || !user?.id) {
      if (!user?.id) {
        toast({
          title: "Login required",
          description: "You need to sign in before you can send messages.",
          variant: "destructive",
        });
        onClose();
      }
      return () => {
        if (subscription) {
          try {
            subscription.unsubscribe();
          } catch {}
        }
      };
    }

    const loadThread = async () => {
      setLoading(true);
      try {
        // Try direct read first (may be blocked by RLS), then fall back to the
        // public-data edge function which resolves usernames case-insensitively.
        let recipientData: any = null;

        const direct = await supabase
          .from("users")
          .select("id, username, profile_photo, membership_tier")
          .ilike("username", recipientUsername)
          .maybeSingle();
        recipientData = direct.data;

        if (!recipientData) {
          const { data: fnData } = await supabase.functions.invoke("public-data", {
            body: { action: "fetchProfile", username: recipientUsername },
          });
          recipientData = (fnData as any)?.data ?? fnData ?? null;
          if (Array.isArray(recipientData)) recipientData = recipientData[0] ?? null;
        }

        if (!recipientData?.id) {
          toast({
            title: "Unable to start chat",
            description: "We could not find that performer.",
            variant: "destructive",
          });
          onClose();
          return;
        }

        const rawRecipient = recipientData as {
          id: string | number;
          username: string;
          profile_photo?: string | null;
          membership_tier?: string | null;
        };

        const recipientProfile: RecipientProfile = {
          id: String(rawRecipient.id),
          username: rawRecipient.username,
          profile_photo: rawRecipient.profile_photo ?? null,
          membership_tier: rawRecipient.membership_tier ?? null,
        };
        setRecipient(recipientProfile);

        const { data: threadData, error: threadError } = await supabase
          .from("direct_messages")
          .select("*")
          .in("sender_id", [user.id, recipientProfile.id])
          .in("recipient_id", [user.id, recipientProfile.id])
          .order("created_at", { ascending: true });

        if (threadError) throw threadError;

        setMessages((threadData as DirectMessage[]) ?? []);

        await supabase
          .from("direct_messages")
          .update({ is_read: true })
          .eq("recipient_id", user.id)
          .eq("sender_id", recipientProfile.id)
          .eq("is_read", false);

               subscription = supabase
          .channel(`dm_directory_${user.id}_${recipientProfile.id}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "direct_messages" },
            (payload) => {
              const row = payload.new as DirectMessage;
              if (
                (row.sender_id === user.id && row.recipient_id === recipientProfile.id) ||
                (row.sender_id === recipientProfile.id && row.recipient_id === user.id)
              ) {
                setMessages((prev) => {
                  if (prev.some((message) => message.id === row.id)) {
                    return prev;
                  }
                  return [...prev, row];
                });
                if (row.recipient_id === user.id) {
                  supabase.from("direct_messages").update({ is_read: true }).eq("id", row.id);
                }
              }
            }
          )
          .subscribe();
          
      } catch (error) {
        console.error("Failed to load chat thread:", error);
        toast({
          title: "Chat unavailable",
          description: "We could not open this conversation.",
          variant: "destructive",
        });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadThread();

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch {}
      }
    };
  }, [isOpen, recipientUsername, user?.id, onClose, toast]);

    const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user?.id || !recipient?.id) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: user.id,
          recipient_id: recipient.id,
          message: text,
          is_read: false,
        });

      if (error) throw error;

      setInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Message failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const headerBadge = useMemo(() => prettyTier(recipient?.membership_tier), [recipient]);

  const firstTimestamp = messages[0]?.created_at
    ? new Date(messages[0].created_at as string).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md w-full p-0 bg-transparent border-none [&>button]:hidden">
        <div className="flex h-[85vh] flex-col overflow-hidden rounded-2xl bg-black text-white shadow-2xl">
          {/* Top bar */}
          <DialogHeader className="space-y-0 px-3 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                aria-label="Back"
                className="p-1 text-white/90 hover:text-white"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-fuchsia-600 p-[2px]">
                <img
                  src={recipient?.profile_photo || defaultAvatar}
                  alt={recipient?.username || "Performer"}
                  className="h-10 w-10 rounded-full object-cover border-2 border-black"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <DialogTitle className="truncate text-base font-bold capitalize">
                  {recipient?.username || recipientUsername}
                </DialogTitle>
                <span className="truncate text-xs text-white/50">
                  @{recipient?.username || recipientUsername}
                </span>
              </div>
              <div className="flex items-center gap-4 text-white/90">
                <Phone className="h-5 w-5" />
                <Video className="h-5 w-5" />
              </div>
            </div>
          </DialogHeader>

          {/* Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {/* Profile intro block */}
            <div className="flex flex-col items-center gap-2 pb-4">
              <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-fuchsia-600 p-[3px]">
                <img
                  src={recipient?.profile_photo || defaultAvatar}
                  alt={recipient?.username || "Performer"}
                  className="h-20 w-20 rounded-full object-cover border-2 border-black"
                />
              </div>
              <p className="text-xl font-bold capitalize">
                {recipient?.username || recipientUsername}
              </p>
              <p className="text-sm text-white/60">
                @{recipient?.username || recipientUsername}
              </p>
              {headerBadge && (
                <Badge className="bg-white/10 text-white hover:bg-white/10">{headerBadge}</Badge>
              )}
              {recipient?.username && (
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${recipient.username}`);
                  }}
                  className="mt-2 rounded-lg bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  View profile
                </button>
              )}
            </div>

            {firstTimestamp && (
              <p className="text-center text-xs text-white/50">{firstTimestamp}</p>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8 text-white/60">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading conversation...
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/50">
                Start the conversation by sending a message.
              </div>
            ) : (
              messages.map((message) => {
                const isCurrentUser = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug ${
                        isCurrentUser
                          ? "bg-[#6E5BFF] text-white"
                          : "bg-[#262626] text-white"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{message.message}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 px-3 py-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#6E5BFF]">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-full bg-[#262626] px-4 py-2">
              <Textarea
                placeholder="Message..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="min-h-0 flex-1 resize-none border-none bg-transparent p-0 text-[15px] text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={sending || loading || !recipient}
              />
              {input.trim() ? (
                <Button
                  onClick={sendMessage}
                  disabled={sending || !recipient}
                  size="sm"
                  variant="ghost"
                  className="h-auto px-2 py-0 text-[#6E5BFF] hover:bg-transparent hover:text-[#8f81ff]"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              ) : (
                <div className="flex items-center gap-3 text-white/80">
                  <Mic className="h-5 w-5" />
                  <ImageIcon className="h-5 w-5" />
                  <Smile className="h-5 w-5" />
                  <Plus className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default DirectMessageModal;