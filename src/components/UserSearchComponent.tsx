import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Search, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  profile_photo?: string;
  user_type?: string;
}

interface UserSearchProps {
  onMessageSent: () => void;
  currentUserId: string;
}

const UserSearchComponent: React.FC<UserSearchProps> = ({
  onMessageSent,
  currentUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, profile_photo, user_type")
        .ilike("username", `%${searchTerm}%`)
        .neq("id", currentUserId)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !message.trim()) return;

    setLoading(true);
    try {
      // Get current user's username for notification
      const { data: currentUserData, error: userError } = await supabase
        .from("users")
        .select("username")
        .eq("id", currentUserId)
        .single();

      if (userError) throw userError;

      // Send the message
      const { error: messageError } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: currentUserId,
          recipient_id: selectedUser.id,
          message: message.trim(),
          is_read: false,
          created_at: new Date().toISOString(),
        });

      if (messageError) throw messageError;

      // Send notification to recipient
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          recipient_id: selectedUser.id,
          title: "New Message",
          message: `You have a new message from ${
            currentUserData?.username || "Unknown"
          }`,
          is_read: false,
        });

      if (notificationError) {
        console.warn("Failed to send notification:", notificationError);
      }

      toast({
        title: "Success",
        description: `Message sent to ${selectedUser.username}!`,
      });

      setMessage("");
      setSelectedUser(null);
      setSearchTerm("");
      setSearchResults([]);
      onMessageSent();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users by username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        {searching && (
          <div className="absolute right-3 top-3">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {searchResults.length > 0 && !selectedUser && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Search Results:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => setSelectedUser(user)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.profile_photo || undefined} />
                    <AvatarFallback>
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.username}</p>
                    {user.user_type && (
                      <p className="text-sm text-gray-500 capitalize">
                        {user.user_type}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedUser && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={selectedUser.profile_photo || undefined}
                    />
                    <AvatarFallback>
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-lg">Send message to:</p>
                    <p className="text-blue-600 font-medium">
                      @{selectedUser.username}
                    </p>
                    {selectedUser.user_type && (
                      <p className="text-sm text-gray-500 capitalize">
                        {selectedUser.user_type}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setMessage("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[100px] resize-none"
                rows={4}
              />

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null);
                    setMessage("");
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || loading}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {searchTerm.length >= 2 && searchResults.length === 0 && !searching && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-gray-500">
              No users found matching "{searchTerm}"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserSearchComponent;
