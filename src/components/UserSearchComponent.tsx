import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  profile_image?: string;
}

interface UserSearchProps {
  onMessageSent: () => void;
  currentUserId: string;
}

const UserSearchComponent: React.FC<UserSearchProps> = ({ onMessageSent, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, profile_image')
        .ilike('username', `%${searchTerm}%`)
        .neq('id', currentUserId)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !message.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: currentUserId,
          recipient_id: selectedUser.id,
          message: message.trim(),
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message sent successfully!'
      });

      setMessage('');
      setSelectedUser(null);
      setSearchTerm('');
      setSearchResults([]);
      onMessageSent();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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
      </div>

      {searchResults.length > 0 && !selectedUser && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profile_image || undefined} />
                    <AvatarFallback>
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.username}</span>
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
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUser.profile_image || undefined} />
                  <AvatarFallback>
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Send message to:</p>
                  <p className="text-sm text-gray-600">{selectedUser.username}</p>
                </div>
              </div>
              
              <textarea
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 border rounded-md resize-none"
                rows={4}
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || loading}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null);
                    setMessage('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserSearchComponent;