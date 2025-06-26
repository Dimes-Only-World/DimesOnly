import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Play, Settings, Check, X, AlertCircle, Info, Gift } from 'lucide-react';

interface NotificationsSectionProps {
  userData?: {
    user_type?: string;
    notifications?: string[];
  };
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({ userData }) => {
  const [preferences, setPreferences] = useState({
    email: true,
    push: true,
    tips: true,
    ratings: true,
    events: true
  });

  const userType = userData?.user_type || 'normal';
  const isExoticOrDancer = userType === 'exotic' || userType === 'stripper';
  
  const videoUrl = isExoticOrDancer 
    ? 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/Background-Ladies-1.mp4'
    : 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/Opening+Page+f+(1).mp4';

  const notifications = [
    {
      id: 1,
      title: 'Welcome to Dimes Only!',
      message: 'Your account has been successfully created. Complete your profile to get started.',
      time: '2 hours ago',
      type: 'welcome',
      icon: Check,
      color: 'green',
      unread: true
    },
    {
      id: 2,
      title: 'Profile Verification',
      message: 'Please verify your email address to unlock all features.',
      time: '1 day ago',
      type: 'verification',
      icon: AlertCircle,
      color: 'yellow',
      unread: true
    },
    {
      id: 3,
      title: isExoticOrDancer ? 'New Tip Received!' : 'New Performers Available',
      message: isExoticOrDancer ? 'You received a $25 tip from @user123' : 'Check out the latest performers and show your support.',
      time: '2 days ago',
      type: 'tip',
      icon: Gift,
      color: 'purple',
      unread: false
    },
    {
      id: 4,
      title: 'Platform Update',
      message: 'New features have been added to enhance your experience.',
      time: '3 days ago',
      type: 'update',
      icon: Info,
      color: 'blue',
      unread: false
    }
  ];

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const markAsRead = (id: number) => {
    console.log(`Marking notification ${id} as read`);
  };

  const markAllAsRead = () => {
    console.log('Marking all notifications as read');
  };

  return (
    <div className="space-y-6">
      {/* Video Section */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-gray-900">
                {isExoticOrDancer ? 'For Exotics & Strippers' : 'Platform Overview'}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">Learn how to maximize your experience</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative rounded-xl overflow-hidden shadow-lg">
            <video 
              controls 
              className="w-full h-64 object-cover"
              poster="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop"
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-gray-900">Recent Notifications</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Stay updated with the latest activities</p>
              </div>
            </div>
            <Button 
              onClick={markAllAsRead}
              variant="outline" 
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Mark All Read
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {notifications.map((notification) => {
              const IconComponent = notification.icon;
              return (
                <div 
                  key={notification.id}
                  className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    notification.unread 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {notification.unread && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notification.color === 'green' ? 'bg-green-100' :
                      notification.color === 'yellow' ? 'bg-yellow-100' :
                      notification.color === 'purple' ? 'bg-purple-100' :
                      'bg-blue-100'
                    }`}>
                      <IconComponent className={`w-4 h-4 ${
                        notification.color === 'green' ? 'text-green-600' :
                        notification.color === 'yellow' ? 'text-yellow-600' :
                        notification.color === 'purple' ? 'text-purple-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">{notification.time}</span>
                          {notification.unread && (
                            <Button
                              onClick={() => markAsRead(notification.id)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{notification.message}</p>
                      <div className="mt-3">
                        <Badge 
                          variant="outline" 
                          className={`${
                            notification.color === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                            notification.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            notification.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-gray-900">Notification Preferences</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Customize how you receive notifications</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-gray-600 text-sm">Receive updates and alerts via email</p>
              </div>
              <Switch 
                checked={preferences.email}
                onCheckedChange={(checked) => handlePreferenceChange('email', checked)}
              />
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Push Notifications</h4>
                <p className="text-gray-600 text-sm">Receive browser notifications</p>
              </div>
              <Switch 
                checked={preferences.push}
                onCheckedChange={(checked) => handlePreferenceChange('push', checked)}
              />
            </div>
            
            {isExoticOrDancer && (
              <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <h4 className="font-medium text-gray-900">Tip Notifications</h4>
                  <p className="text-gray-600 text-sm">Get notified when you receive tips</p>
                </div>
                <Switch 
                  checked={preferences.tips}
                  onCheckedChange={(checked) => handlePreferenceChange('tips', checked)}
                />
              </div>
            )}
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Event Notifications</h4>
                <p className="text-gray-600 text-sm">Stay updated on upcoming events</p>
              </div>
              <Switch 
                checked={preferences.events}
                onCheckedChange={(checked) => handlePreferenceChange('events', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSection;