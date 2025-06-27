import React, { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  profilePhoto?: string;
  bannerPhoto?: string;
  mobileNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  gender?: string;
  membershipType?: string;
  tipsEarned?: number;
  referralFees?: number;
  overrides?: number;
  weeklyHours?: number;
  isRanked?: boolean;
  rankNumber?: number;
}

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  user: null,
  setUser: () => {},
  loading: true,
};

export const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Fetch complete user data from database
  const fetchUserFromDatabase = async (
    userId: string
  ): Promise<User | null> => {
    try {
      console.log("Fetching user data from database for ID:", userId);
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user from database:", error);
        return null;
      }

      if (userData) {
        console.log("User data fetched from database:", userData);
        const user: User = {
          id: String(userData.id),
          username: String(userData.username),
          email: String(userData.email),
          firstName: String(userData.first_name || ""),
          lastName: String(userData.last_name || ""),
          userType: String(userData.user_type || ""),
          profilePhoto: String(userData.profile_photo || ""),
          bannerPhoto: String(userData.banner_photo || ""),
          mobileNumber: String(userData.mobile_number || ""),
          address: String(userData.address || ""),
          city: String(userData.city || ""),
          state: String(userData.state || ""),
          zip: String(userData.zip || ""),
          gender: String(userData.gender || ""),
          membershipType: String(userData.membership_type || ""),
          tipsEarned: Number(userData.tips_earned || 0),
          referralFees: Number(userData.referral_fees || 0),
          overrides: Number(userData.overrides || 0),
          weeklyHours: Number(userData.weekly_hours || 0),
          isRanked: Boolean(userData.is_ranked || false),
          rankNumber: Number(userData.rank_number || 0),
        };
        return user;
      }
    } catch (error) {
      console.error("Error in fetchUserFromDatabase:", error);
    }
    return null;
  };

  // Initialize user data on app start
  useEffect(() => {
    const initializeUser = async () => {
      if (initialized) return;

      console.log("Initializing user data...");
      setInitialized(true);

      try {
        // First, try to get user from session storage
        const savedToken = localStorage.getItem("authToken");
        const savedUserData = sessionStorage.getItem("userData");

        if (savedToken && savedUserData) {
          try {
            const userData = JSON.parse(savedUserData);
            console.log("Found user data in session storage:", userData);
            setUser(userData);
            setLoading(false);
            return;
          } catch (e) {
            console.error("Error parsing saved user data:", e);
          }
        }

        // If no session data, check Supabase auth
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
        } else if (session?.user) {
          console.log("Found Supabase session:", session.user.id);
          const userData = await fetchUserFromDatabase(session.user.id);
          if (userData) {
            setUser(userData);
            // Save to session storage for future use
            sessionStorage.setItem("userData", JSON.stringify(userData));
            sessionStorage.setItem("currentUser", userData.username);
            localStorage.setItem("authToken", session.access_token);
          }
        } else {
          console.log("No active session found");
        }
      } catch (error) {
        console.error("Error in initialization:", error);
      } finally {
        console.log("Initialization complete, setting loading to false");
        setLoading(false);
      }
    };

    initializeUser();
  }, [initialized]);

  // Save user data to session storage when it changes
  useEffect(() => {
    if (user) {
      sessionStorage.setItem("userData", JSON.stringify(user));
      sessionStorage.setItem("currentUser", user.username);
    } else {
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("currentUser");
      localStorage.removeItem("authToken");
    }
  }, [user]);

  // Handle Supabase auth state changes (simplified)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (event === "SIGNED_OUT") {
        console.log("User signed out, clearing user data");
        setUser(null);
      }
      // Don't handle SIGNED_IN here to avoid conflicts with initialization
    });

    return () => subscription.unsubscribe();
  }, []); // Remove user dependency to avoid infinite loops

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        user,
        setUser,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
