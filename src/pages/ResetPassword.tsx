import React, { useState, useEffect } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // When arriving from email link, Supabase sets a recovery session automatically
    // We just verify there's a session available before allowing update
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
      if (data.session?.user?.email) {
        setUserEmail(data.session.user.email);
      }
    };
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", description: "Make sure both fields match", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Get the current session for authorization
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("No active session. Please request a new password reset link.");
      }

      const email = sessionData.session.user.email;
      if (!email) {
        throw new Error("User email not found");
      }

      // First, update the password in Supabase Auth (this works with recovery session)
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        console.error('Supabase Auth update error:', authError);
        throw authError;
      }

      // Call the edge function to sync password to custom users table
      const response = await fetch(`${FUNCTIONS_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email,
          newPassword: password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Password sync error:', result);
        // The Supabase Auth password was updated, but sync failed
        // Still show success since the user can login with email
        console.warn('Custom table sync failed, but auth password was updated');
      }

      console.log('✅ Password successfully updated');

      toast({ title: "Password updated", description: "You can now log in with your new password" });
      
      // Sign out the user to force re-authentication with new password
      await supabase.auth.signOut();
      
      // Redirect to login
      window.location.replace("/login");
    } catch (err) {
      console.error('Password reset error:', err);
      toast({ 
        title: "Failed to update password", 
        description: "The recovery link may be expired. Try sending a new reset email.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Reset Password</h1>

        {!ready && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription>
              Open this page from the password reset email link. If you already did, the link might be expired—request a new reset email from the Login page.
            </AlertDescription>
          </Alert>
        )}

        {ready && userEmail && (
          <p className="text-sm text-muted-foreground">
            Resetting password for: <strong>{userEmail}</strong>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading || !ready} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
