import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PayPalTipButtonProps {
  tipAmount: number;
  tippedUsername: string;
  referrerUsername?: string;
  tipperUsername: string;
  onSuccess?: (details: any) => void;
}

const PayPalTipButton: React.FC<PayPalTipButtonProps> = ({
  tipAmount,
  tippedUsername,
  referrerUsername,
  tipperUsername,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.paypal) {
      const script = document.createElement('script');
      script.src = 'https://www.paypal.com/sdk/js?client-id=AYmkL9OpNkKLT376KrykXutN9bmx4GmU-HsNoDL-98zlWFBBnd65_dYCdGO4jOpCzwj8ohLVaLam_Ylc&currency=USD';
      script.async = true;
      script.onload = renderButton;
      script.onerror = () => setError('Failed to load PayPal SDK');
      document.body.appendChild(script);
    } else {
      renderButton();
    }

    function renderButton() {
      try {
        window.paypal.Buttons({
          createOrder: function (data: any, actions: any) {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: tipAmount.toFixed(2)
                },
                custom_id: JSON.stringify({
                  tipped_username: tippedUsername,
                  referrer_username: referrerUsername,
                  tipper_username: tipperUsername,
                  tip_amount: tipAmount
                })
              }]
            });
          },

          onApprove: function (data: any, actions: any) {
            return actions.order.capture().then(function (details: any) {
              if (onSuccess) {
                onSuccess(details);
              } else {
                alert(`Thank you for tipping ${tippedUsername}!`);
              }
            });
          },

          onError: function (err: any) {
            console.error('PayPal error:', err);
            setError('Payment failed. Please try again.');
          }
        }).render('#paypal-button-container');
        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize PayPal button');
        setIsLoading(false);
      }
    }
  }, [tipAmount, tippedUsername, referrerUsername, tipperUsername, onSuccess]);

  if (error) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600">{error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading PayPal...</span>
        </div>
      )}
      <div id="paypal-button-container" className={isLoading ? 'hidden' : ''} />
    </div>
  );
};

export default PayPalTipButton;