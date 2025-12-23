import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First, check for Supabase Auth session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setIsAuthenticated(true);
          return;
        }
        
        // Fallback: Check for custom auth token from users table login
        const authToken = localStorage.getItem("authToken");
        const userData = sessionStorage.getItem("userData");
        
        if (authToken && userData) {
          // Custom authentication via users table is valid
          setIsAuthenticated(true);
          return;
        }
        
        // No valid authentication found
        setIsAuthenticated(false);
        navigate('/login');
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    checkAuth();

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Also clear custom auth on Supabase signout
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("userData");
        sessionStorage.removeItem("currentUser");
        setIsAuthenticated(false);
        navigate('/login');
      } else if (session) {
        setIsAuthenticated(true);
      }
    });

    // Listen for storage changes (for custom auth logout)
    const handleStorageChange = () => {
      const authToken = localStorage.getItem("authToken");
      const userData = sessionStorage.getItem("userData");
      if (!authToken && !userData) {
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;