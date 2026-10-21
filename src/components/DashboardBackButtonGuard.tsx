import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "@/lib/router-compat";
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

const isAuthenticated = () => {
  try {
    return Boolean(
      localStorage.getItem("authToken") ||
        sessionStorage.getItem("userData") ||
        sessionStorage.getItem("currentUser") ||
        Object.keys(localStorage).some(
          (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
        ),
    );
  } catch {
    return false;
  }
};

export const DashboardBackButtonGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { setUser } = useAppContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const lastDashboardPath = useRef<string | null>(null);
  const handling = useRef(false);

  const path = location.pathname.replace(/\/+$/, "") || "/";
  const isExitPage = path === "/" || path === LOGIN_PATH;

  useEffect(() => {
    if (!isExitPage) {
      lastDashboardPath.current = location.pathname + location.search;
      handling.current = false;
    }
  }, [isExitPage, location.pathname, location.search]);

  useEffect(() => {
    if (!isExitPage) return;
    if (handling.current) return;
    if (!lastDashboardPath.current) return;
    if (!isAuthenticated()) return;

    handling.current = true;
    // Undo the back navigation and ask what the user wants to do.
    navigate(lastDashboardPath.current, { replace: true });
    setOpen(true);
  }, [isExitPage, location.pathname, navigationType, navigate]);

  const handleLogout = async () => {
    setOpen(false);
    lastDashboardPath.current = null;

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }

    try {
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

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Do you want to log out?</AlertDialogTitle>
          <AlertDialogDescription>
            This takes you to the home or login screen. Do you want to log out or stay logged in?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>
            Stay logged in
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DashboardBackButtonGuard;
