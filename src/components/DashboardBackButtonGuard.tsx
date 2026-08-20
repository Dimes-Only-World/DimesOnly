import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LOGIN_PATH = "/login";
const GUARD_STATE_KEY = "dashboardBackGuard";
const HISTORY_STATE_KEY = "dimesBackGuard";

export const DashboardBackButtonGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const pushedRef = useRef(false);
  const isDashboard = location.pathname.startsWith("/dashboard");

  // Push a duplicate history entry when entering the dashboard from login.
  // This lets us intercept the browser back button before it leaves the app.
  useEffect(() => {
    if (!isDashboard || typeof window === "undefined") return;

    const guardActive = sessionStorage.getItem(GUARD_STATE_KEY) === "active";
    console.log("[BackGuard] mount check", { guardActive, pushed: pushedRef.current, path: location.pathname });
    if (guardActive && !pushedRef.current) {
      sessionStorage.removeItem(GUARD_STATE_KEY);
      pushedRef.current = true;
      window.history.pushState(
        { [HISTORY_STATE_KEY]: true },
        "",
        location.pathname + location.search + location.hash
      );
      console.log("[BackGuard] pushed duplicate state");
    }
  }, [isDashboard, location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!isDashboard || typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as Record<string, unknown> | null;
      const markerPopped = state?.[HISTORY_STATE_KEY] === true;
      console.log("[BackGuard] popstate", JSON.stringify({ state, markerPopped, url: window.location.pathname }));

      if (markerPopped) {
        // Undo the back navigation so the user stays on the dashboard
        window.history.forward();
        setOpen(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDashboard]);

  const handleStay = () => {
    setOpen(false);
    // Re-push the guard entry so the next back press is also intercepted
    if (typeof window !== "undefined" && isDashboard) {
      window.history.pushState(
        { [HISTORY_STATE_KEY]: true },
        "",
        location.pathname + location.search + location.hash
      );
    }
  };

  const handleLogout = async () => {
    setOpen(false);

    try {
      await supabase.auth.signOut();
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("currentUser");
      setUser(null);
      toast({ title: "Logged out", description: "You have been logged out." });
      navigate(LOGIN_PATH, { replace: true });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (!isDashboard) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Do you want to log out?</AlertDialogTitle>
          <AlertDialogDescription>
            Going back will take you to the login screen. Would you like to log
            out instead?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleStay}>
            Stay logged in
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout}>
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DashboardBackButtonGuard;
