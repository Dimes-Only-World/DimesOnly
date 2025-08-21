import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, Video, AlertCircle, Crown, Lock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import MediaGrid from "./MediaGrid";
import ProfileImageUpload from "./ProfileImageUpload";

interface MediaFile {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
  content_tier: "free" | "silver" | "gold";
  is_nude: boolean;
  is_xrated: boolean;
  created_at: string;
  upload_date: string;
}

interface MediaUploadSectionProps {
  userData: {
    id: string;
    username: string;
    membership_tier: string;
    silver_plus_active: boolean;
    diamond_plus_active: boolean;
    [key: string]: unknown;
  };
  onUpdate: (data: Record<string, unknown>) => Promise<boolean>;
}

interface UploadLimits {
  photos: number;
  videos: number;
  maxPhotos: number;
  maxVideos: number;
}

const MediaUploadSection: React.FC<MediaUploadSectionProps> = ({
  userData,
  onUpdate,
}) => {
  const [photos, setPhotos] = useState<MediaFile[]>([]);
  const [videos, setVideos] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [selectedContentTier, setSelectedContentTier] = useState<"free" | "silver" | "gold">("free");
  const [uploadLimits, setUploadLimits] = useState<UploadLimits>({
    photos: 0,
    videos: 0,
    maxPhotos: 25,
    maxVideos: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    if (userData?.id) {
      fetchMedia();
      calculateUploadLimits();
    }
  }, [userData?.id, userData?.membership_tier]);

  // Calculate upload limits based on membership tier
  const calculateUploadLimits = () => {
    const { membership_tier, silver_plus_active, diamond_plus_active } = userData;
    
    let maxPhotos = 25; // Free tier
    let maxVideos = 0;  // Free tier

    if (membership_tier === "silver" || silver_plus_active) {
      maxPhotos = 260;
      maxVideos = 48;
    } else if (membership_tier === "gold" || membership_tier === "diamond" || diamond_plus_active) {
      maxPhotos = 260;
      maxVideos = 48;
    }

    setUploadLimits(prev => ({
      ...prev,
      maxPhotos,
      maxVideos
    }));
  };

  const fetchMedia = async () => {
    if (!userData?.id) return;

    try {
      const { data, error } = await supabase
        .from("user_media")
        .select("*")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (
          error.code === "PGRST116" ||
          error.message.includes('relation "user_media" does not exist')
        ) {
          console.log(
            "user_media table does not exist yet. Please run the SQL script to create it."
          );
          toast({
            title: "Setup Required",
            description:
              "Media upload feature requires database setup. Please contact administrator.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        const mediaFiles = (data as unknown as MediaFile[]) || [];
        setPhotos(mediaFiles.filter((f) => f.media_type === "photo"));
        setVideos(mediaFiles.filter((f) => f.media_type === "video"));
        
        // Update current counts by content tier
        setUploadLimits(prev => ({
          ...prev,
          photos: mediaFiles.filter(f => f.media_type === "photo" && f.content_tier === selectedContentTier).length,
          videos: mediaFiles.filter(f => f.media_type === "video" && f.content_tier === selectedContentTier).length
        }));
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      toast({
        title: "Error",
        description: "Failed to load media",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList, type: "photo" | "video") => {
    if (!userData?.id) return;

    const currentCount = type === "photo" ? uploadLimits.photos : uploadLimits.videos;
    const maxFiles = type === "photo" ? uploadLimits.maxPhotos : uploadLimits.maxVideos;
    const availableSlots = maxFiles - currentCount;

    if (files.length > availableSlots && !replaceId) {
      toast({
        title: "Storage Full",
        description: `You can only upload ${availableSlots} more ${type}s. Maximum is ${maxFiles}. Please delete some files first.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        const fileName = `${userData.username}_${Date.now()}_${file.name}`;
        const filePath = `${userData.username}/${selectedContentTier}/${type === "photo" ? "photos" : "videos"}/${fileName}`;
        
        // Determine bucket based on type and content tier
        let bucketName = "user-photos"; // Default fallback
        
        if (type === "photo") {
          if (selectedContentTier === "free") {
            bucketName = "user-photos"; // Keep existing for free content
          } else {
            bucketName = "public-media"; // New bucket for silver/gold content
          }
        } else if (type === "video") {
          bucketName = "private-media"; // New bucket for all videos
        }

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        let publicUrl;
        if (bucketName === "user-photos") {
          publicUrl = supabase.storage.from("user-photos").getPublicUrl(filePath).data.publicUrl;
        } else if (bucketName === "public-media") {
          publicUrl = supabase.storage.from("public-media").getPublicUrl(filePath).data.publicUrl;
        } else {
          publicUrl = supabase.storage.from("private-media").getPublicUrl(filePath).data.publicUrl;
        }

        // Insert into database with new fields
        const { error: dbError } = await supabase
          .from("user_media")
          .insert({
            user_id: userData.id,
            media_url: publicUrl,
            media_type: type,
            filename: fileName,
            storage_path: filePath,
            content_tier: selectedContentTier,
            is_nude: selectedContentTier === "silver",
            is_xrated: selectedContentTier === "gold",
            upload_date: new Date().toISOString(),
            access_restricted: selectedContentTier !== "free"
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Upload Successful",
        description: `${files.length} ${type}${files.length > 1 ? "s" : ""} uploaded successfully!`,
      });

      // Refresh media list
      await fetchMedia();
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = (type: "photo" | "video") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "photo" ? "image/*" : "video/*";
    input.multiple = !replaceId;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleFileUpload(files, type);
      }
    };
    input.click();
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("user_media").delete().eq("id", id);

      if (error) throw error;

      await fetchMedia();
      toast({
        title: "Success",
        description: "Media deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting media:", error);
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  const handleReplace = (id: string) => {
    setReplaceId(id);
    const mediaItem = [...photos, ...videos].find((m) => m.id === id);
    if (mediaItem) {
      triggerFileInput(mediaItem.media_type);
    }
  };

  const getMembershipBadge = () => {
    const rawTier = String(userData?.membership_tier || userData?.membership_type || '').toLowerCase();
    const isDiamond = Boolean(userData?.diamond_plus_active) || ["gold", "diamond", "diamond_plus"].includes(rawTier);
    const isSilver = Boolean(userData?.silver_plus_active) || ["silver", "silver_plus"].includes(rawTier);

    if (isDiamond) {
      return <Badge className="bg-yellow-500"><Crown className="w-3 h-3 mr-1" />Diamond+</Badge>;
    } else if (isSilver) {
      return <Badge className="bg-gray-500"><Star className="w-3 h-3 mr-1" />Silver+</Badge>;
    } else {
      return <Badge variant="outline">Free</Badge>;
    }
  };

  const getContentTierDescription = () => {
    switch (selectedContentTier) {
      case "free":
        return "Clean content only - no nudes or x-rated material";
      case "silver":
        return "Nude content allowed (not x-rated) - requires Silver+ membership";
      case "gold":
        return "X-rated content preferred - requires Gold+ membership";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileImageUpload userData={userData} onUpdate={onUpdate} />

      {/* Membership Status - Enhanced Design */}
      <Card className="border-gradient-to-r from-blue-200 to-purple-200 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-full shadow-md">
                <Crown className="w-5 h-5 text-blue-600" />
              </div>
              <span>Current Membership</span>
            </div>
            {getMembershipBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700">Photos</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{uploadLimits.photos}</div>
              <div className="text-sm text-gray-500">of {uploadLimits.maxPhotos} used</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((uploadLimits.photos / uploadLimits.maxPhotos) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-700">Videos</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{uploadLimits.videos}</div>
              <div className="text-sm text-gray-500">of {uploadLimits.maxVideos} used</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: uploadLimits.maxVideos > 0 ? `${Math.min((uploadLimits.videos / uploadLimits.maxVideos) * 100, 100)}%` : '0%' }}
                ></div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-700">
              {uploadLimits.maxPhotos === 25 
                ? "🆓 Free Tier: Upload up to 25 photos to get started!" 
                : `⭐ Premium Tier: Enjoy ${uploadLimits.maxPhotos} photos + ${uploadLimits.maxVideos} videos`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Content Tier Selection - Enhanced Design */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full">
              <Star className="w-5 h-5 text-white" />
            </div>
            Select Content Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Tier */}
            <div 
              className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedContentTier === "free" 
                  ? "border-green-500 bg-green-50 shadow-lg" 
                  : "border-gray-200 bg-white hover:border-green-300"
              }`}
              onClick={() => setSelectedContentTier("free")}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Free Content</h3>
                <p className="text-sm text-gray-600 mb-3">Clean photos only</p>
                <div className="text-xs text-green-600 font-medium">✓ Always Available</div>
              </div>
              {selectedContentTier === "free" && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>

            {/* Silver Tier */}
            <div 
              className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedContentTier === "silver" 
                  ? "border-yellow-500 bg-yellow-50 shadow-lg" 
                  : "border-gray-200 bg-white hover:border-yellow-300"
              }`}
              onClick={() => setSelectedContentTier("silver")}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Silver Content</h3>
                <p className="text-sm text-gray-600 mb-3">Nude photos & videos</p>
                <div className="text-xs text-yellow-600 font-medium">✓ Available</div>
              </div>
              {selectedContentTier === "silver" && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>

            {/* Gold Tier */}
            <div 
              className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedContentTier === "gold" 
                  ? "border-orange-500 bg-orange-50 shadow-lg" 
                  : "border-gray-200 bg-white hover:border-orange-300"
              }`}
              onClick={() => setSelectedContentTier("gold")}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Gold Content</h3>
                <p className="text-sm text-gray-600 mb-3">X-rated photos & videos</p>
                <div className="text-xs text-orange-600 font-medium">✓ Available</div>
              </div>
              {selectedContentTier === "gold" && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-100 rounded-full mt-0.5">
                <AlertCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">Content Guidelines</h4>
                <p className="text-sm text-gray-600">
                  {getContentTierDescription()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section - Enhanced Design */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-indigo-50 to-blue-50">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full">
              <Upload className="w-6 h-6 text-white" />
            </div>
            Upload Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo Upload */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Image className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Photos</h3>
                  <p className="text-sm text-gray-500">{uploadLimits.photos}/{uploadLimits.maxPhotos} uploaded</p>
                </div>
              </div>
              {uploadLimits.photos >= uploadLimits.maxPhotos && (
                <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Storage Full
                </Badge>
              )}
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors duration-300 bg-gray-50 hover:bg-blue-50">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, "photo")}
                disabled={uploading || uploadLimits.photos >= uploadLimits.maxPhotos}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Image className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700 mb-1">
                      {uploadLimits.photos >= uploadLimits.maxPhotos ? "Storage Full" : "Drop photos here or click to browse"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {uploadLimits.photos >= uploadLimits.maxPhotos 
                        ? "Delete some photos to upload more" 
                        : "Supports JPG, PNG, GIF up to 10MB each"
                      }
                    </p>
                  </div>
                  {uploadLimits.photos < uploadLimits.maxPhotos && (
                    <Button 
                      type="button"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Photos
                    </Button>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Video Upload */}
          {uploadLimits.maxVideos > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Video className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Videos</h3>
                    <p className="text-sm text-gray-500">{uploadLimits.videos}/{uploadLimits.maxVideos} uploaded</p>
                  </div>
                </div>
                {uploadLimits.videos >= uploadLimits.maxVideos && (
                  <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Storage Full
                  </Badge>
                )}
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors duration-300 bg-gray-50 hover:bg-purple-50">
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files, "video")}
                  disabled={uploading || uploadLimits.videos >= uploadLimits.maxVideos}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-purple-100 rounded-full">
                      <Video className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-700 mb-1">
                        {uploadLimits.videos >= uploadLimits.maxVideos ? "Storage Full" : "Drop videos here or click to browse"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {uploadLimits.videos >= uploadLimits.maxVideos 
                          ? "Delete some videos to upload more" 
                          : "Supports MP4, MOV, AVI up to 100MB each"
                        }
                      </p>
                    </div>
                    {uploadLimits.videos < uploadLimits.maxVideos && (
                      <Button 
                        type="button"
                        onClick={() => document.getElementById('video-upload')?.click()}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Videos
                      </Button>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                <div>
                  <p className="font-medium text-blue-800">Uploading your media...</p>
                  <p className="text-sm text-blue-600">Please wait while we process your files</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Photos ({photos.filter(p => p.content_tier === selectedContentTier).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photos.filter(p => p.content_tier === selectedContentTier).length > 0 ? (
              <MediaGrid
                media={photos.filter(p => p.content_tier === selectedContentTier)}
                onDelete={handleDelete}
                onReplace={handleReplace}
                showContentTier={true}
                currentUserId={userData.id}
                showLikesAndComments={true}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No photos uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {uploadLimits.maxVideos > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Videos ({videos.filter(v => v.content_tier === selectedContentTier).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {videos.filter(v => v.content_tier === selectedContentTier).length > 0 ? (
                <MediaGrid
                  media={videos.filter(v => v.content_tier === selectedContentTier)}
                  onDelete={handleDelete}
                  onReplace={handleReplace}
                  showContentTier={true}
                  currentUserId={userData.id}
                  showLikesAndComments={true}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No videos uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MediaUploadSection;
