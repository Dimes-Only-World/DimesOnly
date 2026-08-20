import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import RotatingBackground from "@/components/RotatingBackground";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import ForgotUsernameModal from "@/components/ForgotUsernameModal";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const backgroundImages = [
  "https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_45c765ef-2fe4-4658-8281-ff6cae9e2618.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/image-31-1.jpg",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d49d90de-b2af-4870-9632-41b929d49efe.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/image-27-1.jpg",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d83e24cd-671a-4515-94fc-0973bd54ece5.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/eroticgirl_7dd2dfc3-d1ef-4f54-af34-f5ea901d4125-768x1250.png"
];

const Login: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAppContext();
  const { toast } = useToast();
  const currentRef = searchParams.get('ref');
  const registerUrl = currentRef ? `/register?ref=${encodeURIComponent(currentRef)}` : "/register?ref=company";

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

      // Handle rate limiting (still uses 429 status)
      if (response.status === 429) {
        throw new Error(result.message || 'Too many login attempts. Please try again later.');
      }

      // Check for auth failure in response body (200 with success: false)
      if (!result.success) {
        throw new Error(result.error || result.message || 'Invalid credentials');
      }

      if (!result.user) {
        throw new Error('Authentication failed');
      }

      const userData = result.user;

      const user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        created_at: userData.created_at || userData.createdAt || null,
        createdAt: userData.created_at || userData.createdAt || null,
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
        membershipTier: userData.membership_tier,
        tipsEarned: userData.tips_earned || 0,
        referralFees: userData.referral_fees || 0,
        overrides: userData.overrides || 0,
        weeklyHours: userData.weekly_hours || 0,
        isRanked: userData.is_ranked || false,
        rankNumber: userData.rank_number,
      };

      // Store auth token FIRST so AuthGuard sees it immediately
      localStorage.setItem("authToken", result.token || `authenticated_${userData.id}`);
      if (result.push_auth_token) {
        sessionStorage.setItem("dimesPushAuthToken", String(result.push_auth_token));
      }
      sessionStorage.setItem("currentUser", userData.username);
      sessionStorage.setItem("userData", JSON.stringify(user));
      // Reset upgrade popup flags so the offer shows on every login
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("upgrade_popup_shown_"))
        .forEach((k) => sessionStorage.removeItem(k));
      // Give login-scoped dashboard announcements a fresh identity on every sign-in.
      sessionStorage.setItem(
        "dimes_login_instance",
        `${userData.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      );
      sessionStorage.removeItem("mansion_party_popup_shown_v2");
      sessionStorage.removeItem("mansion_party_popup_shown_v3");

      setUser(user);
      window.dispatchEvent(new CustomEvent("dimes-auth-session-ready"));

      toast({
        title: "Login Successful!",
        description: `Welcome back, ${userData.username}!`,
      });

      // Navigate immediately - don't wait for Supabase Auth sync
      navigate("/dashboard", { replace: true });

      // Fire-and-forget: sync Supabase Auth session in the background
      const emailForSync = isEmail(identifier) ? identifier : userData.email;
      if (emailForSync) {
        supabase.auth.signInWithPassword({
          email: emailForSync,
          password: password,
        }).then(({ data }) => {
          if (data.session?.user) {
            localStorage.setItem("authToken", data.session.access_token);
            window.dispatchEvent(new CustomEvent("dimes-auth-session-ready"));
          }
        }).catch(() => {
          console.log('Supabase Auth session sync skipped');
        });
      }
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:bg-white/20 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
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
                        to={registerUrl}
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
