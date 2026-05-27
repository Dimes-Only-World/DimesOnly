import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import RegistrationFormFields from "@/components/RegistrationFormFields";
import RotatingBackground from "@/components/RotatingBackground";
import BannerVideo from "@/components/BannerVideo";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import { useMobileLayout } from "@/hooks/use-mobile";
import { getReferralUsername } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";

const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;
const PHOTO_UPLOAD_ENDPOINT = `${FUNCTIONS_BASE_URL}/upload-photo`;
const VIDEO_UPLOAD_ENDPOINT = `${FUNCTIONS_BASE_URL}/upload-video`;
const REGISTER_ENDPOINT = `${FUNCTIONS_BASE_URL}/register-user`;

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
  profilePhoto?: string;
  bannerPhoto?: string;
  frontPagePhoto?: string;
  dateOfBirth: string;
}

interface UploadedVideoMeta {
  slot: string;
  contentTier: "free" | "silver" | "gold";
  storagePath: string;
  url: string;
  isNude: boolean;
  isXrated: boolean;
}

const backgroundImages = [
  "https://dimesonly.s3.us-east-2.amazonaws.com/342189-471x583-1.jpeg",
  "https://dimesonly.s3.us-east-2.amazonaws.com/image-18-2.jpg",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d49d90de-b2af-4870-9632-41b929d49efe.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d836d056-6ce5-4a36-ba3e-879622fba498.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d83e24cd-671a-4515-94fc-0973bd54ece5.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_96184858-4dad-438e-8884-105f6c880251.png",
];

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

const capitalizeWords = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");

const formatAddress = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");

const formatCity = (value: string) =>
  value
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const area = digits.slice(0, 3);
  const middle = digits.slice(3, 6);
  const line = digits.slice(6);
  if (digits.length > 6) return `(${area})${middle}-${line}`;
  if (digits.length > 3) return `(${area})${middle}`;
  if (digits.length > 0) return `(${area}`;
  return "";
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
    "dateOfBirth",
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
  const { setUser } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");
  const [bannerPhotoUrl, setBannerPhotoUrl] = useState<string>("");
  const [frontPagePhotoUrl, setFrontPagePhotoUrl] = useState<string>("");
  const [videoUrls, setVideoUrls] = useState<string[]>(["", "", ""]);
  const [videoErrors, setVideoErrors] = useState<string[]>(["", "", ""]);
  const [videoUploadMeta, setVideoUploadMeta] = useState<
    Record<number, UploadedVideoMeta | null>
  >({
    0: null,
    1: null,
    2: null,
  });
  const [showVideo, setShowVideo] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const { isMobile, getCardClasses, getPaddingClasses } = useMobileLayout();

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
    dateOfBirth: "",
    referredBy: getReferralUsername(searchParams),
  });

  const handleInputChange = (field: keyof FormData) => (value: string) => {
    let processedValue = value;

    if (field === "username") {
      processedValue = value.toLowerCase();
    } else if (field === "firstName" || field === "lastName") {
      processedValue = capitalizeWords(value);
    } else if (field === "city") {
      processedValue = formatCity(value);
    } else if (field === "address") {
      processedValue = formatAddress(value);
    } else if (field === "mobileNumber") {
      processedValue = formatPhoneNumber(value);
    }

    if (field === "gender") {
      const nextGender = processedValue;
      const shouldShowVideos =
        nextGender === "female" &&
        (formData.userType === "exotic" || formData.userType === "stripper");

      setFormData((prev) => ({
        ...prev,
        gender: nextGender,
        userType: nextGender === "female" ? prev.userType : "",
      }));
      setShowVideo(shouldShowVideos);
      if (!shouldShowVideos) {
        setVideoUrls(["", "", ""]);
        setVideoErrors(["", "", ""]);
        setVideoUploadMeta({ 0: null, 1: null, 2: null });
      }
      setErrors((prev) => ({
        ...prev,
        gender: undefined,
        userType: nextGender === "female" ? prev.userType : undefined,
      }));
      return;
    }

    if (field === "userType") {
      const shouldShowVideos = processedValue === "exotic" || processedValue === "stripper";
      setShowVideo(shouldShowVideos);
      if (!shouldShowVideos) {
        setVideoUrls(["", "", ""]);
        setVideoErrors(["", "", ""]);
        setVideoUploadMeta({ 0: null, 1: null, 2: null });
      }
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
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
      const response = await fetch(PHOTO_UPLOAD_ENDPOINT, {
        method: "POST",
        headers: SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : undefined,
        body: uploadFormData,
      });

      const responseText = await response.text();
      if (!response.ok) throw new Error(`Upload failed: ${response.status} - ${responseText}`);

      const result = JSON.parse(responseText);
      if (result.success && result.url) {
        if (field === "profilePhoto") {
          setProfilePhotoUrl(result.url);
          setErrors((prev) => ({ ...prev, profilePhoto: undefined }));
        } else if (field === "bannerPhoto") {
          setBannerPhotoUrl(result.url);
          setErrors((prev) => ({ ...prev, bannerPhoto: undefined }));
        } else if (field === "frontPagePhoto") {
          setFrontPagePhotoUrl(result.url);
          setErrors((prev) => ({ ...prev, frontPagePhoto: undefined }));
        }

        toast({
          title: "Upload Successful",
          description: `${field} uploaded successfully`,
        });
      } else {
        throw new Error(result.error || "Upload failed without error message");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unexpected upload error",
        variant: "destructive",
      });
    }
  };

  const handleVideoUpload =
    (slot: number) => async (file: File | null) => {
      if (!file) {
        setVideoUrls((prev) => {
          const next = [...prev];
          next[slot] = "";
          return next;
        });
        setVideoErrors((prev) => {
          const next = [...prev];
          next[slot] = "Video upload is required";
          return next;
        });
        setVideoUploadMeta((prev) => ({ ...prev, [slot]: null }));
        return;
      }

      if (!formData.username) {
        toast({
          title: "Username Required",
          description: "Please enter a username before uploading videos",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith("video/")) {
        toast({
          title: "Invalid File",
          description: "Please upload a video file.",
          variant: "destructive",
        });
        return;
      }

      const MAX_VIDEO_SIZE_MB = 200;
      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `Each video must be under ${MAX_VIDEO_SIZE_MB}MB.`,
          variant: "destructive",
        });
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("username", formData.username);
      uploadFormData.append("photoType", `video${slot + 1}`);
      uploadFormData.append("contentTier", slot === 0 ? "free" : slot === 1 ? "silver" : "gold");

      try {
        const response = await fetch(VIDEO_UPLOAD_ENDPOINT, {
          method: "POST",
          headers: SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : undefined,
          body: uploadFormData,
        });

        const responseText = await response.text();
        if (!response.ok) throw new Error(`Upload failed: ${response.status} - ${responseText}`);

        const result = JSON.parse(responseText);
        if (!result.success || !result.url)
          throw new Error(result.error || "Upload failed without error message");

        setVideoUrls((prev) => {
          const next = [...prev];
          next[slot] = result.url;
          return next;
        });
        setVideoErrors((prev) => {
          const next = [...prev];
          next[slot] = "";
          return next;
        });
        setVideoUploadMeta((prev) => ({
          ...prev,
          [slot]: {
            slot: result.slot ?? `video${slot + 1}`,
            contentTier: (result.contentTier ?? "free") as "free" | "silver" | "gold",
            storagePath: result.storagePath,
            url: result.url,
            isNude: Boolean(result.isNude),
            isXrated: Boolean(result.isXrated),
          },
        }));

        toast({
          title: "Upload Successful",
          description: `Video ${slot + 1} uploaded successfully`,
        });
      } catch (error) {
        console.error("Video upload error:", error);
        toast({
          title: "Upload Failed",
          description: error instanceof Error ? error.message : "Unexpected upload error",
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
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!formData.mobileNumber) newErrors.mobileNumber = "Phone number is required";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.zip) newErrors.zip = "Zip code is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (formData.gender === "female" && !formData.userType)
      newErrors.userType = "User type is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";

    if (!profilePhotoUrl) newErrors.profilePhoto = "Profile photo is required";
    if (!bannerPhotoUrl) newErrors.bannerPhoto = "Banner photo is required";
    if (!frontPagePhotoUrl) newErrors.frontPagePhoto = "Front page photo is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (showVideo) {
      const missingVideos = videoUrls
        .map((url, idx) => (!url ? idx : -1))
        .filter((idx) => idx !== -1);

      if (missingVideos.length > 0) {
        setVideoErrors((prev) => {
          const next = [...prev];
          missingVideos.forEach((idx) => {
            next[idx] = "Video upload is required";
          });
          return next;
        });
        toast({
          title: "Missing Videos",
          description: "Please upload all three required videos.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const validationErrors = validateRequired(formData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (!validateEmail(formData.email)) {
        throw new Error("Invalid email format");
      }

      if (!validatePassword(formData.password)) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Prepare video metadata for the edge function
      const metaEntries = Object.values(videoUploadMeta).filter(
        (meta): meta is UploadedVideoMeta => Boolean(meta),
      );

      // Call the register-user edge function
      const response = await fetch(REGISTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          mobileNumber: formData.mobileNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          gender: formData.gender,
          userType: formData.userType || 'normal',
          referredBy: formData.referredBy && formData.referredBy.trim() !== "" 
            ? formData.referredBy 
            : "Company",
          dateOfBirth: formData.dateOfBirth,
          profilePhotoUrl,
          bannerPhotoUrl,
          frontPagePhotoUrl,
          videoUrls,
          videoMeta: metaEntries.map(meta => ({
            slot: meta.slot,
            url: meta.url,
            storagePath: meta.storagePath,
            contentTier: meta.contentTier,
            isNude: meta.isNude,
            isXrated: meta.isXrated
          }))
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      if (!result.success || !result.user) {
        throw new Error(result.error || 'Registration failed');
      }

      // Sign in the user after successful registration
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error('Auto sign-in failed:', signInError);
        // Registration was successful, user can manually sign in
        toast({
          title: "Registration Successful!",
          description: "Please sign in with your new credentials.",
        });
        navigate("/login");
        return;
      }

      const userData = {
        id: result.user.id,
        username: result.user.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userType: formData.userType || '',
        gender: formData.gender || '',
        mobileNumber: formData.mobileNumber || '',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        zip: formData.zip || '',
      };
      sessionStorage.setItem("userData", JSON.stringify(userData));
      sessionStorage.setItem("currentUser", result.user.username);
      localStorage.setItem("authToken", signInData.session?.access_token || result.user.id || "authenticated");
      setUser(userData);

      toast({
        title: "Registration Successful!",
        description: "Welcome to Dimes Only!",
      });

      const userType = formData.userType || '';
      const username = formData.username || 'company';
      if (formData.gender === 'business_owner') {
        navigate(`/dashboard`);
      } else if (userType === 'stripper' || userType === 'exotic') {
        navigate(`/events-dimes-only?ref=${encodeURIComponent(username)}`);
      } else {
        navigate(`/eventsdimes?ref=${encodeURIComponent(username)}`);
      }
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
        <div className={`w-full ${isMobile ? "px-0" : "px-4"}`}>
          <div className={isMobile ? "w-full" : "max-w-4xl mx-auto"}>
            <div
              className={`${getCardClasses(
                "bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl"
              )} ${isMobile ? "rounded-none" : "rounded-lg"}`}
            >
              <div
                className={`text-center ${getPaddingClasses(
                  "py-6 px-8"
                )} border-b border-white/20`}
              >
                <h1 className="text-4xl font-bold text-white font-inter tracking-tight">
                  Join Dimes Only
                </h1>
                <p className="text-white/80 mt-2 font-inter">
                  Create your account and start your journey
                </p>
              </div>

              <div className={getPaddingClasses("p-8")}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <RegistrationFormFields
                    formData={formData}
                    errors={errors}
                    showUserType={showUserType}
                    showVideoUploads={showVideo}
                    handleInputChange={handleInputChange}
                    handleFileChange={handleFileChange}
                    profilePhotoUrl={profilePhotoUrl}
                    videoUrls={videoUrls}
                    videoErrors={videoErrors}
                    handleVideoUpload={handleVideoUpload}
                  />

                  {showVideo && (
                    <div className="mt-6 rounded-lg overflow-hidden shadow-lg">
                      <BannerVideo
                        src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Copy+of+Explain+form+confirm+FINAL.webm"
                        loop={false}
                      />
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
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      Sign in here
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-white/60 text-xs mt-6 max-w-2xl mx-auto">
              By creating an account, you agree to our Terms of Service and
              Privacy Policy. We are committed to keeping your information
              secure and ensuring a safe, inclusive community for all members.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
