import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  email: string;
  created_at?: string;
  createdAt?: string;
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
  membershipTier?: string;
  tipsEarned?: number;
  referralFees?: number;
  overrides?: number;
  weeklyHours?: number;
  isRanked?: boolean;
  rankNumber?: number;
}

const normalizeUser = (raw: any): User | null => {
  if (!raw?.id) return null;
  const createdAt = String(raw.created_at || raw.createdAt || "");

  return {
    id: String(raw.id),
    username: String(raw.username || ""),
    email: String(raw.email || ""),
    created_at: createdAt,
    createdAt,
    firstName: String(raw.firstName || raw.first_name || ""),
    lastName: String(raw.lastName || raw.last_name || ""),
    userType: String(raw.userType || raw.user_type || ""),
    profilePhoto: String(raw.profilePhoto || raw.profile_photo || ""),
    bannerPhoto: String(raw.bannerPhoto || raw.banner_photo || ""),
    mobileNumber: String(raw.mobileNumber || raw.mobile_number || raw.phone_number || ""),
    address: String(raw.address || ""),
    city: String(raw.city || ""),
    state: String(raw.state || ""),
    zip: String(raw.zip || ""),
    gender: String(raw.gender || ""),
    membershipType: String(raw.membershipType || raw.membership_type || raw.membership_tier || ""),
    membershipTier: String(raw.membershipTier || raw.membership_tier || raw.membership_type || ""),
    tipsEarned: Number(raw.tipsEarned ?? raw.tips_earned ?? 0),
    referralFees: Number(raw.referralFees ?? raw.referral_fees ?? 0),
    overrides: Number(raw.overrides || 0),
    weeklyHours: Number(raw.weeklyHours ?? raw.weekly_hours ?? 0),
    isRanked: Boolean(raw.isRanked ?? raw.is_ranked ?? false),
    rankNumber: Number(raw.rankNumber ?? raw.rank_number ?? 0),
  };
};

const mergeUserData = (previous: User | null, incoming: any): User | null => {
  const normalizedIncoming = normalizeUser(incoming);
  if (!previous) return normalizedIncoming;
  if (!normalizedIncoming) return previous;

  const createdAt = normalizedIncoming.created_at || previous.created_at || previous.createdAt || "";
  return {
    ...previous,
    ...normalizedIncoming,
    created_at: createdAt,
    createdAt,
  };
};

const persistUserData = (user: User) => {
  const normalized = normalizeUser(user) || user;
  sessionStorage.setItem("userData", JSON.stringify(normalized));
  sessionStorage.setItem("currentUser", normalized.username);
};

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
  const forceLogout = async () => {
    console.log("Forcing logout - account deactivated");
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("dimesPushAuthToken");
    setUser(null);
    setLoading(false);
    await supabase.auth.signOut().catch(() => {});
    toast({
      title: "Account Deactivated",
      description: "Your account has been deactivated. Please contact support to file an appeal.",
      variant: "destructive",
    });
  };

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
        // Check if user is deactivated
        if ((userData as any).is_active === false) {
          console.log("User is deactivated, forcing logout");
          await forceLogout();
          return null;
        }

        console.log("User data fetched from database:", userData);
        return normalizeUser(userData);
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

        let savedUserId: string | null = null;

        if (savedToken && savedUserData) {
          try {
            const userData = normalizeUser(JSON.parse(savedUserData));
            console.log("Found user data in session storage:", userData);
            if (userData) {
              savedUserId = userData.id;
              setUser(userData);
              setLoading(false);
            }
          } catch (e) {
            console.error("Error parsing saved user data:", e);
          }
        }

        if (savedToken && savedUserId) {
          const userData = await fetchUserFromDatabase(savedUserId);
          if (userData) {
            setUser((prev) => mergeUserData(prev, userData));
            persistUserData(userData);
            setLoading(false);
            return;
          }
        }

        // Check for custom authentication token
        if (savedToken && savedToken.startsWith("authenticated_")) {
          const userId = savedToken.replace("authenticated_", "");
          console.log("Found custom auth token for user:", userId);
          const userData = await fetchUserFromDatabase(userId);
          if (userData) {
            setUser(userData);
              persistUserData(userData);
            setLoading(false);
            return;
          }
        }

        // Check for Supabase Auth token
        if (savedToken && !savedToken.startsWith("authenticated_")) {
          console.log("Found Supabase Auth token, checking session...");
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user) {
            console.log("Found valid Supabase session:", session.user.id);
            const userData = await fetchUserFromDatabase(session.user.id);
            if (userData) {
              setUser(userData);
              persistUserData(userData);
              setLoading(false);
              return;
            }
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
            persistUserData(userData);
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
      persistUserData(user);
    } else if (initialized && !loading) {
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("currentUser");
        sessionStorage.removeItem("dimesPushAuthToken");
      localStorage.removeItem("authToken");
    }
  }, [user, initialized, loading]);

  // Handle Supabase auth state changes (simplified)
  const userIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);

        if (event === "SIGNED_OUT") {
        console.log("User signed out, clearing user data");
        setUser(null);
          localStorage.removeItem("authToken");
          sessionStorage.removeItem("userData");
          sessionStorage.removeItem("currentUser");
          sessionStorage.removeItem("dimesPushAuthToken");
        return;
      }

      if (event === "SIGNED_IN") {
        const sessionUserId = session?.user?.id;
        // Skip if we already have this user set - avoids double-load on login
        if (sessionUserId && userIdRef.current === sessionUserId) {
          return;
        }
        if (!userIdRef.current || sessionUserId === userIdRef.current) {
          const savedUserData = sessionStorage.getItem("userData");
          if (savedUserData) {
            try {
              const parsed = normalizeUser(JSON.parse(savedUserData));
              console.log("Auth state SIGNED_IN: loading user from sessionStorage");
              if (parsed) setUser((prev) => mergeUserData(prev, parsed));
            } catch (e) {
              console.error("Error parsing userData on SIGNED_IN:", e);
            }
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
