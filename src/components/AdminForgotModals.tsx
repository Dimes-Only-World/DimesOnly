import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AdminForgotModalsProps {
  showForgotUsername: boolean;
  showForgotPassword: boolean;
  onCloseUsername: () => void;
  onClosePassword: () => void;
}

export const AdminForgotModals: React.FC<AdminForgotModalsProps> = ({
  showForgotUsername,
  showForgotPassword,
  onCloseUsername,
  onClosePassword
}) => {
  const { toast } = useToast();

  const handleSendCredentials = async (type: 'username' | 'password') => {
    try {
      const response = await fetch(
        'https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/81148369-4a21-43ee-9d05-a25d11963f5d',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: `Admin ${type} sent to blackjackonelife@gmail.com`
        });
        if (type === 'username') onCloseUsername();
        else onClosePassword();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send credentials',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Dialog open={showForgotUsername} onOpenChange={onCloseUsername}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forgot Username</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Admin username will be sent to blackjackonelife@gmail.com</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleSendCredentials('username')}
                className="flex-1"
              >
                Send Username
              </Button>
              <Button 
                variant="outline" 
                onClick={onCloseUsername}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showForgotPassword} onOpenChange={onClosePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Admin password will be sent to blackjackonelife@gmail.com</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleSendCredentials('password')}
                className="flex-1"
              >
                Send Password
              </Button>
              <Button 
                variant="outline" 
                onClick={onClosePassword}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};