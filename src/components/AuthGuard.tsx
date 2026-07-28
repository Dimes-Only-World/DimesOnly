import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

const hasLocalSession = (): string | null => {
  const authToken = localStorage.getItem("authToken");
  const userData = sessionStorage.getItem("userData");
  if (authToken && userData) {
    try {
      const parsed = JSON.parse(userData);
      return parsed?.id || null;
    } catch {
      return null;
    }
  }
  return null;
};

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  // Optimistic: if we have a local session, render immediately.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    return hasLocalSession() ? true : null;
  });

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      try {
        let userId: string | null = hasLocalSession();

        if (!userId) {
          // Fall back to Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id ?? null;
        }

        if (!userId) {
          if (!cancelled) {
            setIsAuthenticated(false);
            navigate('/login');
          }
          return;
        }

        // Ensure children render while we validate is_active in background
        if (!cancelled) setIsAuthenticated(true);

        // Background is_active check - only force logout on explicit false
        const { data: userRecord, error } = await supabase
          .from('users')
          .select('is_active')
          .eq('id', userId)
          .single();

        if (cancelled) return;

        if (!error && userRecord && userRecord.is_active === false) {
          console.log('User account is deactivated, forcing logout');
          localStorage.removeItem("authToken");
          sessionStorage.removeItem("userData");
          sessionStorage.removeItem("currentUser");
          sessionStorage.removeItem("dimesPushAuthToken");
          await supabase.auth.signOut().catch(() => {});
          setIsAuthenticated(false);
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Don't force-logout on transient network errors if we have a local session
        if (!hasLocalSession() && !cancelled) {
          setIsAuthenticated(false);
          navigate('/login');
        }
      }
    };

    validate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("userData");
        sessionStorage.removeItem("currentUser");
        sessionStorage.removeItem("dimesPushAuthToken");
        setIsAuthenticated(false);
        navigate('/login');
      }
    });

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
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
