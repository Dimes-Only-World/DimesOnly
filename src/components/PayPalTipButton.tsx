/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const buttonRendered = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset button when amount changes
    if (buttonRendered.current && containerRef.current) {
      containerRef.current.innerHTML = "";
      buttonRendered.current = false;
    }

    if (tipAmount <= 0) {
      setIsLoading(false);
      return;
    }

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb";
    const scriptUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;

    const existingScript = document.querySelector(`script[src*="${clientId}"]`);

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.onload = renderButton;
      script.onerror = () => setError("Failed to load PayPal SDK");
      document.body.appendChild(script);
    } else if (window.paypal) {
      renderButton();
    }

    function renderButton() {
      if (buttonRendered.current || !containerRef.current || tipAmount <= 0) {
        return;
      }

      try {
        setIsLoading(true);
        buttonRendered.current = true;

        window.paypal
          .Buttons({
            createOrder: function (data: any, actions: any) {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: tipAmount.toFixed(2),
                    },
                    custom_id: JSON.stringify({
                      tipped_username: tippedUsername,
                      referrer_username: referrerUsername,
                      tipper_username: tipperUsername,
                      tip_amount: tipAmount,
                    }),
                  },
                ],
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
              console.error("PayPal error:", err);
              setError("Payment failed. Please try again.");
              buttonRendered.current = false;
            },
          })
          .render(containerRef.current)
          .then(() => {
            setIsLoading(false);
          })
          .catch((err: any) => {
            console.error("PayPal render error:", err);
            setError("Failed to initialize PayPal button");
            setIsLoading(false);
            buttonRendered.current = false;
          });
      } catch (err) {
        console.error("PayPal button error:", err);
        setError("Failed to initialize PayPal button");
        setIsLoading(false);
        buttonRendered.current = false;
      }
    }
  }, [tipAmount, tippedUsername, referrerUsername, tipperUsername, onSuccess]);

  if (tipAmount <= 0) {
    return (
      <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-600">Please select a tip amount above $0</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600">{error}</p>
        <Button
          onClick={() => {
            setError(null);
            buttonRendered.current = false;
            if (containerRef.current) {
              containerRef.current.innerHTML = "";
            }
          }}
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
          <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
          <span className="ml-2 text-white">Loading PayPal...</span>
        </div>
      )}
      <div ref={containerRef} className={isLoading ? "hidden" : ""} />
    </div>
  );
};

export default PayPalTipButton;
