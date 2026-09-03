import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users,
  UserCheck,
  Trophy,
  DollarSign,
  BarChart3,
  Bell,
  MessageSquare,
  Calendar,
  Car,
  FlaskConical,
  Video,
  CreditCard,
  Settings,
  Filter,
  Smartphone,
  MessageCircle,
  FileText,
  FileSignature,
  FileCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import AdminLeadsTab from "@/components/AdminLeadsTab";
import AdminShortFormBackgroundTab from "@/components/AdminShortFormBackgroundTab";
import AdminSMSTextTab from "@/components/AdminSMSTextTab";
import AdminMembershipAgreementsTab from "@/components/AdminMembershipAgreementsTab";

import { supabase } from "@/integrations/supabase/client";

const AdminTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex h-auto items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 p-1.5 text-muted-foreground w-max",
      className
    )}
    {...props}
  />
));
AdminTabsList.displayName = TabsPrimitive.List.displayName;

const AdminTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dimes-magenta focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-dimes-magenta data-[state=active]:text-dimes-surface data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-dimes-magenta/10 data-[state=inactive]:hover:text-dimes-magenta",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.Trigger>
));
AdminTabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const tabs = [
  { value: "users", label: "Users", icon: Users },
  { value: "approvals", label: "Approvals", icon: UserCheck },
  { value: "jackpot", label: "Jackpot", icon: Trophy },
  { value: "earnings", label: "Earnings", icon: DollarSign },
  { value: "ranking", label: "Ranking", icon: BarChart3 },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "messages", label: "Messages", icon: MessageSquare },
  { value: "events", label: "Events", icon: Calendar },
  { value: "rentals", label: "Rentals", icon: Car },
  { value: "testing", label: "Testing", icon: FlaskConical },
  { value: "videos", label: "Videos", icon: Video },
  { value: "payouts", label: "Payouts", icon: CreditCard },
  { value: "settings", label: "Settings", icon: Settings },
  { value: "leads", label: "Leads", icon: Filter },
  { value: "shortform", label: "S-F-B", icon: Smartphone },
  { value: "smstext", label: "SMS Text", icon: MessageCircle },
  { value: "sdm", label: "SDM", icon: FileText },
  { value: "sem", label: "SEM", icon: FileSignature },
  { value: "ssm", label: "SSM", icon: FileCheck },
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        const adminUserData = sessionStorage.getItem('adminUser');
        
        if (!adminUserData) {
          navigate("/adminlogin");
          return;
        }

        const adminUser = JSON.parse(adminUserData);
        
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

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scroll = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector('[data-state="active"]') as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
    checkScroll();
  }, [activeTab]);

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="relative mb-8">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scroll(-320)}
                className="absolute left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-dimes-magenta/20 bg-dimes-surface text-dimes-magenta shadow-sm transition-colors hover:bg-dimes-magenta/10 lg:flex"
                aria-label="Scroll tabs left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="overflow-x-auto scrollbar-hide [-webkit-overflow-scrolling:touch] px-1"
            >
              <AdminTabsList>
                {tabs.map((tab) => (
                  <AdminTabsTrigger key={tab.value} value={tab.value} data-value={tab.value}>
                    <tab.icon className="h-4 w-4 opacity-80 group-data-[state=active]:opacity-100" />
                    <span>{tab.label}</span>
                  </AdminTabsTrigger>
                ))}
              </AdminTabsList>
            </div>
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scroll(320)}
                className="absolute right-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-dimes-magenta/20 bg-dimes-surface text-dimes-magenta shadow-sm transition-colors hover:bg-dimes-magenta/10 lg:flex"
                aria-label="Scroll tabs right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
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

          <TabsContent value="leads">
            <AdminLeadsTab />
          </TabsContent>

          <TabsContent value="shortform">
            <AdminShortFormBackgroundTab />
          </TabsContent>

          <TabsContent value="smstext">
            <AdminSMSTextTab />
          </TabsContent>

          <TabsContent value="sdm">
            <AdminMembershipAgreementsTab
              tier="diamond_plus"
              title="SDM = Signed Diamond Plus Membership"
            />
          </TabsContent>

          <TabsContent value="sem">
            <AdminMembershipAgreementsTab
              tier="elite_plus"
              title="SEM = Signed Elite Plus membership"
            />
          </TabsContent>

          <TabsContent value="ssm">
            <AdminMembershipAgreementsTab
              tier="silver_plus"
              title="SSM = Signed Silver Plus Membership"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
