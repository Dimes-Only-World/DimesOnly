import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ForgotUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotUsernameModal: React.FC<ForgotUsernameModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate username recovery email
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess(true);
      toast({
        title: "Username Recovery Email Sent",
        description: "Check your email for your username information.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send username recovery email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white/95 backdrop-blur-md border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            Forgot Username
          </DialogTitle>
        </DialogHeader>
        
        {success ? (
          <div className="py-6">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                Your username has been sent to your email address.
              </AlertDescription>
            </Alert>
            <Button onClick={handleClose} className="w-full mt-4">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username-email" className="text-gray-700">
                Email Address
              </Label>
              <Input
                id="username-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
                className="border-gray-300 focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Username"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotUsernameModal;