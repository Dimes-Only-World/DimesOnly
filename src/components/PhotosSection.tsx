import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  Camera,
  Video,
} from "lucide-react";
import { Tables } from "@/types";

type UserData = Tables<"users">;

interface PhotosSectionProps {
  userData: UserData;
  onImageUpload: (
    file: File,
    imageType: "profile" | "banner" | "front_page"
  ) => Promise<void>;
}

interface Photo {
  id: string;
  url: string;
  type: "profile" | "banner" | "front_page";
  caption?: string;
  uploadDate: string;
}

const PhotosSection: React.FC<PhotosSectionProps> = ({
  userData,
  onImageUpload,
}) => {
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<
    "profile" | "banner" | "front_page"
  >("profile");

  // Get user's current photos from userData
  const userPhotos: Photo[] = [
    ...(userData.profile_photo
      ? [
          {
            id: "profile",
            url: userData.profile_photo,
            type: "profile" as const,
            caption: "Profile Photo",
            uploadDate: userData.updated_at || userData.created_at || "",
          },
        ]
      : []),
    ...(userData.banner_photo
      ? [
          {
            id: "banner",
            url: userData.banner_photo,
            type: "banner" as const,
            caption: "Banner Photo",
            uploadDate: userData.updated_at || userData.created_at || "",
          },
        ]
      : []),
    ...(userData.front_page_photo
      ? [
          {
            id: "front_page",
            url: userData.front_page_photo,
            type: "front_page" as const,
            caption: "Front Page Photo",
            uploadDate: userData.updated_at || userData.created_at || "",
          },
        ]
      : []),
  ];

  const handleUploadClick = (type: "profile" | "banner" | "front_page") => {
    setUploadType(type);

    // Mobile-friendly approach: create new input element each time
    const isMobile =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      input.style.display = "none";

      input.addEventListener("change", async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file && onImageUpload) {
          try {
            setUploading(type);
            await onImageUpload(file, type);
          } catch (error) {
            console.error("Upload error:", error);
          } finally {
            setUploading(null);
          }
        }
        // Clean up
        document.body.removeChild(input);
      });

      document.body.appendChild(input);
      input.click();
    } else {
      // Desktop approach: use ref
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && onImageUpload) {
      try {
        setUploading(uploadType);
        await onImageUpload(file, uploadType);
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setUploading(null);
        // Reset the input value to allow re-uploading the same file
        if (event.target) {
          event.target.value = "";
        }
      }
    }
  };

  const handleView = (photo: Photo) => {
    window.open(photo.url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Photo Management */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ImageIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-gray-900">Photo Management</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage your profile photos
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Upload Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Profile Photo
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Your main profile image
                </p>
                <Button
                  onClick={() => handleUploadClick("profile")}
                  disabled={uploading === "profile"}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {uploading === "profile"
                    ? "Uploading..."
                    : userData.profile_photo
                    ? "Update"
                    : "Upload"}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Banner Photo</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Cover image for your profile
                </p>
                <Button
                  onClick={() => handleUploadClick("banner")}
                  disabled={uploading === "banner"}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  {uploading === "banner"
                    ? "Uploading..."
                    : userData.banner_photo
                    ? "Update"
                    : "Upload"}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Front Page Photo
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Featured on the main page
                </p>
                <Button
                  onClick={() => handleUploadClick("front_page")}
                  disabled={uploading === "front_page"}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {uploading === "front_page"
                    ? "Uploading..."
                    : userData.front_page_photo
                    ? "Update"
                    : "Upload"}
                </Button>
              </div>
            </div>
          </div>

          {/* Current Photos Grid */}
          {userPhotos.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Current Photos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPhotos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <div className="relative">
                        <img
                          src={photo.url}
                          alt={photo.caption || "Photo"}
                          className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                        />

                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleView(photo)}
                              size="sm"
                              className="bg-white/90 text-gray-900 hover:bg-white"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleUploadClick(photo.type)}
                              size="sm"
                              className="bg-blue-500/90 hover:bg-blue-600 text-white"
                            >
                              <Camera className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Type Badge */}
                        <div className="absolute top-2 left-2">
                          <Badge
                            className={
                              photo.type === "profile"
                                ? "bg-blue-100 text-blue-700"
                                : photo.type === "banner"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-green-100 text-green-700"
                            }
                          >
                            {photo.type === "front_page"
                              ? "Front Page"
                              : photo.type.charAt(0).toUpperCase() +
                                photo.type.slice(1)}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {photo.caption}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(photo.uploadDate).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No photos uploaded yet
              </h3>
              <p className="text-gray-500 mb-4">
                Upload your first photo to get started
              </p>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            capture="environment"
          />
        </CardContent>
      </Card>

      {/* Photo Guidelines */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-gray-900">Photo Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Profile Photo</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Square format recommended (1:1 ratio)</li>
                <li>• Minimum 400x400 pixels</li>
                <li>• Clear view of your face</li>
                <li>• Professional appearance</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Banner Photo</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Wide format recommended (16:9 ratio)</li>
                <li>• Minimum 1200x675 pixels</li>
                <li>• Represents your brand/style</li>
                <li>• High quality and well-lit</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">
                Front Page Photo
              </h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Portrait or square format</li>
                <li>• Minimum 600x800 pixels</li>
                <li>• Featured on main page</li>
                <li>• Showcases your best work</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotosSection;
