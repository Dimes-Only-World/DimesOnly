import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Search, Filter } from "lucide-react";
import { Tables } from "@/types";

type UserData = Tables<"users">;

interface Message {
  id: string;
  sender: {
    username: string;
    profilePhoto?: string;
    userType: string;
  };
  content: string;
  timestamp: string;
  isRead: boolean;
  conversationId: string;
}

interface MessagesTabProps {
  userData: UserData;
}

const MessagesTab: React.FC<MessagesTabProps> = ({ userData }) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock messages data
  const mockMessages: Message[] = [
    {
      id: "1",
      sender: {
        username: "sarah_dancer",
        profilePhoto: "https://via.placeholder.com/40",
        userType: "stripper"
      },
      content: "Hey! Thanks for the tip last night! 💕",
      timestamp: "2024-01-15T10:30:00Z",
      isRead: false,
      conversationId: "conv1"
    },
    {
      id: "2",
      sender: {
        username: "alex_fan",
        profilePhoto: "https://via.placeholder.com/40",
        userType: "fan"
      },
      content: "When is your next show?",
      timestamp: "2024-01-15T09:15:00Z",
      isRead: true,
      conversationId: "conv2"
    },
    {
      id: "3",
      sender: {
        username: "club_manager",
        profilePhoto: "https://via.placeholder.com/40",
        userType: "club"
      },
      content: "Schedule update for this weekend",
      timestamp: "2024-01-14T16:45:00Z",
      isRead: true,
      conversationId: "conv3"
    }
  ];

  const conversations = mockMessages.reduce((acc, message) => {
    if (!acc[message.conversationId]) {
      acc[message.conversationId] = {
        id: message.conversationId,
        participant: message.sender,
        lastMessage: message,
        unreadCount: mockMessages.filter(m => 
          m.conversationId === message.conversationId && !m.isRead
        ).length
      };
    }
    return acc;
  }, {} as Record<string, any>);

  const conversationList = Object.values(conversations);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'stripper': return 'bg-pink-100 text-pink-800';
      case 'fan': return 'bg-blue-100 text-blue-800';
      case 'club': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      // Handle sending message
      console.log('Sending message:', newMessage);
      setNewMessage("");
    }
  };

  return (
    <div className="h-[600px] flex border rounded-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-gray-50">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Messages</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="overflow-y-auto h-full">
          {conversationList.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`p-4 border-b cursor-pointer hover:bg-white transition-colors ${
                selectedConversation === conversation.id ? 'bg-white border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conversation.participant.profilePhoto} />
                  <AvatarFallback>
                    {conversation.participant.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {conversation.participant.username}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.lastMessage.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage.content}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <Badge 
                    className={`text-xs mt-1 ${getUserTypeColor(conversation.participant.userType)}`}
                    variant="secondary"
                  >
                    {conversation.participant.userType}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Message Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conversations[selectedConversation]?.participant.profilePhoto} />
                  <AvatarFallback>
                    {conversations[selectedConversation]?.participant.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">
                    {conversations[selectedConversation]?.participant.username}
                  </p>
                  <Badge 
                    className={`text-xs ${getUserTypeColor(conversations[selectedConversation]?.participant.userType)}`}
                    variant="secondary"
                  >
                    {conversations[selectedConversation]?.participant.userType}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mockMessages
                .filter(msg => msg.conversationId === selectedConversation)
                .map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.profilePhoto} />
                      <AvatarFallback>
                        {message.sender.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">
                          {message.sender.username}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-100 rounded-lg p-3">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 min-h-[40px] max-h-[120px]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;