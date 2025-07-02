import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import {
  DollarSign,
  Heart,
  CreditCard,
  User,
  MapPin,
  Star,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Gift,
} from "lucide-react";
import { useMobileLayout } from "@/hooks/use-mobile";

interface UserData {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
  bio?: string;
}

interface PaymentFormData {
  paymentMethod: "paypal" | "debit_card" | "";
  // Card details for Stripe/debit processing
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardHolderName: string;
  // Billing address
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
}

const TipPage: React.FC = () => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getContainerClasses, getContentClasses, getCardClasses } =
    useMobileLayout();

  // URL parameters
  const tipUsername = searchParams.get("tip") || "";
  const referrerUsername = searchParams.get("ref") || "";

  // State
  const [targetUser, setTargetUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState("");
  const [tipMessage, setTipMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [submittingTip, setSubmittingTip] = useState(false);

  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    paymentMethod: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cardHolderName: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
  });

  // Predefined tip amounts
  const quickTipAmounts = [1, 5, 10, 20, 50, 100, 200, 500];

  useEffect(() => {
    if (tipUsername) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [tipUsername]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, profile_photo, city, state, user_type, bio")
        .eq("username", tipUsername.trim())
        .single();

      if (error) {
        console.error("Error fetching user:", error);
        toast({
          title: "User Not Found",
          description: `Could not find user @${tipUsername}`,
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setTargetUser(data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTip = (amount: number) => {
    setTipAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value) || 0;
    setTipAmount(numValue);
  };

  const handleTipSubmit = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to send tips",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!targetUser) {
      toast({
        title: "Error",
        description: "Target user not found",
        variant: "destructive",
      });
      return;
    }

    if (tipAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid tip amount",
        variant: "destructive",
      });
      return;
    }

    if (tipAmount < 1) {
      toast({
        title: "Minimum Amount",
        description: "Minimum tip amount is $1.00",
        variant: "destructive",
      });
      return;
    }

    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentFormData.paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    // Validate card details if debit card is selected
    if (paymentFormData.paymentMethod === "debit_card") {
      const requiredFields = [
        "cardNumber",
        "expiryMonth",
        "expiryYear",
        "cvv",
        "cardHolderName",
      ];
      const missingField = requiredFields.find(
        (field) => !paymentFormData[field as keyof PaymentFormData]
      );

      if (missingField) {
        toast({
          title: "Missing Information",
          description: "Please fill in all card details",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmittingTip(true);

    try {
      // Create payment record first
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount: tipAmount,
          payment_status: "pending",
          payment_type: "tip",
          referred_by: referrerUsername || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create tip transaction record
      const { data: tipTransaction, error: tipError } = await supabase
        .from("tips_transactions")
        .insert({
          tipper_user_id: user.id,
          tipped_username: targetUser!.username,
          tipped_user_id: targetUser!.id,
          tip_amount: tipAmount,
          message: tipMessage || null,
          is_anonymous: isAnonymous,
          payment_method: paymentFormData.paymentMethod,
          payment_id: payment.id,
          referrer_username: referrerUsername || null,
          referrer_commission: referrerUsername ? tipAmount * 0.2 : 0, // 20% referrer commission
          tickets_generated: Math.floor(tipAmount), // 1 ticket per dollar
        })
        .select()
        .single();

      if (tipError) throw tipError;

      if (paymentFormData.paymentMethod === "paypal") {
        // Handle PayPal payment
        await handlePayPalPayment(payment.id);
      } else {
        // Handle debit card payment (would integrate with Stripe or similar)
        await handleDebitCardPayment(payment.id, tipTransaction.id);
      }
    } catch (error) {
      console.error("Error processing tip:", error);
      toast({
        title: "Error",
        description: "Failed to process tip. Please try again.",
        variant: "destructive",
      });
      setSubmittingTip(false);
    }
  };

  const handlePayPalPayment = async (paymentId: string) => {
    try {
      // Create PayPal order using Supabase Edge Function
      const { data: paypalData, error: paypalError } =
        await supabase.functions.invoke("create-paypal-order", {
          body: {
            amount: tipAmount,
            description: `Tip for @${targetUser!.username}`,
            paymentId: paymentId,
            returnUrl: `${window.location.origin}/tip?payment=success&tip=${
              targetUser!.username
            }`,
            cancelUrl: `${window.location.origin}/tip?payment=cancelled&tip=${
              targetUser!.username
            }`,
          },
        });

      if (paypalError) {
        console.error("PayPal API Error:", paypalError);
        throw new Error(
          `Failed to create PayPal order: ${paypalError.message}`
        );
      }

      const { approval_url } = paypalData;

      if (approval_url) {
        // Redirect to PayPal
        window.location.href = approval_url;
      } else {
        throw new Error("No approval URL received from PayPal");
      }
    } catch (error) {
      console.error("Error creating PayPal payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to create PayPal payment. Please try again.",
        variant: "destructive",
      });
      setSubmittingTip(false);
    }
  };

  const handleDebitCardPayment = async (
    paymentId: string,
    tipTransactionId: string
  ) => {
    try {
      // In a real implementation, you would integrate with Stripe or similar
      // For now, we'll simulate a successful payment

      // Update payment record
      const { error: updatePaymentError } = await supabase
        .from("payments")
        .update({
          payment_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (updatePaymentError) throw updatePaymentError;

      // Update tip transaction
      const { error: updateTipError } = await supabase
        .from("tips_transactions")
        .update({
          payment_status: "completed",
          completed_at: new Date().toISOString(),
          card_last_four: paymentFormData.cardNumber.slice(-4),
          card_brand: "Visa", // Would get this from card processing
        })
        .eq("id", tipTransactionId);

      if (updateTipError) throw updateTipError;

      toast({
        title: "Tip Sent Successfully!",
        description: `You tipped @${targetUser!.username} $${tipAmount.toFixed(
          2
        )}`,
      });

      // Reset form and close dialog
      setShowPaymentDialog(false);
      resetForm();

      // Redirect to success page or back to profile
      setTimeout(() => {
        navigate(
          `/rate?rate=${targetUser!.username}${
            referrerUsername ? `&ref=${referrerUsername}` : ""
          }`
        );
      }, 2000);
    } catch (error) {
      console.error("Error processing debit card payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to process card payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingTip(false);
    }
  };

  const resetForm = () => {
    setTipAmount(0);
    setCustomAmount("");
    setTipMessage("");
    setIsAnonymous(false);
    setPaymentFormData({
      paymentMethod: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      cardHolderName: "",
      billingAddress: "",
      billingCity: "",
      billingState: "",
      billingZip: "",
    });
  };

  const updatePaymentFormData = (
    field: keyof PaymentFormData,
    value: string
  ) => {
    setPaymentFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading user information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md">
          <CardContent className="p-8 text-center">
            <Gift className="w-16 h-16 text-pink-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Send a Tip</h2>
            <p className="text-gray-300 mb-4">
              Enter a username in the URL to send them a tip!
            </p>
            <p className="text-sm text-gray-400">Example: /tip?tip=username</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 text-white">
      <div className={getContainerClasses()}>
        <div className={getContentClasses()}>
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-pink-400 mb-4">
              Send a Tip
            </h1>
            <p className="text-gray-300">Show your appreciation with a tip</p>
          </div>

          {/* User Profile Section */}
          <Card
            className={`bg-white/10 backdrop-blur border-white/20 mb-8 ${getCardClasses()}`}
          >
            <CardContent className={getContentClasses()}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <img
                  src={targetUser.profile_photo || "/placeholder.svg"}
                  alt={targetUser.username}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-pink-400"
                />
                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl font-bold text-pink-400 mb-2">
                    @{targetUser.username}
                  </h2>
                  <div className="flex flex-col sm:flex-row items-center gap-2 text-gray-300 mb-2">
                    <Badge className="bg-pink-600 text-white">
                      {targetUser.user_type}
                    </Badge>
                    {targetUser.city && targetUser.state && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {targetUser.city}, {targetUser.state}
                        </span>
                      </div>
                    )}
                  </div>
                  {targetUser.bio && (
                    <p className="text-gray-400 text-sm">{targetUser.bio}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tip Form */}
          <Card
            className={`bg-white/10 backdrop-blur border-white/20 mb-8 ${getCardClasses()}`}
          >
            <CardHeader>
              <CardTitle className="text-pink-400 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Choose Tip Amount
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Tip Buttons */}
              <div>
                <Label className="text-white mb-3 block">Quick Amounts</Label>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {quickTipAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={tipAmount === amount ? "default" : "outline"}
                      onClick={() => handleQuickTip(amount)}
                      className={`${
                        tipAmount === amount
                          ? "bg-pink-600 hover:bg-pink-700 text-white"
                          : "border-white/20 text-white hover:bg-white/10"
                      }`}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <Label className="text-white mb-2 block">Custom Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Enter amount"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Current Amount Display */}
              {tipAmount > 0 && (
                <div className="text-center p-4 bg-pink-600/20 border border-pink-400/30 rounded-lg">
                  <div className="text-3xl font-bold text-pink-400">
                    ${tipAmount.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-300 mt-1">
                    {Math.floor(tipAmount)} jackpot ticket
                    {Math.floor(tipAmount) !== 1 ? "s" : ""} included
                  </p>
                </div>
              )}

              {/* Tip Message */}
              <div>
                <Label className="text-white mb-2 block">
                  Message (Optional)
                </Label>
                <Textarea
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  placeholder="Send a nice message with your tip..."
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  rows={3}
                />
              </div>

              {/* Anonymous Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500"
                />
                <Label htmlFor="anonymous" className="text-white">
                  Send anonymously
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleTipSubmit}
                disabled={tipAmount <= 0 || !user}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-3"
              >
                <Gift className="w-5 h-5 mr-2" />
                Send Tip - ${tipAmount.toFixed(2)}
              </Button>

              {!user && (
                <p className="text-center text-gray-400 text-sm">
                  Please log in to send tips
                </p>
              )}
            </CardContent>
          </Card>

          {/* Referrer Info */}
          {referrerUsername && (
            <Card
              className={`bg-yellow-600/20 border-yellow-400/30 ${getCardClasses()}`}
            >
              <CardContent className={getContentClasses()}>
                <div className="flex items-center gap-2 text-yellow-300">
                  <Star className="w-4 h-4" />
                  <span className="text-sm">
                    Referred by @{referrerUsername} (20% commission)
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Choose Payment Method - ${tipAmount.toFixed(2)}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Select how you'd like to pay for your tip
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] space-y-6">
            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Payment Method *
              </Label>
              <Select
                value={paymentFormData.paymentMethod}
                onValueChange={(value: "paypal" | "debit_card") =>
                  updatePaymentFormData("paymentMethod", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      PayPal (Redirects to PayPal)
                    </div>
                  </SelectItem>
                  <SelectItem value="debit_card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Debit/Credit Card
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Card Payment Form */}
            {paymentFormData.paymentMethod === "debit_card" && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Card Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label
                      htmlFor="cardNumber"
                      className="text-sm font-medium text-gray-700"
                    >
                      Card Number *
                    </Label>
                    <Input
                      id="cardNumber"
                      value={paymentFormData.cardNumber}
                      onChange={(e) =>
                        updatePaymentFormData("cardNumber", e.target.value)
                      }
                      placeholder="1234 5678 9012 3456"
                      className="mt-1"
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label
                        htmlFor="expiryMonth"
                        className="text-sm font-medium text-gray-700"
                      >
                        Month *
                      </Label>
                      <Select
                        value={paymentFormData.expiryMonth}
                        onValueChange={(value) =>
                          updatePaymentFormData("expiryMonth", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (month) => (
                              <SelectItem
                                key={month}
                                value={month.toString().padStart(2, "0")}
                              >
                                {month.toString().padStart(2, "0")}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor="expiryYear"
                        className="text-sm font-medium text-gray-700"
                      >
                        Year *
                      </Label>
                      <Select
                        value={paymentFormData.expiryYear}
                        onValueChange={(value) =>
                          updatePaymentFormData("expiryYear", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="YYYY" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: 10 },
                            (_, i) => new Date().getFullYear() + i
                          ).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor="cvv"
                        className="text-sm font-medium text-gray-700"
                      >
                        CVV *
                      </Label>
                      <Input
                        id="cvv"
                        value={paymentFormData.cvv}
                        onChange={(e) =>
                          updatePaymentFormData("cvv", e.target.value)
                        }
                        placeholder="123"
                        className="mt-1"
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="cardHolderName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Cardholder Name *
                    </Label>
                    <Input
                      id="cardHolderName"
                      value={paymentFormData.cardHolderName}
                      onChange={(e) =>
                        updatePaymentFormData("cardHolderName", e.target.value)
                      }
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PayPal Info */}
            {paymentFormData.paymentMethod === "paypal" && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Wallet className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">PayPal Payment</p>
                      <p>
                        You will be redirected to PayPal to complete your
                        payment securely.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Notice */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Secure Payment</p>
                    <ul className="space-y-1 text-xs">
                      <li>
                        • Your payment information is encrypted and secure
                      </li>
                      <li>
                        • {Math.floor(tipAmount)} jackpot ticket
                        {Math.floor(tipAmount) !== 1 ? "s" : ""} will be added
                        automatically
                      </li>
                      {referrerUsername && (
                        <li>
                          • @{referrerUsername} will receive 20% referral
                          commission
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={submittingTip}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={!paymentFormData.paymentMethod || submittingTip}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {submittingTip ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Send Tip ${tipAmount.toFixed(2)}
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TipPage;
