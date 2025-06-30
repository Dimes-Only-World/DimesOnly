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

interface DirectMessage extends Tables<"direct_messages"> {
  sender?: {
    username: string;
    profile_photo?: string;
  };
}

const UserDirectMessagesTab: React.FC = () => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(
    null
  );
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const { toast } = useToast();
  const { user } = useAppContext();

  useEffect(() => {
    if (user?.id) {
      fetchMessages();

      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel("direct_messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("New message received:", payload);
            fetchMessages(); // Refresh messages when new one arrives
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
      // First get the messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      if (messagesData && messagesData.length > 0) {
        // Get unique sender IDs
        const senderIds = [
          ...new Set(messagesData.map((m) => m.sender_id).filter(Boolean)),
        ];

        // Fetch sender information
        const { data: sendersData, error: sendersError } = await supabase
          .from("users")
          .select("id, username, profile_photo")
          .in("id", senderIds);

        if (sendersError) throw sendersError;

        // Combine messages with sender data
        const messagesWithSenders: DirectMessage[] = messagesData.map(
          (message) => {
            // Handle admin messages (sender_id is null)
            if (message.is_admin_message && !message.sender_id) {
              return {
                ...message,
                sender: {
                  username: "Admin",
                  profile_photo: undefined,
                },
              } as DirectMessage;
            }

            // Handle regular user messages
            const senderData = sendersData?.find(
              (sender) => sender.id === message.sender_id
            );
            return {
              ...message,
              sender: senderData
                ? {
                    username: String(senderData.username || "Unknown"),
                    profile_photo: senderData.profile_photo
                      ? String(senderData.profile_photo)
                      : undefined,
                  }
                : {
                    username: "Unknown User",
                    profile_photo: undefined,
                  },
            } as DirectMessage;
          }
        );

        setMessages(messagesWithSenders);
      } else {
        setMessages([]);
      }
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
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Direct Messages</h2>
            <Badge variant="secondary">
              {messages.filter((m) => !m.is_read).length} unread
            </Badge>
          </div>

          {messages.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages yet</p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card
                key={message.id}
                className={`${
                  !message.is_read ? "border-blue-200 bg-blue-50" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        From: {message.sender?.username || "Unknown"}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {message.created_at
                          ? new Date(message.created_at).toLocaleString()
                          : "Unknown time"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!message.is_read && (
                        <Badge variant="default" className="text-xs">
                          New
                        </Badge>
                      )}
                      {message.is_admin_message && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-purple-100 text-purple-700"
                        >
                          Admin
                        </Badge>
                      )}
                      {!message.is_admin_message && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReply(message)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Reply className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMessage(message.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                    {message.message}
                  </p>

                  <div className="flex gap-2">
                    {!message.is_read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(message.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                    {!message.is_admin_message && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleReply(message)}
                        className="flex items-center gap-2"
                      >
                        <Reply className="w-4 h-4" />
                        Reply
                      </Button>
                    )}
                    {message.is_admin_message && (
                      <p className="text-sm text-gray-500 italic">
                        Admin messages cannot be replied to
                      </p>
                    )}
                  </div>
                </CardContent>
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
