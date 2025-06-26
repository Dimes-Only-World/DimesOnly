import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import RotatingBackground from "@/components/RotatingBackground";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import ForgotUsernameModal from "@/components/ForgotUsernameModal";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import bcrypt from "bcryptjs";

const backgroundImages = [
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_c50e34bf-23ac-46dd-9dd5-85b5b7279fdd.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_cce445b5-329a-4140-82d0-111f1ba6fc7e.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d49d90de-b2af-4870-9632-41b929d49efe.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d836d056-6ce5-4a36-ba3e-879622fba498.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d83e24cd-671a-4515-94fc-0973bd54ece5.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_c2328b2a-bc64-4eab-82ef-a8af1f237d6e-1320x811.png",
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
      let email = usernameOrEmail.trim();
      let userRecord = null;

      if (!isEmail(usernameOrEmail)) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from("users")
          .select("email, password_hash, *")
          .eq("username", usernameOrEmail.trim())
          .single();

        if (userError || !userData) {
          throw new Error("Invalid username or password");
        }

        email = userData.email;
        userRecord = userData;

        const passwordMatch = await bcrypt.compare(
          password,
          userData.password_hash
        );
        if (!passwordMatch) {
          throw new Error("Invalid username or password");
        }
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

      if (authError) {
        throw new Error("Invalid credentials");
      }

      if (!userRecord) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (userError || !userData) {
          throw new Error("User data not found");
        }

        userRecord = userData;
      }

      const user = {
        id: userRecord.id,
        username: userRecord.username,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        userType: userRecord.user_type,
        profilePhoto: userRecord.profile_photo,
        bannerPhoto: userRecord.banner_photo,
        mobileNumber: userRecord.mobile_number,
        address: userRecord.address,
        city: userRecord.city,
        state: userRecord.state,
        zip: userRecord.zip,
        gender: userRecord.gender,
        membershipType: userRecord.membership_type,
        tipsEarned: userRecord.tips_earned || 0,
        referralFees: userRecord.referral_fees || 0,
        overrides: userRecord.overrides || 0,
        weeklyHours: userRecord.weekly_hours || 0,
        isRanked: userRecord.is_ranked || false,
        rankNumber: userRecord.rank_number,
      };

      setUser(user);
      localStorage.setItem(
        "authToken",
        authData.session?.access_token || "authenticated"
      );
      sessionStorage.setItem("currentUser", userRecord.username);

      toast({
        title: "Login Successful!",
        description: `Welcome back, ${userRecord.username}!`,
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