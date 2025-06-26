import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Save,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/types";

type UserData = Tables<"users">;

interface ProfileInfoProps {
  userData: UserData;
  onUpdate: (updatedData: Partial<UserData>) => Promise<boolean>;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({ userData, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use a ref to store form data to prevent re-renders
  const formDataRef = useRef<Partial<UserData>>({});

  // Initialize form data on first load or when user changes
  useEffect(() => {
    if (userData?.id && !isEditing) {
      formDataRef.current = {
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        email: userData.email || "",
        mobile_number: userData.mobile_number || "",
        address: userData.address || "",
        city: userData.city || "",
        state: userData.state || "",
        zip: userData.zip || "",
        user_type: userData.user_type || "",
        bio: userData.bio || "",
        occupation: userData.occupation || "",
        about_me: userData.about_me || "",
        description: userData.description || "",
      };
    }
  }, [userData.id, isEditing]);

  const handleStartEditing = () => {
    console.log("Starting edit mode");
    // Make a fresh copy of userData to formDataRef
    formDataRef.current = {
      first_name: userData.first_name || "",
      last_name: userData.last_name || "",
      email: userData.email || "",
      mobile_number: userData.mobile_number || "",
      address: userData.address || "",
      city: userData.city || "",
      state: userData.state || "",
      zip: userData.zip || "",
      user_type: userData.user_type || "",
      bio: userData.bio || "",
      occupation: userData.occupation || "",
      about_me: userData.about_me || "",
      description: userData.description || "",
    };
    setIsEditing(true);
  };

  const handleFieldChange = (field: string, value: string) => {
    console.log(`Field ${field} changed to:`, value);
    formDataRef.current = {
      ...formDataRef.current,
      [field]: value,
    };
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      console.log("Saving profile data:", formDataRef.current);
      const success = await onUpdate(formDataRef.current);
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    console.log("Canceling edit");
    setIsEditing(false);
  };

  // Custom controlled input component that doesn't lose focus
  const ControlledField = ({
    icon: Icon,
    label,
    fieldName,
    type = "text",
    options = null,
  }: {
    icon: React.ElementType;
    label: string;
    fieldName: string;
    type?: string;
    options?: Array<{ value: string; label: string }> | null;
  }) => {
    // Use local state to maintain focus
    const [localValue, setLocalValue] = useState<string>(
      (formDataRef.current[
        fieldName as keyof typeof formDataRef.current
      ] as string) || ""
    );

    // Update local value when editing starts
    useEffect(() => {
      if (isEditing) {
        setLocalValue(
          (formDataRef.current[
            fieldName as keyof typeof formDataRef.current
          ] as string) || ""
        );
      }
    }, [isEditing, fieldName]);

    const handleChange = (value: string) => {
      setLocalValue(value);
      handleFieldChange(fieldName, value);
    };

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          {label}
        </Label>
        {isEditing ? (
          options ? (
            <Select value={localValue} onValueChange={handleChange}>
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : type === "textarea" ? (
            <Textarea
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              placeholder={`Enter your ${label.toLowerCase()}`}
            />
          ) : (
            <Input
              type={type}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder={`Enter your ${label.toLowerCase()}`}
            />
          )
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-gray-900">
              {(userData[fieldName as keyof UserData] as string) || (
                <span className="text-gray-400 italic">Not set</span>
              )}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-gray-900">
                Profile Information
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage your personal details and preferences
              </p>
            </div>
          </div>

          {!isEditing ? (
            <Button
              onClick={handleStartEditing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Personal Information Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              Personal
            </Badge>
            <h3 className="text-lg font-semibold text-gray-800">
              Personal Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ControlledField
              icon={User}
              label="First Name"
              fieldName="first_name"
              type="text"
            />

            <ControlledField
              icon={User}
              label="Last Name"
              fieldName="last_name"
              type="text"
            />

            <ControlledField
              icon={Mail}
              label="Email"
              fieldName="email"
              type="email"
            />

            <ControlledField
              icon={Phone}
              label="Mobile Number"
              fieldName="mobile_number"
              type="tel"
            />
          </div>
        </div>

        {/* Address Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              Location
            </Badge>
            <h3 className="text-lg font-semibold text-gray-800">Address</h3>
          </div>

          <div className="space-y-4">
            <ControlledField
              icon={MapPin}
              label="Address"
              fieldName="address"
              type="text"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ControlledField
                icon={MapPin}
                label="City"
                fieldName="city"
                type="text"
              />

              <ControlledField
                icon={MapPin}
                label="State"
                fieldName="state"
                type="text"
              />

              <ControlledField
                icon={MapPin}
                label="ZIP Code"
                fieldName="zip"
                type="text"
              />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              Professional
            </Badge>
            <h3 className="text-lg font-semibold text-gray-800">
              Professional Details
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ControlledField
              icon={User}
              label="User Type"
              fieldName="user_type"
              type="text"
              options={[
                { value: "normal", label: "Normal" },
                { value: "dancer", label: "Dancer" },
                { value: "exotic", label: "Exotic Dancer" },
                { value: "stripper", label: "Stripper" },
                { value: "model", label: "Model" },
              ]}
            />

            <ControlledField
              icon={Briefcase}
              label="Occupation"
              fieldName="occupation"
              type="text"
            />
          </div>
        </div>

        {/* Bio Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              Bio
            </Badge>
            <h3 className="text-lg font-semibold text-gray-800">
              About & Description
            </h3>
          </div>

          <div className="space-y-4">
            <ControlledField
              icon={FileText}
              label="Bio"
              fieldName="bio"
              type="textarea"
            />

            <ControlledField
              icon={FileText}
              label="Description"
              fieldName="description"
              type="textarea"
            />

            <ControlledField
              icon={FileText}
              label="About Me"
              fieldName="about_me"
              type="textarea"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileInfo;
