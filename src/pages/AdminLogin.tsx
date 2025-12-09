import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AdminForgotModals } from '@/components/AdminForgotModals';
import { supabase } from '@/integrations/supabase/client';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        toast({
          title: 'Error',
          description: 'Invalid credentials',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Verify admin role server-side using security definer function
      const { data: isAdmin, error: roleError } = await supabase
        .rpc('is_admin');

      if (roleError) {
        console.error('Role check error:', roleError);
        await supabase.auth.signOut();
        toast({
          title: 'Error',
          description: 'Failed to verify admin privileges',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!isAdmin) {
        await supabase.auth.signOut();
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Admin verified server-side
      toast({
        title: 'Success',
        description: 'Admin login successful',
      });
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter admin email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter admin password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <button
              type="button"
              onClick={() => setShowForgotUsername(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Username?
            </button>
            <br />
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
        </CardContent>
      </Card>

      <AdminForgotModals
        showForgotUsername={showForgotUsername}
        showForgotPassword={showForgotPassword}
        onCloseUsername={() => setShowForgotUsername(false)}
        onClosePassword={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default AdminLogin;
