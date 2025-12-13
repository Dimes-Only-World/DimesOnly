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
  const [username, setUsername] = useState('');
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
      // Authenticate via edge function (username-based)
      const response = await fetch(
        `https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/authenticate-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast({
          title: 'Error',
          description: data.error || 'Invalid credentials',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if user has admin role using the check_admin_by_user_id function
      const { data: isAdminUser, error: roleError } = await supabase
        .rpc('check_admin_by_user_id', { _user_id: data.user.id });

      if (roleError || !isAdminUser) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Store admin session data (username-based auth doesn't use Supabase Auth)
      // This is validated server-side via edge function + admin role check
      sessionStorage.setItem('adminUser', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        isAdmin: true,
        loginTime: new Date().toISOString()
      }));

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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter admin username"
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
