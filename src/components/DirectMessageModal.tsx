import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import {
  Loader2,
  ArrowLeft,
  Camera,
  Mic,
  Image as ImageIcon,
  Smile,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDmSignedUrl } from "@/lib/dmMedia";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";


type DirectMessage = Tables<"direct_messages"> & {
  media_url?: string | null;
  media_type?: string | null;
  media_storage_path?: string | null;
};

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUsername: string | null;
  /** Optional: open a thread directly by user id (used by the dashboard tab). */
  recipientId?: string | null;
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
  recipientId,
}) => {
  const { user } = useAppContext();
  const navigate = useNavigate();

  const { toast } = useToast();
  const [recipient, setRecipient] = useState<RecipientProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    const resetState = () => {
      setRecipient(null);
      setMessages([]);
      setInput("");
      setMediaUrls({});
      setEmojiOpen(false);
      setAttachOpen(false);
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

    if ((!recipientUsername && !recipientId) || !user?.id) {
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
        let recipientData: any = null;

        if (recipientId) {
          const byId = await supabase
            .from("public_user_profiles")
            .select("id, username, profile_photo, membership_tier")
            .eq("id", recipientId)
            .maybeSingle();
          recipientData =
            byId.data || { id: recipientId, username: "Admin", profile_photo: null, membership_tier: "admin" };
        }

        if (!recipientData && recipientUsername) {
          const direct = await supabase
            .from("users")
            .select("id, username, profile_photo, membership_tier")
            .ilike("username", recipientUsername)
            .maybeSingle();
          recipientData = direct.data;
        }

        if (!recipientData && recipientUsername) {
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

        const loaded = (threadData as DirectMessage[]) ?? [];
        setMessages(loaded);
        refreshSignedUrls(loaded);

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
                  const updated = [...prev, row];
                  refreshSignedUrls(updated);
                  return updated;
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
  }, [isOpen, recipientUsername, recipientId, user?.id, onClose, toast]);

  const refreshSignedUrls = async (msgs: DirectMessage[]) => {
    const next: Record<string, string> = {};
    for (const msg of msgs) {
      if (msg.media_storage_path) {
        const url = await getDmSignedUrl(msg.media_storage_path);
        if (url) next[msg.id] = url;
      }
    }
    setMediaUrls((prev) => ({ ...prev, ...next }));
  };

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
        } as any);

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

  const uploadDmMedia = async (file: File, type: "photo" | "audio") => {
    if (!user?.id) throw new Error("You must be signed in.");
    const ext = type === "photo"
      ? (file.name.split(".").pop() || "jpg")
      : file.name.split(".").pop() || "webm";
    const path = `${user.id}/dm/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("private-media").upload(path, file, {
      contentType: file.type || (type === "photo" ? "image/jpeg" : "audio/webm"),
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const sendMediaMessage = async (file: File, type: "photo" | "audio") => {
    if (!recipient?.id || !user?.id) return;
    setUploadingMedia(true);
    try {
      const storagePath = await uploadDmMedia(file, type);
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        recipient_id: recipient.id,
        message: type === "photo" ? "📷 Photo" : "🎙️ Voice message",
        is_read: false,
        media_type: type,
        media_storage_path: storagePath,
      } as any);
      if (error) throw error;
    } catch (error) {
      console.error("Failed to send media message:", error);
      toast({
        title: "Send failed",
        description: error instanceof Error ? error.message : "Could not send attachment.",
        variant: "destructive",
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      await sendMediaMessage(file, "photo");
    }
  };

  const startRecording = async () => {
    if (!recipient?.id || !user?.id) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/webm")) mimeType = "audio/webm";
      else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
      else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blobType = mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: blobType });
        const ext = blobType.includes("mp4") ? "mp4" : blobType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: blobType });
        sendMediaMessage(file, "audio");
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setRecording(true);
    } catch (error) {
      console.error("Microphone access error:", error);
      toast({
        title: "Microphone unavailable",
        description: "Allow microphone access to send voice messages.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecorder(null);
    setRecording(false);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  const deleteMessage = async (message: DirectMessage) => {
    if (message.sender_id !== user?.id) return;
    if (!window.confirm("Delete this message? This cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .eq("id", message.id)
        .eq("sender_id", user.id);
      if (error) throw error;

      if (message.media_storage_path) {
        await supabase.storage.from("private-media").remove([message.media_storage_path]);
      }

      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      toast({ title: "Message deleted" });
    } catch (error) {
      console.error("Delete message error:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };


  const headerBadge = useMemo(() => prettyTier(recipient?.membership_tier), [recipient]);

  const firstTimestamp = messages[0]?.created_at
    ? new Date(messages[0].created_at as string).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const renderMessageContent = (message: DirectMessage) => {
    if (message.media_type === "photo" && mediaUrls[message.id]) {
      return (
        <img
          src={mediaUrls[message.id]}
          alt="Sent"
          className="max-w-full rounded-2xl"
          loading="lazy"
        />
      );
    }
    if (message.media_type === "audio" && mediaUrls[message.id]) {
      return (
        <div className="min-w-[180px] space-y-1">
          <audio controls preload="metadata" className="w-full">
            <source src={mediaUrls[message.id]} />
          </audio>
          <a
            href={mediaUrls[message.id]}
            target="_blank"
            rel="noreferrer"
            className="block text-[10px] underline opacity-70"
          >
            Open recording
          </a>
        </div>
      );
    }
    if (message.media_storage_path && !mediaUrls[message.id]) {
      return <div className="text-xs opacity-70">Loading attachment…</div>;
    }
    return <div className="whitespace-pre-wrap break-words">{message.message}</div>;
  };

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
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageFile}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />

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
                    className={`group flex items-center gap-2 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    {isCurrentUser && (
                      <button
                        onClick={() => deleteMessage(message)}
                        aria-label="Delete message"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/50 opacity-100 transition hover:bg-white/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <div
                      className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug ${
                        isCurrentUser
                          ? "bg-[#6E5BFF] text-white"
                          : "bg-[#262626] text-white"
                      }`}
                    >
                      {renderMessageContent(message)}
                    </div>
                  </div>

                );
              })
            )}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 px-3 py-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadingMedia || !recipient}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#6E5BFF] text-white hover:bg-[#5d4ce0] disabled:opacity-50"
              aria-label="Take photo"
            >
              <Camera className="h-5 w-5" />
            </button>

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
                disabled={sending || loading || !recipient || uploadingMedia}
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
                  <button
                    onClick={() => {
                      if (recording) {
                        stopRecording();
                      } else {
                        startRecording();
                      }
                    }}
                    disabled={uploadingMedia || !recipient}
                    className={`hover:text-white disabled:opacity-50 ${recording ? "text-red-400" : ""}`}
                    aria-label={recording ? "Stop recording" : "Record voice"}
                  >
                    <Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} />
                  </button>

                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingMedia || !recipient}
                    className="hover:text-white disabled:opacity-50"
                    aria-label="Attach photo"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>

                  <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="hover:text-white disabled:opacity-50"
                        aria-label="Insert emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="end"
                      className="w-auto p-0 border-none bg-transparent"
                    >
                      <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={onEmojiClick}
                        lazyLoadEmojis
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover open={attachOpen} onOpenChange={setAttachOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="hover:text-white disabled:opacity-50"
                        aria-label="More attachments"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="end"
                      className="w-48 p-2 border-white/10 bg-[#1a1a1a]"
                    >
                      <div className="grid grid-cols-2 gap-2 text-xs text-white">
                        <button
                          onClick={() => {
                            cameraInputRef.current?.click();
                            setAttachOpen(false);
                          }}
                          className="flex flex-col items-center gap-1 rounded-lg bg-[#262626] p-2 hover:bg-[#333]"
                        >
                          <Camera className="h-5 w-5" />
                          Camera
                        </button>
                        <button
                          onClick={() => {
                            galleryInputRef.current?.click();
                            setAttachOpen(false);
                          }}
                          className="flex flex-col items-center gap-1 rounded-lg bg-[#262626] p-2 hover:bg-[#333]"
                        >
                          <ImageIcon className="h-5 w-5" />
                          Photo
                        </button>
                        <button
                          onClick={() => {
                            if (recording) {
                              stopRecording();
                            } else {
                              startRecording();
                            }
                            setAttachOpen(false);
                          }}
                          className={`flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-[#333] ${recording ? "bg-red-500/20 text-red-400" : "bg-[#262626]"}`}
                        >
                          <Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} />
                          {recording ? "Stop" : "Voice"}
                        </button>
                        <button
                          onClick={() => {
                            setEmojiOpen(true);
                            setAttachOpen(false);
                          }}
                          className="flex flex-col items-center gap-1 rounded-lg bg-[#262626] p-2 hover:bg-[#333]"
                        >
                          <Smile className="h-5 w-5" />
                          Emoji
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
          {(uploadingMedia || recording) && (
            <div className="px-3 pb-2 text-xs text-white/60">
              {recording ? "Recording voice... tap microphone to stop" : "Sending attachment..."}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default DirectMessageModal;
