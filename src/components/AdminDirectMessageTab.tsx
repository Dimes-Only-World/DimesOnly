import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getAdminUserId } from "@/lib/adminAuth";
import { Search, Send, Users, User, X } from "lucide-react";

interface User {
  id: string;
  username: string;
  user_type: string;
  profile_photo?: string;
}

const AdminDirectMessageTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by user type
    if (userTypeFilter !== "all") {
      filtered = filtered.filter((user) => user.user_type === userTypeFilter);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, users, userTypeFilter]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, user_type, profile_photo")
        .order("username");

      if (error) throw error;

      const typedData: User[] = (data || []).map((user) => ({
        id: String(user.id),
        username: String(user.username),
        user_type: String(user.user_type),
        profile_photo: user.profile_photo
          ? String(user.profile_photo)
          : undefined,
      }));

      setUsers(typedData);
      setFilteredUsers(typedData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  const selectAllFilteredUsers = () => {
    const filteredUserIds = filteredUsers.map((user) => user.id);
    setSelectedUsers((prev) => {
      const newSelection = [...new Set([...prev, ...filteredUserIds])];
      return newSelection;
    });
  };

  const clearAllSelections = () => {
    setSelectedUsers([]);
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((id) => id !== userId));
  };

  const handleSendMessage = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    const adminUserId = getAdminUserId();
    if (!adminUserId) {
      toast({
        title: "Error",
        description: "Admin session not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-admin-message", {
        body: {
          adminUserId,
          recipientIds: selectedUsers,
          message: message.trim(),
        },
      });

      if (error) throw error;

      const result = data as { success: boolean; successCount: number; failCount: number; error?: string };

      if (!result.success) {
        throw new Error(result.error || "Failed to send messages");
      }

      if (result.failCount > 0) {
        toast({
          title: "Partial Success",
          description: `${result.successCount}/${selectedUsers.length} messages sent. ${result.failCount} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: `Message sent to ${result.successCount} user${result.successCount > 1 ? "s" : ""}`,
        });
      }

      if (result.successCount > 0) {
        setMessage("");
        setSelectedUsers([]);
        setSearchTerm("");
        setUserTypeFilter("all");
      }
    } catch (error: unknown) {
      console.error("Error sending messages:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send messages";
      toast({
        title: "Error",
        description: `Failed to send messages: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedUserObjects = users.filter((user) =>
    selectedUsers.includes(user.id)
  );
  const uniqueUserTypes = [
    ...new Set(users.map((user) => user.user_type)),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Direct Message to Users
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select specific users and send them private messages that will
            appear in their dashboard
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Selection Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Search Users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="sm:w-48">
                <label className="text-sm font-medium mb-2 block">
                  Filter by Type
                </label>
                <Select
                  value={userTypeFilter}
                  onValueChange={setUserTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueUserTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFilteredUsers}
                disabled={filteredUsers.length === 0}
              >
                <Users className="h-4 w-4 mr-2" />
                Select All Filtered ({filteredUsers.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllSelections}
                disabled={selectedUsers.length === 0}
              >
                Clear All ({selectedUsers.length})
              </Button>
            </div>

            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">
                    Selected Users ({selectedUsers.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllSelections}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {selectedUserObjects.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <User className="h-3 w-3" />
                      {user.username}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSelectedUser(user.id)}
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* User List */}
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <h4 className="font-medium">
                  Available Users ({filteredUsers.length})
                </h4>
              </div>
              <ScrollArea className="h-64">
                <div className="p-2 space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No users found matching your criteria
                    </p>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) =>
                            handleUserSelection(user.id, checked as boolean)
                          }
                        />
                        {user.profile_photo && (
                          <img
                            src={user.profile_photo}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {user.username}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {user.user_type}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Message Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Message *</label>
            <Textarea
              placeholder="Enter your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/1000 characters
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 pt-4 border-t">
            <div className="text-xs sm:text-sm text-muted-foreground">
              <p>
                Recipients: {selectedUsers.length} user
                {selectedUsers.length !== 1 ? "s" : ""}
              </p>
              <p>Send Date: {new Date().toLocaleDateString()}</p>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={
                loading || selectedUsers.length === 0 || !message.trim()
              }
              className="w-full sm:w-auto sm:min-w-[120px]"
            >
              {loading ? (
                <>
                  <Send className="h-4 w-4 mr-2 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDirectMessageTab;
