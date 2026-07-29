import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import AdminEmailSettings from "@/components/AdminEmailSettings";
import AdminAppLaunchSettings from "@/components/AdminAppLaunchSettings";
import AdminUsersListEnhanced from "@/components/AdminUsersListEnhanced";
import AdminEarningsTab from "@/components/AdminEarningsTab";
import AdminRankingTab from "@/components/AdminRankingTab";
import AdminNotificationTab from "@/components/AdminNotificationTab";
import AdminDirectMessageTab from "@/components/AdminDirectMessageTab";
import AdminEventsTab from "@/components/AdminEventsTab";
import AdminRentalsTab from "@/components/AdminRentalsTab";
import AdminJackpotTab from "@/components/AdminJackpotTab";
import AdminTipAllocationTest from "@/components/AdminTipAllocationTest";
import AdminBannerVideoTab from "@/components/AdminBannerVideoTab";
import AdminPayoutTab from "@/components/AdminPayoutTab";
import AdminApprovalsTab from "@/components/AdminApprovalsTab";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        // Check for admin session in sessionStorage (set by AdminLogin)
        const adminUserData = sessionStorage.getItem('adminUser');
        
        if (!adminUserData) {
          navigate("/adminlogin");
          return;
        }

        const adminUser = JSON.parse(adminUserData);
        
        // Verify admin role server-side using security definer function
        const { data: hasAdminRole, error } = await supabase
          .rpc('check_admin_by_user_id', { _user_id: adminUser.id });

        if (error) {
          console.error('Admin verification error:', error);
          sessionStorage.removeItem('adminUser');
          navigate("/adminlogin");
          return;
        }

        if (!hasAdminRole) {
          sessionStorage.removeItem('adminUser');
          navigate("/adminlogin");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Admin verification failed:', error);
        sessionStorage.removeItem('adminUser');
        navigate("/adminlogin");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAdminAccess();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminUser');
    navigate("/adminlogin");
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
              <source
                src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+final.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dimes Only</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
              Admin Dashboard - Manage DimesOnly platform
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="w-full">
          {/* Mobile Scrollable Tabs */}
          <div className="w-full mb-8 overflow-x-auto -webkit-overflow-scrolling-touch pb-2">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max lg:w-full lg:grid lg:grid-cols-12">
              <TabsTrigger value="users" className="whitespace-nowrap">
                Users
              </TabsTrigger>
              <TabsTrigger value="approvals" className="whitespace-nowrap">
                Approvals
              </TabsTrigger>
              <TabsTrigger value="jackpot" className="whitespace-nowrap">
                Jackpot
              </TabsTrigger>
              <TabsTrigger value="earnings" className="whitespace-nowrap">
                Earnings
              </TabsTrigger>
              <TabsTrigger value="ranking" className="whitespace-nowrap">
                Ranking
              </TabsTrigger>
              <TabsTrigger value="notifications" className="whitespace-nowrap">
                Notifications
              </TabsTrigger>
              <TabsTrigger value="messages" className="whitespace-nowrap">
                Messages
              </TabsTrigger>
              <TabsTrigger value="events" className="whitespace-nowrap">
                Events
              </TabsTrigger>
              <TabsTrigger value="rentals" className="whitespace-nowrap">
                Rentals
              </TabsTrigger>
              <TabsTrigger value="testing" className="whitespace-nowrap">
                Testing
              </TabsTrigger>
              <TabsTrigger value="videos" className="whitespace-nowrap">
                Videos
              </TabsTrigger>
              <TabsTrigger value="payouts" className="whitespace-nowrap">
                Payouts
              </TabsTrigger>
              <TabsTrigger value="settings" className="whitespace-nowrap">
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users">
            <AdminUsersListEnhanced />
          </TabsContent>

          <TabsContent value="approvals">
            <AdminApprovalsTab />
          </TabsContent>

          <TabsContent value="jackpot">
            <AdminJackpotTab />
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

          <TabsContent value="rentals">
            <AdminRentalsTab />
          </TabsContent>

          <TabsContent value="testing">
            <AdminTipAllocationTest />
          </TabsContent>

          <TabsContent value="videos">
            <AdminBannerVideoTab />
          </TabsContent>

          <TabsContent value="payouts">
            <AdminPayoutTab />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <AdminAppLaunchSettings />
            <AdminEmailSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
