import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const AdminEmailSettings = () => {
  const [email, setEmail] = useState('blackjackonelife@gmail.com');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate email update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem('adminEmail', email);
      toast({
        title: 'Success',
        description: 'Admin email updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Email Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email Address</Label>
            <Input
              id="adminEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter admin email"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Email'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminEmailSettings;