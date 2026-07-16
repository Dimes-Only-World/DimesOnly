import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthGuard from "./AuthGuard";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface DashboardSectionLayoutProps {
  title: string;
  username?: string | null;
  profilePhoto?: string | null;
  children: React.ReactNode;
}

const DashboardSectionLayout: React.FC<DashboardSectionLayoutProps> = ({
  title,
  username,
  profilePhoto,
  children,
}) => {
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("currentUser");
      setUser(null);
      toast({ title: "Logged out", description: "You have been logged out." });
      navigate("/login", { replace: true });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3 gap-3">
              <Link
                to="/dashboard"
                aria-label="Back to dashboard home"
                className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-pink-400 shadow-md hover:ring-pink-500 transition-all bg-slate-200"
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={username ? `${username} profile` : "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-6 w-6 text-slate-600" />
                )}
              </Link>

              <h1 className="flex-1 text-center text-base sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                {title}
              </h1>

              <div className="flex items-center gap-2 shrink-0">
                <p className="hidden sm:block text-xs md:text-sm text-gray-600 max-w-[140px] truncate">
                  Welcome, {username || "User"}
                </p>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
};

export default DashboardSectionLayout;
