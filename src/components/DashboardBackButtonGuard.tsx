import { useEffect, useState } from "react";
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
const PREV_PATH_KEY = "backGuardPreviousPath";
const SHOW_DIALOG_KEY = "showBackGuardDialog";

export const DashboardBackButtonGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const isDashboard = location.pathname.startsWith("/dashboard");
  console.log("[BackGuardReact] render", location.pathname, isDashboard);

  // Remember the current dashboard path so the inline script can detect a
  // back-button navigation from dashboard to login.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isDashboard) {
      sessionStorage.setItem(PREV_PATH_KEY, location.pathname);
    } else if (location.pathname === LOGIN_PATH) {
      // Keep the previous dashboard path around briefly in case the inline
      // script already consumed it; otherwise clear it on other pages.
      // We do not clear it here because the inline script may need it.
    } else {
      sessionStorage.removeItem(PREV_PATH_KEY);
    }
  }, [isDashboard, location.pathname]);

  // Show the dialog when the inline script has intercepted a back-to-login.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (sessionStorage.getItem(SHOW_DIALOG_KEY) === "true") {
      sessionStorage.removeItem(SHOW_DIALOG_KEY);
      setOpen(true);
    }
  }, [location.pathname]);

  const handleStay = () => {
    setOpen(false);
  };

  const handleLogout = async () => {
    setOpen(false);
    sessionStorage.removeItem(PREV_PATH_KEY);

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
