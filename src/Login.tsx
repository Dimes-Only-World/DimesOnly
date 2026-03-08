import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import RotatingBackground from "@/components/RotatingBackground";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import ForgotUsernameModal from "@/components/ForgotUsernameModal";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const backgroundImages = [
  'https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_ea2691d7-25a7-4cd7-8d4e-cf4826e6c1c3.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/Kennadie+45.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_96184858-4dad-438e-8884-105f6c880251.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/eroticgirl_7dd2dfc3-d1ef-4f54-af34-f5ea901d4125-768x1250.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d83e24cd-671a-4515-94fc-0973bd54ece5.png'
];

const Login: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const { toast } = useToast();

  const isEmail = (input: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const identifier = usernameOrEmail.trim();
      
      // Use server-side authentication via edge function
      // This keeps password verification secure on the server
      const response = await fetch(`${SUPABASE_URL}/functions/v1/authenticate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: identifier,
          password: password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(result.message || 'Too many login attempts. Please try again later.');
        }
        throw new Error(result.message || 'Invalid credentials');
      }

      if (!result.success || !result.user) {
        throw new Error('Authentication failed');
      }

      const userData = result.user;

      // Also sign in with Supabase Auth if it's an email login for session management
      if (isEmail(identifier)) {
        await supabase.auth.signInWithPassword({
          email: identifier,
          password: password,
        });
      } else if (userData.email) {
        // Try to sign in with the user's email for session management
        await supabase.auth.signInWithPassword({
          email: userData.email,
          password: password,
        }).catch(() => {
          // Silently ignore if Supabase Auth sync fails - edge function auth is primary
          console.log('Supabase Auth session sync skipped');
        });
      }

      const user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName || userData.first_name,
        lastName: userData.lastName || userData.last_name,
        userType: userData.user_type,
        profilePhoto: userData.profile_photo,
        bannerPhoto: userData.banner_photo,
        mobileNumber: userData.mobile_number,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        zip: userData.zip,
        gender: userData.gender,
        membershipType: userData.membership_type,
        tipsEarned: userData.tips_earned || 0,
        referralFees: userData.referral_fees || 0,
        overrides: userData.overrides || 0,
        weeklyHours: userData.weekly_hours || 0,
        isRanked: userData.is_ranked || false,
        rankNumber: userData.rank_number,
      };

      setUser(user);
      localStorage.setItem("authToken", result.token || "authenticated");
      sessionStorage.setItem("currentUser", userData.username);

      toast({
        title: "Login Successful!",
        description: `Welcome back, ${userData.username}!`,
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen relative">
      <RotatingBackground images={backgroundImages} interval={3000} />

      <div className="relative z-10 w-full min-h-screen flex items-center justify-center py-8">
        <div className="w-full px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-lg">
              <div className="text-center py-6 px-8 border-b border-white/20">
                <h1 className="text-4xl font-bold text-white font-inter tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-white/80 mt-2 font-inter">
                  Sign in to your account
                </p>
              </div>

              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert
                      variant="destructive"
                      className="bg-red-500/10 border-red-500/20"
                    >
                      <AlertDescription className="text-red-200">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="usernameOrEmail"
                      className="text-white font-medium"
                    >
                      Username or Email
                    </Label>
                    <Input
                      id="usernameOrEmail"
                      type="text"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      required
                      placeholder="Enter your username or email"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:bg-white/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-white font-medium"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:bg-white/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-lg shadow-lg hover:scale-105 transition-all duration-200 font-semibold text-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                <div className="mt-6 space-y-3">
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowForgotUsername(true)}
                      className="text-sm text-blue-300 hover:text-blue-200 hover:underline font-medium transition-colors"
                    >
                      Forgot Username?
                    </button>
                    <span className="text-white/40">•</span>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-blue-300 hover:text-blue-200 hover:underline font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  
                  <div className="text-center pt-2">
                    <p className="text-sm text-white/80">
                      Don't have an account?{" "}
                      <Link
                        to="/register"
                        className="text-blue-300 hover:text-blue-200 hover:underline font-medium"
                      >
                        Sign up
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
      
      <ForgotUsernameModal
        isOpen={showForgotUsername}
        onClose={() => setShowForgotUsername(false)}
      />
    </div>
  );
};

export default Login;
