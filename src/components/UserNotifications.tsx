import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  message: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  read_at?: string;
}

interface DirectMessage {
  id: string;
  message: string;
  created_at: string;
  read_at?: string;
}

interface UserNotificationsProps {
  userId: string;
}

const UserNotifications: React.FC<UserNotificationsProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      fetchDirectMessages();
    }
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient_id.eq.${userId},recipient_id.eq.all`)
        .eq('is_notification', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchDirectMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', userId)
        .eq('is_direct_message', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (messageId: string, isNotification: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          read_at: new Date().toISOString(),
          expires_at: isNotification ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() : null
        })
        .eq('id', messageId);

      if (error) throw error;
      
      if (isNotification) {
        fetchNotifications();
      } else {
        fetchDirectMessages();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark message as read',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications ({notifications.filter(n => !n.read_at).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.map((notification) => (
              <div key={notification.id} className={`p-3 border rounded-lg ${
                !notification.read_at ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    {notification.media_url && (
                      <div className="mt-2">
                        {notification.media_type === 'photo' ? (
                          <img src={notification.media_url} alt="Notification" className="w-24 h-24 object-cover rounded" />
                        ) : (
                          <video src={notification.media_url} className="w-24 h-24 object-cover rounded" controls />
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(notification.id, true)}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-center text-gray-500 py-4">No notifications</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direct Messages ({messages.filter(m => !m.read_at).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={`p-3 border rounded-lg ${
                !message.read_at ? 'bg-green-50 border-green-200' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Admin</Badge>
                      {!message.read_at && <Badge variant="default">New</Badge>}
                    </div>
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!message.read_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(message.id, false)}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-center text-gray-500 py-4">No messages</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserNotifications;