import React, { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // When arriving from email link, Supabase sets a recovery session automatically
    // We just verify there's a session available before allowing update
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
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
      // First, update the password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      // Get the current user's email to find the user record
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) {
        throw new Error("User email not found");
      }

      // Import bcrypt for password hashing
      const bcrypt = await import('bcryptjs');
      
      // Hash the new password for storage in our custom users table
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the password hash in our custom users table
      // This is CRITICAL for username login to work after password reset
      console.log('Syncing password for user:', authUser.email);
      
      try {
        // Find the user in our custom users table
        const { data: userData, error: fetchError } = await supabaseAdmin
          .from('users')
          .select('id, username, email, password_hash')
          .eq('email', authUser.email)
          .single();

        if (fetchError || !userData) {
          console.error('User not found in custom users table:', fetchError);
          throw new Error('User profile not found. Please contact support.');
        }

        // Update the password hash in the custom users table
        // This ensures username login works after password reset
        const userId = (userData as any).id;
        
        // Update password hash using admin client
        const { error: updateError } = await supabaseAdmin
          .from('users')
          // @ts-ignore - Bypassing TypeScript restrictions for password update
          .update({ 
            password_hash: hashedPassword,
            hash_type: 'bcrypt',
            updated_at: new Date().toISOString()
          })
          .eq('email', authUser.email);

        if (updateError) {
          console.error('Failed to update custom users table:', updateError);
          // Try again with ID instead of email
          const { error: retryError } = await supabaseAdmin
            .from('users')
            // @ts-ignore - Bypassing TypeScript restrictions for password update
            .update({ 
              password_hash: hashedPassword,
              hash_type: 'bcrypt',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (retryError) {
            console.error('Retry failed:', retryError);
            throw new Error('Failed to update password in database. Please try again.');
          }
        }

        console.log('✅ Password successfully synced for both Supabase Auth and custom users table');
        console.log('✅ User can now login with both username and email');
      } catch (updateErr: any) {
        console.error('Critical error syncing passwords:', updateErr);
        throw new Error(updateErr?.message || 'Failed to update password. Please try again.');
      }

      // Also update the Supabase Auth password to keep both systems in sync
      const { error: authUpdateError } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (authUpdateError) {
        console.error('Error updating Supabase Auth password:', authUpdateError);
      }


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
