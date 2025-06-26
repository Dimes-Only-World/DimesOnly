import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image, Video, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import MediaGrid from "./MediaGrid";
import ProfileImageUpload from "./ProfileImageUpload";

interface MediaFile {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
  created_at: string;
}

interface MediaUploadSectionProps {
  userData: {
    id: string;
    [key: string]: unknown;
  };
  onUpdate: (data: Record<string, unknown>) => Promise<boolean>;
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
  const { toast } = useToast();

  useEffect(() => {
    if (userData?.id) {
      fetchMedia();
    }
  }, [userData?.id]);

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

    const currentCount = type === "photo" ? photos.length : videos.length;
    const maxFiles = 25;
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
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${userData.id}/${type}_${Date.now()}_${i}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("user-photos")
          .upload(fileName, file, { cacheControl: "3600" });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("user-photos").getPublicUrl(fileName);

        if (replaceId) {
          await supabase
            .from("user_media")
            .update({
              media_url: publicUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", replaceId);
          setReplaceId(null);
        } else {
          const { error: insertError } = await supabase
            .from("user_media")
            .insert({
              user_id: userData.id,
              media_url: publicUrl,
              media_type: type,
            });

          if (insertError) throw insertError;
        }
      }

      await fetchMedia();
      toast({
        title: "Success",
        description: `${type}s uploaded successfully`,
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: `Failed to upload ${type}s. Please try again.`,
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Photos ({photos.length}/25)
            </span>
            <Button
              onClick={() => triggerFileInput("photo")}
              disabled={photos.length >= 25 || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Photos"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 25 && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-800 text-sm">
                Photo storage full. Delete or replace photos to add new ones.
              </span>
            </div>
          )}
          {photos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No photos uploaded yet. Click "Upload Photos" to add some!</p>
            </div>
          ) : (
            <MediaGrid
              files={photos}
              onDelete={handleDelete}
              onReplace={handleReplace}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Videos ({videos.length}/25)
            </span>
            <Button
              onClick={() => triggerFileInput("video")}
              disabled={videos.length >= 25 || uploading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Videos"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videos.length === 25 && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-800 text-sm">
                Video storage full. Delete or replace videos to add new ones.
              </span>
            </div>
          )}
          {videos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No videos uploaded yet. Click "Upload Videos" to add some!</p>
            </div>
          ) : (
            <MediaGrid
              files={videos}
              onDelete={handleDelete}
              onReplace={handleReplace}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MediaUploadSection;
