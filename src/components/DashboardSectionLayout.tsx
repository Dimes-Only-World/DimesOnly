import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon } from "lucide-react";
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
            {/* pr-* keeps the logout button clear of the fixed notification bell */}
            <div className="flex items-center justify-between py-3 gap-3 pr-14 sm:pr-16">

              <Link
                to="/dashboard/profile"
                aria-label="Go to your profile"
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

              <button
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-pink-400 hover:ring-pink-500 shadow-md bg-slate-200 transition-all"
              >
                <LogOut className="h-6 w-6 text-slate-600" />
              </button>
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
