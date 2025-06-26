import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import AdminEmailSettings from '@/components/AdminEmailSettings';
import AdminUsersListEnhanced from '@/components/AdminUsersListEnhanced';
import AdminEarningsTab from '@/components/AdminEarningsTab';
import AdminRankingTab from '@/components/AdminRankingTab';
import AdminNotificationTab from '@/components/AdminNotificationTab';
import AdminDirectMessageTab from '@/components/AdminDirectMessageTab';
import AdminEventsTab from '@/components/AdminEventsTab';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      navigate('/adminlogin');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/adminlogin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Introduction Video */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <video 
              className="w-full h-full object-cover" 
              controls 
              poster="https://dimesonly.s3.us-east-2.amazonaws.com/HOUSING-ANGELS+(1).png"
            >
              <source src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+final.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage DimesOnly platform</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsersListEnhanced />
          </TabsContent>

          <TabsContent value="earnings">
            <AdminEarningsTab />
          </TabsContent>

          <TabsContent value="ranking">
            <AdminRankingTab />
          </TabsContent>

          <TabsContent value="notifications">
            <AdminNotificationTab />
          </TabsContent>

          <TabsContent value="messages">
            <AdminDirectMessageTab />
          </TabsContent>

          <TabsContent value="events">
            <AdminEventsTab />
          </TabsContent>

          <TabsContent value="settings">
            <AdminEmailSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;