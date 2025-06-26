import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  avatar?: string;
}

interface MessagesSectionProps {
  messages?: Message[];
}

const MessagesSection: React.FC<MessagesSectionProps> = ({ messages = [] }) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Send message logic here
      setNewMessage('');
    }
  };

  const mockMessages: Message[] = [
    {
      id: '1',
      sender: 'admin',
      content: 'Welcome to the platform! Feel free to reach out if you have any questions.',
      timestamp: '2024-01-15T10:30:00Z',
      avatar: 'https://via.placeholder.com/40x40?text=A'
    },
    {
      id: '2',
      sender: 'support',
      content: 'Your profile has been verified successfully.',
      timestamp: '2024-01-14T15:45:00Z',
      avatar: 'https://via.placeholder.com/40x40?text=S'
    }
  ];

  const displayMessages = messages.length > 0 ? messages : mockMessages;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Message List */}
      <Card className="bg-white/10 backdrop-blur border-white/20 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayMessages.map((message) => (
              <div 
                key={message.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversation === message.sender 
                    ? 'bg-white/20' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setSelectedConversation(message.sender)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={message.avatar} alt={message.sender} />
                    <AvatarFallback className="bg-white/20 text-white">
                      {message.sender.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{message.sender}</p>
                    <p className="text-gray-300 text-sm truncate">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Content */}
      <Card className="bg-white/10 backdrop-blur border-white/20 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white">
            {selectedConversation ? `Chat with ${selectedConversation}` : 'Select a conversation'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedConversation ? (
            <div className="space-y-4">
              {/* Messages */}
              <div className="h-64 overflow-y-auto space-y-3 p-4 bg-white/5 rounded-lg">
                {displayMessages
                  .filter(msg => msg.sender === selectedConversation)
                  .map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={message.avatar} alt={message.sender} />
                        <AvatarFallback className="bg-white/20 text-white text-xs">
                          {message.sender.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-white/10 rounded-lg p-3">
                          <p className="text-white">{message.content}</p>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(message.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                }
              </div>
              
              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="bg-white/10 border-white/20 text-white resize-none"
                  rows={2}
                />
                <Button 
                  onClick={handleSendMessage}
                  className="bg-blue-600 hover:bg-blue-700 self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300">Select a conversation to start messaging</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagesSection;