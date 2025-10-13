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
import { Loader2, Send } from "lucide-react";

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
        const { data: recipientData, error: recipientError } = await supabase
          .from("users")
          .select("id, username, profile_photo, membership_tier")
          .eq("username", recipientUsername)
          .single();

        if (recipientError || !recipientData) {
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg w-full p-0 bg-transparent border-none">
        <div className="flex h-[75vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b">
            <div className="flex items-center gap-3">
              <img
                src={recipient?.profile_photo || defaultAvatar}
                alt={recipient?.username || "Performer"}
                className="h-12 w-12 rounded-full object-cover border"
              />
              <div className="flex flex-1 flex-col">
                <DialogTitle className="text-lg font-semibold capitalize">
                  {recipient?.username || recipientUsername}
                </DialogTitle>
                {headerBadge && (
                  <Badge className="mt-1 w-fit bg-blue-600 text-white">
                    {headerBadge}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4 space-y-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading conversation...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Start the conversation by sending a message.
              </div>
            ) : (
              messages.map((message) => {
                const isCurrentUser = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isCurrentUser && (
                      <img
                        src={recipient?.profile_photo || defaultAvatar}
                        alt={recipient?.username || "User"}
                        className="h-8 w-8 rounded-full object-cover border"
                      />
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow ${
                        isCurrentUser
                          ? "rounded-br-sm bg-blue-600 text-white"
                          : "rounded-bl-sm bg-white text-gray-800 border"
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.message}
                      </div>
                      <div
                        className={`mt-1 text-[10px] ${
                          isCurrentUser ? "text-blue-100" : "text-gray-400"
                        }`}
                      >
                        {message.created_at
                          ? new Date(message.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </div>
                    {isCurrentUser && (
                      <img
                        src={user?.profilePhoto || defaultAvatar}
                        alt={user?.username || "Me"}
                        className="h-8 w-8 rounded-full object-cover border"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-end gap-3 border-t bg-white px-5 py-4">
            <Textarea
              placeholder="Type a message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              className="flex-1 resize-none"
              disabled={sending || loading || !recipient}
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !input.trim() || !recipient}
              className="flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DirectMessageModal;