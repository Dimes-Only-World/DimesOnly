import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import RegistrationFormFields from "@/components/RegistrationFormFields";
import RotatingBackground from "@/components/RotatingBackground";
import { useToast } from "@/hooks/use-toast";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobileNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  gender: string;
  userType: string;
  referredBy: string;
}

const backgroundImages = [
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_c50e34bf-23ac-46dd-9dd5-85b5b7279fdd.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_cce445b5-329a-4140-82d0-111f1ba6fc7e.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d49d90de-b2af-4870-9632-41b929d49efe.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d836d056-6ce5-4a36-ba3e-879622fba498.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d83e24cd-671a-4515-94fc-0973bd54ece5.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_c2328b2a-bc64-4eab-82ef-a8af1f237d6e-1320x811.png",
];

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

const validateRequired = (data: FormData): string[] => {
  const errors: string[] = [];
  const requiredFields: (keyof FormData)[] = [
    "firstName",
    "lastName",
    "username",
    "email",
    "password",
    "mobileNumber",
    "address",
    "city",
    "state",
    "zip",
    "gender",
  ];

  requiredFields.forEach((field) => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  if (data.gender === "female" && !data.userType) {
    errors.push("userType is required for female users");
  }

  return errors;
};

export const Register: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");
  const [bannerPhotoUrl, setBannerPhotoUrl] = useState<string>("");
  const [frontPagePhotoUrl, setFrontPagePhotoUrl] = useState<string>("");
  const [showVideo, setShowVideo] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobileNumber: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    gender: "",
    userType: "",
    referredBy: searchParams.get("ref") || "",
  });

  const handleInputChange = (field: keyof FormData) => (value: string) => {
    // Convert username to lowercase automatically
    const processedValue = field === "username" ? value.toLowerCase() : value;

    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field === "gender" && value === "male") {
      setFormData((prev) => ({ ...prev, userType: "" }));
      setShowVideo(false);
    } else if (field === "userType") {
      setShowVideo(value === "exotic" || value === "stripper");
    }
  };

  const handleFileChange = (field: string) => async (file: File | null) => {
    if (!file) return;
    if (!formData.username) {
      toast({
        title: "Username Required",
        description: "Please enter a username before uploading photos",
        variant: "destructive",
      });
      return;
    }

    const MAX_FILE_SIZE_MB = 50;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `Max file size is ${MAX_FILE_SIZE_MB}MB.`,
        variant: "destructive",
      });
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("username", formData.username);
    uploadFormData.append("photoType", field.replace("Photo", ""));

    try {
      const response = await fetch(
        "https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/5c970590-4f98-420e-8352-e90ae4b99fd6",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzOTc5NzMsImV4cCI6MjA2NDk3Mzk3M30.Uh-sEGCgMZKzCLLGOPLCVEJMWvG-YFKvxRPEr5mMJvI",
          },
          body: uploadFormData,
        }
      );

      const responseText = await response.text();
      if (!response.ok)
        throw new Error(`Upload failed: ${response.status} - ${responseText}`);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid JSON: ${responseText}`);
      }

      if (result.success && result.url) {
        if (field === "profilePhoto") setProfilePhotoUrl(result.url);
        else if (field === "bannerPhoto") setBannerPhotoUrl(result.url);
        else if (field === "frontPagePhoto") setFrontPagePhotoUrl(result.url);

        toast({
          title: "Upload Successful",
          description: `${field} uploaded successfully`,
        });
      } else {
        throw new Error(result.error || "Upload failed without error message");
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected upload error";
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!formData.mobileNumber)
      newErrors.mobileNumber = "Phone number is required";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.zip) newErrors.zip = "Zip code is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (formData.gender === "female" && !formData.userType)
      newErrors.userType = "User type is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Validate required fields
      const validationErrors = validateRequired(formData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      // Validate password match
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Validate email format
      if (!validateEmail(formData.email)) {
        throw new Error("Invalid email format");
      }

      // Validate password strength
      if (!validatePassword(formData.password)) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Check if username exists
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("username")
        .eq("username", formData.username)
        .single();

      if (existingUser) {
        throw new Error("Username already exists");
      }

      // Check if email exists
      const { data: existingEmail } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("email", formData.email)
        .single();

      if (existingEmail) {
        throw new Error("Email already registered");
      }

      // Create auth session first
      const { data: session, error: sessionError } = await supabase.auth.signUp(
        {
          email: formData.email,
          password: formData.password,
        }
      );

      if (sessionError) {
        throw new Error(`Failed to create session: ${sessionError.message}`);
      }

      if (!session.user) {
        throw new Error("Failed to create auth user");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(formData.password, 10);

      // Create user record with auth user ID
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert([
          {
            id: session.user.id, // Link to auth.users id
            username: formData.username,
            email: formData.email,
            password_hash: passwordHash,
            hash_type: "bcrypt",
            first_name: formData.firstName,
            last_name: formData.lastName,
            mobile_number: formData.mobileNumber,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            gender: formData.gender,
            user_type: formData.userType,
            referred_by: formData.referredBy,
            profile_photo: profilePhotoUrl,
            banner_photo: bannerPhotoUrl,
            front_page_photo: frontPagePhotoUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      // Store authentication info
      localStorage.setItem("authToken", session.user?.id || "authenticated");
      sessionStorage.setItem("currentUser", formData.username);

      toast({
        title: "Registration Successful!",
        description: "Welcome to Dimes Only!",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed";
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showUserType = formData.gender === "female";

  return (
    <div className="w-full min-h-screen relative">
      <RotatingBackground images={backgroundImages} interval={3000} />

      <div className="relative z-10 w-full min-h-screen py-8">
        <div className="w-full px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-lg">
              <div className="text-center py-6 px-8 border-b border-white/20">
                <h1 className="text-4xl font-bold text-white font-inter tracking-tight">
                  Join Dimes Only
                </h1>
                <p className="text-white/80 mt-2 font-inter">
                  Create your account and start your journey
                </p>
              </div>

              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <RegistrationFormFields
                    formData={formData}
                    errors={errors}
                    showUserType={showUserType}
                    handleInputChange={handleInputChange}
                    handleFileChange={handleFileChange}
                    profilePhotoUrl={profilePhotoUrl}
                  />

                  {showVideo && (
                    <div className="mt-6">
                      <video controls className="w-full rounded-lg shadow-lg">
                        <source
                          src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Explain+form+confirm+(1).mp4"
                          type="video/mp4"
                        />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-lg shadow-lg hover:scale-105 transition-all duration-200 font-semibold text-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <p className="text-sm text-white/80">
                    Already have an account?{" "}
                    <a
                      href="/login"
                      className="text-blue-300 hover:text-blue-200 hover:underline font-medium"
                    >
                      Sign In
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
