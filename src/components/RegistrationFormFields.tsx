import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import FileUploadField from "@/components/FileUploadField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface RegistrationFormFieldsProps {
  formData: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  showUserType: boolean;
  handleInputChange: (field: keyof FormData) => (value: string) => void;
  handleFileChange: (field: string) => (file: File | null) => void;
  profilePhotoUrl: string;
  videoUrls: string[];
  videoErrors: string[];
  handleVideoUpload: (slot: number) => (file: File | null) => void;
}

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const RegistrationFormFields: React.FC<RegistrationFormFieldsProps> = ({
  formData,
  errors,
  showUserType,
  handleInputChange,
  handleFileChange,
  profilePhotoUrl,
  videoUrls,
  videoErrors,
  handleVideoUpload,
}) => {
  return (
    <div className="space-y-6">
      {/* Personal Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-white/20 pb-2">
          Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="firstName"
              className="text-sm font-medium text-white"
            >
              First Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName")(e.target.value)}
              className="bg-white/10 border-white/30 text-white placeholder-yellow/60 focus:border-yellow-400 focus:ring-blue-400"
              placeholder="Enter your first name"
            />
            {errors.firstName && (
              <p className="text-red-400 text-sm">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="lastName"
              className="text-sm font-medium text-white"
            >
              Last Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName")(e.target.value)}
              className="bg-white/10 border-white/30 text-white placeholder-white/60 focus:border-yellow-400 focus:ring-blue-400"
              placeholder="Enter your last name"
            />
            {errors.lastName && (
              <p className="text-red-400 text-sm">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="text-sm font-medium text-white">
            Date of Birth <span className="text-red-400">*</span>
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange("dateOfBirth")(e.target.value)}
            className="bg-white/10 border-white/30 text-white focus:border-yellow-400 focus:ring-blue-400"
          />
          {errors.dateOfBirth && (
            <p className="text-red-400 text-sm">{errors.dateOfBirth}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-white">
            Username <span className="text-red-400">*</span>
          </Label>
          <Input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange("username")(e.target.value)}
            className="bg-white/10 border-white/30 text-white placeholder-white/60 focus:border-yellow-400 focus:ring-blue-400"
            placeholder="Choose a unique username"
            disabled={false}
          />
          {errors.username && (
            <p className="text-red-400 text-sm">{errors.username}</p>
          )}
          {formData.gender === "male" && (
            <p className="text-blue-300 text-xs">
              Choose your preferred username
            </p>
          )}
        </div>
      </div>

      {/* Account Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-white/20 pb-2">
          Account Information
        </h3>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-white">
            Email <span className="text-red-400">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email")(e.target.value)}
            className="bg-white/10 border-white/30 text-white placeholder-white/60 focus:border-yellow-400 focus:ring-blue-400"
            placeholder="Enter your email address"
          />
          {errors.email && (
            <p className="text-red-400 text-sm">{errors.email}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-white"
            >
              Password <span className="text-red-400">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password")(e.target.value)}
              className="bg-white/10 border-white/30 text-white placeholder-white/60 focus:border-yellow-400 focus:ring-blue-400"
              placeholder="Create a secure password"
            />
            {errors.password && (
              <p className="text-red-400 text-sm">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-white"
            >
              Confirm Password <span className="text-red-400">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword")(e.target.value)
              }
              className="bg-white/10 border-white/30 text-white placeholder-white/60 focus:border-yellow-400 focus:ring-blue-400"
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-white/20 pb-2">
          Contact Information
        </h3>

        <div className="space-y-2">
          <Label
            htmlFor="mobileNumber"
            className="text-sm font-medium text-white"
          >
            Mobile Number <span className="text-red-400">*</span>
          </Label>
          <Input
            id="mobileNumber"
            type="tel"
            value={formData.mobileNumber}
            onChange={(e) => handleInputChange("mobileNumber")(e.target.value)}
            className="bg-white/10 border-white/30 text-white placeholder-white/60 focus:border-yellow-400 focus:ring-blue-400"
            placeholder="Enter your phone number"
          />
          {errors.mobileNumber && (
            <p className="text-red-400 text-sm">{errors.mobileNumber}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium text-white">
            Address <span className="text-red-400">*</span>
          </Label>
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange("address")(e.target.value)}
            className="bg-white/10 border-white/30 text-white placeholder-white/60 focus:border-yellow-400 focus:ring-blue-400"
            placeholder="Enter your street address"
          />
          {errors.address && (
            <p className="text-red-400 text-sm">{errors.address}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city" className="text-sm font-medium text-white">
              City <span className="text-red-400">*</span>
            </Label>
            <Input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange("city")(e.target.value)}
              className="bg-white/10 border-white/30 text-white placeholder-white/60 focus:border-yellow-400 focus:ring-blue-400"
              placeholder="City"
            />
            {errors.city && (
              <p className="text-red-400 text-sm">{errors.city}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state" className="text-sm font-medium text-white">
              State <span className="text-red-400">*</span>
            </Label>
            <Select
              value={formData.state}
              onValueChange={handleInputChange("state")}
            >
              <SelectTrigger className="bg-white/10 border-white/30 text-white focus:border-yellow-400 focus:ring-blue-400">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 text-white">
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-red-400 text-sm">{errors.state}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip" className="text-sm font-medium text-white">
              Zip Code <span className="text-red-400">*</span>
            </Label>
            <Input
              id="zip"
              type="text"
              value={formData.zip}
              onChange={(e) => handleInputChange("zip")(e.target.value)}
              className="bg-white/10 border-white/30 text-white placeholder-white/60 focus-border-yellow-400 focus:ring-blue-400"
              placeholder="Zip"
            />
            {errors.zip && (
              <p className="text-red-400 text-sm">{errors.zip}</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-white/20 pb-2">
          Profile Information
        </h3>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-white">
            Gender <span className="text-red-400">*</span>
          </Label>
          <RadioGroup
            value={formData.gender}
            onValueChange={handleInputChange("gender")}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="male"
                id="male"
                className="border-white/40 text-blue-400"
              />
              <Label htmlFor="male" className="text-white">
                Male
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="female"
                id="female"
                className="border-white/40 text-blue-400"
              />
              <Label htmlFor="female" className="text-white">
                Female
              </Label>
            </div>
          </RadioGroup>
          {errors.gender && (
            <p className="text-red-400 text-sm">{errors.gender}</p>
          )}
        </div>

        {showUserType && (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/20">
              <Label className="text-sm font-medium text-white mb-3 block">
                Choose the best that describes you{" "}
                <span className="text-red-400">*</span>
              </Label>
              <RadioGroup
                value={formData.userType}
                onValueChange={handleInputChange("userType")}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <RadioGroupItem
                    value="normal"
                    id="normal"
                    className="border-white/40 text-blue-400 mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="normal"
                      className="text-white font-medium cursor-pointer"
                    >
                      Normal
                    </Label>
                    <p className="text-white/70 text-sm mt-1">
                      Here just to make money!
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <RadioGroupItem
                    value="exotic"
                    id="exotic"
                    className="border-white/40 text-blue-400 mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="exotic"
                      className="text-white font-medium cursor-pointer"
                    >
                      Exotic
                    </Label>
                    <p className="text-white/70 text-sm mt-1">
                      Here to make more money than normal.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <RadioGroupItem
                    value="stripper"
                    id="stripper"
                    className="border-white/40 text-blue-400 mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="stripper"
                      className="text-white font-medium cursor-pointer"
                    >
                      Stripper
                    </Label>
                    <p className="text-white/70 text-sm mt-1">
                      Here to be on the reality show Housing Angels.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            {errors.userType && (
              <p className="text-red-400 text-sm">{errors.userType}</p>
            )}
          </div>
        )}
      </div>

      {/* Photo Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-white/20 pb-2">
          Photo Uploads
        </h3>
        <p className="text-sm text-white/70">
          <span className="text-red-400">*</span> All photos are required to
          complete your registration
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <FileUploadField
              label="Profile Photo (Square Size)"
              accept="image/*"
              onChange={handleFileChange("profilePhoto")}
              error={errors.profilePhoto}
            />
          </div>

          <div className="space-y-2">
            <FileUploadField
              label="Banner Photo (LandScape Size)"
              accept="image/*"
              onChange={handleFileChange("bannerPhoto")}
              error={errors.bannerPhoto}
            />
          </div>

          <div className="space-y-2">
            <FileUploadField
              label="Front Page Photo (Protrait Size)"
              accept="image/*"
              onChange={handleFileChange("frontPagePhoto")}
            />
            {errors.frontPagePhoto && (
              <p className="text-red-400 text-sm">{errors.frontPagePhoto}</p>
            )}
          </div>
        </div>
      </div>

      {/* Required Videos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-white/20 pb-2">
          Required Videos
        </h3>
        <p className="text-sm text-white/70">
          Upload a combination of or just Normal, Nude, or X-Rated videos to get
          approved.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((slot) => (
            <div key={slot} className="space-y-2">
              <FileUploadField
                label={`Video ${slot + 1}`}
                accept="video/*"
                onChange={handleVideoUpload(slot)}
                error={videoErrors[slot] || undefined}
              />
              {videoUrls[slot] && (
                <p className="text-xs text-green-300">Uploaded</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RegistrationFormFields;