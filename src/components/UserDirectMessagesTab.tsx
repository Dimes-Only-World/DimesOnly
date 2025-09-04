import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessageCircle, Trash2, Send, Reply } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { Tables } from "@/types";
import UserSearchComponent from "./UserSearchComponent";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DirectMessage extends Tables<"direct_messages"> {
  sender?: {
    username: string;
    profile_photo?: string;
  };
}

type Conversation = {
  otherUserId: string;
  otherUser: { id: string; username: string; profile_photo?: string; membership_tier?: string | null } | null;
  lastMessage: DirectMessage | null;
  unreadCount: number;
};

const UserDirectMessagesTab: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(
    null
  );
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [threadUserId, setThreadUserId] = useState<string | null>(null);
  const [threadUser, setThreadUser] = useState<{
    id: string;
    username: string;
    profile_photo?: string;
    membership_tier?: string | null;
  } | null>(null);
  const [threadMessages, setThreadMessages] = useState<DirectMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadText, setThreadText] = useState("");
  const [threadChannel, setThreadChannel] = useState<
    ReturnType<typeof supabase.channel> | null
  >(null);
  const defaultAvatar = "/placeholder.svg";
  const { toast } = useToast();
  const { user } = useAppContext();
  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: string; username: string; profile_photo?: string } | null>(null);

  const prettyTier = (t?: string | null) =>
    (t || "")
      .split("_").join(" ")
      .replace(/\b\w/g, (m) => m.toUpperCase());

  // Filters: All | Unread
  const [messageFilter, setMessageFilter] = useState<"all" | "unread">("all");

  // Open a conversation thread with a given other user
  const openThread = async (otherUserId: string) => {
    if (!user?.id) return;
    setThreadUserId(otherUserId);
    setThreadOpen(true);
    setThreadLoading(true);
    setThreadText("");

    try {
      // Fetch other user profile
      const { data: udata } = await supabase
        .from("users")
        .select("id, username, profile_photo, membership_tier")
        .eq("id", otherUserId)
        .single();
      setThreadUser(
        udata
          ? {
              id: (udata as any).id as string,
              username: ((udata as any).username as string) ?? "Unknown",
              profile_photo: ((udata as any).profile_photo as string) ?? undefined,
              membership_tier: ((udata as any).membership_tier as string) ?? null,
            }
          : null
      );

      // Fetch both sent and received messages between the two users (robust filter)
      const { data: threadData, error: threadErr } = await supabase
        .from("direct_messages")
        .select("*")
        .in("sender_id", [user.id, otherUserId])
        .in("recipient_id", [user.id, otherUserId])
        .order("created_at", { ascending: true });
      if (threadErr) throw threadErr;
      setThreadMessages((threadData as unknown as DirectMessage[]) || []);

      // Mark their incoming messages as read
      await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("sender_id", otherUserId)
        .eq("is_read", false);
      // Refresh conversation list to reflect new unread counts
      fetchMessages();

      // Setup realtime for this pair
      if (threadChannel) {
        try { threadChannel.unsubscribe(); } catch {}
      }
      const ch = supabase
        .channel(`dm_thread_${user.id}_${otherUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages" },
          (payload) => {
            const row = payload.new as DirectMessage;
            if (
              (row.sender_id === user.id && row.recipient_id === otherUserId) ||
              (row.sender_id === otherUserId && row.recipient_id === user.id)
            ) {
              setThreadMessages((prev) => [...prev, row]);
              if (row.recipient_id === user.id) {
                supabase.from("direct_messages").update({ is_read: true }).eq("id", row.id);
              }
              fetchMessages();
            }
          }
        )
        .subscribe();
      setThreadChannel(ch);
    } catch (e) {
      console.error("Error opening thread", e);
      toast({ title: "Error", description: "Failed to open chat", variant: "destructive" });
    } finally {
      setThreadLoading(false);
    }
  };

  const closeThread = () => {
    setThreadOpen(false);
    setThreadUserId(null);
    setThreadUser(null);
    setThreadMessages([]);
    setThreadText("");
    if (threadChannel) {
      try { threadChannel.unsubscribe(); } catch {}
      setThreadChannel(null);
    }
  };

  const sendThread = async () => {
    if (!user?.id || !threadUserId || !threadText.trim()) return;
    const text = threadText.trim();
    setThreadText("");
    try {
      const { error } = await supabase
        .from("direct_messages")
        .insert({ sender_id: user.id, recipient_id: threadUserId, message: text, is_read: false });
      if (error) throw error;
    } catch (e) {
      console.error("sendThread error", e);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Load current user's profile for avatar in thread bubbles
      (async () => {
        try {
          const { data } = await supabase
            .from("users")
            .select("id, username, profile_photo")
            .eq("id", user.id)
            .single();
          setCurrentUserProfile(
            data
              ? {
                  id: (data as any).id as string,
                  username: ((data as any).username as string) ?? "Unknown",
                  profile_photo: ((data as any).profile_photo as string) ?? undefined,
                }
              : null
          );
        } catch {}
      })();

      fetchMessages();

      // Realtime: refresh conversations on any DM insert involving the current user
      const subscription = supabase
        .channel("direct_messages_conversations")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages" },
          (payload) => {
            const row = payload.new as DirectMessage;
            if (row.sender_id === user.id || row.recipient_id === user.id) {
              fetchMessages();
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id]);

  const fetchMessages = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get all messages involving current user (sent or received)
      const { data: all, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const msgs = (all || []) as unknown as DirectMessage[];
      // Build conversations by other user id
      const map = new Map<string, { last: DirectMessage | null; unread: number }>();
      for (const m of msgs) {
        const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        if (!otherId) continue;
        const current = map.get(otherId) || { last: null, unread: 0 };
        if (!current.last) current.last = m; // first in desc order is latest
        if (m.recipient_id === user.id && m.is_read === false) current.unread += 1;
        map.set(otherId, current);
      }

      const otherIds = Array.from(map.keys());
      let usersLookup: Record<string, { id: string; username: string; profile_photo?: string; membership_tier?: string | null }> = {};
      if (otherIds.length > 0) {
        const { data: usersData, error: usersErr } = await supabase
          .from("users")
          .select("id, username, profile_photo, membership_tier")
          .in("id", otherIds);
        if (usersErr) throw usersErr;
        usersLookup = Object.fromEntries(
          (usersData || []).map((u) => [u.id, { id: u.id, username: u.username ?? "Unknown", profile_photo: u.profile_photo ?? undefined, membership_tier: (u as any).membership_tier ?? null }])
        );
      }

      const convoList: Conversation[] = otherIds.map((oid) => ({
        otherUserId: oid,
        otherUser: usersLookup[oid] || null,
        lastMessage: map.get(oid)?.last || null,
        unreadCount: map.get(oid)?.unread || 0,
      }));

      // Sort by last message time desc
      convoList.sort((a, b) => {
        const ta = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const tb = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return tb - ta;
      });

      setConversations(convoList);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast({
        title: "Success",
        description: "Message deleted",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const handleReply = (message: DirectMessage) => {
    setSelectedMessage(message);
    setShowReplyDialog(true);
    setReplyText("");
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim() || !user?.id) return;

    setSendingReply(true);
    try {
      // Get current user's username
      const { data: currentUserData, error: userError } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      // Send reply message
      const { error: messageError } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: user.id,
          recipient_id: selectedMessage.sender_id,
          message: replyText.trim(),
          is_read: false,
        });

      if (messageError) throw messageError;

      // Send notification to original sender
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          recipient_id: selectedMessage.sender_id,
          title: "New Reply",
          message: `You have a new reply from ${
            currentUserData?.username || "Unknown"
          }`,
          is_read: false,
        });

      if (notificationError) throw notificationError;

      toast({
        title: "Reply sent!",
        description: `Your reply has been sent to ${
          selectedMessage.sender?.username || "the user"
        }`,
      });

      setShowReplyDialog(false);
      setSelectedMessage(null);
      setReplyText("");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Please log in to view messages</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Direct Messages</h2>
            <Badge variant="secondary">
              {conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)} unread
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant={messageFilter === "all" ? "default" : "outline"} onClick={() => setMessageFilter("all")}>All</Button>
              <Button size="sm" variant={messageFilter === "unread" ? "default" : "outline"} onClick={() => setMessageFilter("unread")}>Unread</Button>
            </div>
          </div>

          {(messageFilter === "all" ? conversations : conversations.filter((c) => c.unreadCount > 0)).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages yet</p>
              </CardContent>
            </Card>
          ) : (
            (messageFilter === "all" ? conversations : conversations.filter((c) => c.unreadCount > 0)).map((convo) => (
              <Card
                key={convo.otherUserId}
                className={`${convo.unreadCount > 0 ? "border-blue-200 bg-blue-50" : ""}`}
                onClick={() => openThread(convo.otherUserId)}
                role="button"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <img
                        src={convo.otherUser?.profile_photo || defaultAvatar}
                        alt={convo.otherUser?.username || 'User'}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {convo.otherUser?.username || "Unknown"}
                          </CardTitle>
                          {convo.otherUser?.membership_tier && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={convo.otherUser.membership_tier === "diamond_plus" ? "default" : "secondary"}
                                    className={
                                      convo.otherUser.membership_tier === "diamond_plus"
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-none"
                                        : ""
                                    }
                                  >
                                    {prettyTier(convo.otherUser.membership_tier)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{prettyTier(convo.otherUser.membership_tier)} member</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">
                            {convo.lastMessage?.created_at
                              ? new Date(convo.lastMessage.created_at).toLocaleString()
                              : ""}
                          </p>
                          {convo.unreadCount > 0 && (
                            <Badge variant="default" className="text-[10px] py-0 px-1.5">{convo.unreadCount}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {convo.lastMessage?.message || ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" />
                  </div>
                </CardHeader>
                
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Send Message</h2>
          </div>

          <UserSearchComponent
            onMessageSent={fetchMessages}
            currentUserId={user.id}
          />
        </TabsContent>
      </Tabs>

      {/* Conversation Thread Dialog */}
      <Dialog open={threadOpen} onOpenChange={(o)=> o ? null : closeThread()}>
        <DialogContent className="max-w-lg w-full p-0">
          <div className="p-4 border-b flex items-center gap-3">
            <img
              src={threadUser?.profile_photo || defaultAvatar}
              alt={threadUser?.username || "User"}
              className="h-10 w-10 rounded-full object-cover border"
            />
            <div className="flex items-center gap-2 min-w-0">
              <DialogTitle className="text-base truncate">
                {threadUser?.username || "Chat"}
              </DialogTitle>
              {threadUser?.membership_tier && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={threadUser.membership_tier === "diamond_plus" ? "default" : "secondary"}
                        className={
                          threadUser.membership_tier === "diamond_plus"
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-none"
                            : ""
                        }
                      >
                        {prettyTier(threadUser.membership_tier)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{prettyTier(threadUser.membership_tier)} member</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <div className="h-[60vh] overflow-y-auto p-4 space-y-3 bg-gray-50">
            {threadLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              threadMessages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <img
                        src={threadUser?.profile_photo || defaultAvatar}
                        alt={threadUser?.username || 'User'}
                        className="h-7 w-7 rounded-full object-cover border"
                      />
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border text-gray-800 rounded-bl-sm'}`}>
                      <div className="whitespace-pre-wrap leading-relaxed">{m.message}</div>
                      <div className={`mt-1 text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </div>
                    {isMe && (
                      <img
                        src={currentUserProfile?.profile_photo || defaultAvatar}
                        alt={currentUserProfile?.username || 'Me'}
                        className="h-7 w-7 rounded-full object-cover border"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="p-3 border-t flex items-end gap-2">
            <Textarea
              placeholder="Type a message"
              value={threadText}
              onChange={(e)=> setThreadText(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button onClick={sendThread} disabled={!threadText.trim()} className="bg-blue-600 hover:bg-blue-700">Send</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Reply to {selectedMessage?.sender?.username || "User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Original message:</p>
              <p className="text-sm">{selectedMessage?.message}</p>
            </div>
            <div>
              <Label htmlFor="reply">Your Reply</Label>
              <Textarea
                id="reply"
                placeholder="Type your reply here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReplyDialog(false)}
              disabled={sendingReply}
            >
              Cancel
            </Button>
            <Button
              onClick={sendReply}
              disabled={!replyText.trim() || sendingReply}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sendingReply ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDirectMessagesTab;
