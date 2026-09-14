import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

const VALIDATION_TIMEOUT_MS = 4000;

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

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Auth validation timed out')), ms)
    ),
  ]);
};

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
          // Fall back to Supabase session, but don't let it hang forever
          const { data: { session } } = await withTimeout(
            supabase.auth.getSession(),
            VALIDATION_TIMEOUT_MS
          );
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
        try {
          const { data: userRecord, error } = await withTimeout(
            Promise.resolve(
              supabase
                .from('users')
                .select('is_active')
                .eq('id', userId)
                .single()
            ),
            VALIDATION_TIMEOUT_MS
          );

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
        } catch (bgError) {
          // Don't block the UI if the background check times out or fails.
          // We already rendered the route optimistically above.
          console.warn('Background is_active check failed:', bgError);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // If validation timed out but we have a local session, let the user in
        // rather than leaving them on a spinner. Foldable/Samsung Internet can
        // stall on storage/network, so this keeps the app usable.
        const localUserId = hasLocalSession();
        if (localUserId && !cancelled) {
          setIsAuthenticated(true);
          return;
        }
        if (!localUserId && !cancelled) {
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
