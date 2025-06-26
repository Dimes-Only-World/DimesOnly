import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface EventDisclaimerProps {
  showDisclaimer: boolean;
  setShowDisclaimer: (show: boolean) => void;
  onConfirm: () => void;
  onDeny: () => void;
}

const EventDisclaimer: React.FC<EventDisclaimerProps> = ({ 
  showDisclaimer, 
  setShowDisclaimer, 
  onConfirm, 
  onDeny 
}) => {
  return (
    <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Event Attendance Disclaimer</DialogTitle>
          <DialogDescription className="text-gray-300">
            BY PRESSING CONFIRM YOU UNDERSTAND THE FOLLOWING:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-white">
            If I do not attend event I am subject to a fine of 50% of max door sale deducted from my earning.
          </p>
          <p className="text-white">
            If I do not have the earning to cover fine, I will be sent a invoice to cover said fine 30 days after event.
          </p>
          <p className="text-yellow-400 font-bold">
            Press confirm to solidify your spot
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={onConfirm}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              CONFIRM
            </Button>
            <Button
              onClick={onDeny}
              className="bg-red-600 hover:bg-red-700 text-white px-8"
            >
              DENY
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDisclaimer;