import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

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
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  user: null,
  setUser: () => {},
};

export const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(sessionStorage.getItem('userData') || '');
        return userData;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('userData', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('userData');
      sessionStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    }
  }, [user]);

  // Initialize Supabase auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Update user context when signed in
        const userData = {
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
          firstName: session.user.user_metadata?.firstName,
          lastName: session.user.user_metadata?.lastName,
          ...session.user.user_metadata
        };
        setUser(userData);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};