import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Upload, FileImage, FileVideo, X } from "lucide-react";

const AdminNotificationTab: React.FC = () => {
  const [message, setMessage] = useState("");
  const [mediaType, setMediaType] = useState<"photo" | "video" | "none">(
    "none"
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const validImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      const validVideoTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/avi",
        "video/mov",
      ];

      if (mediaType === "photo" && !validImageTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description:
            "Please select a valid image file (JPEG, PNG, GIF, WebP)",
          variant: "destructive",
        });
        return;
      }

      if (mediaType === "video" && !validVideoTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description:
            "Please select a valid video file (MP4, WebM, OGG, AVI, MOV)",
          variant: "destructive",
        });
        return;
      }

      setMediaFile(file);

      // Create preview for images
      if (mediaType === "photo") {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `notification_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `notifications/${fileName}`;

      setUploadProgress(10);

      // Upload to notifications bucket
      const { error: uploadError } = await supabase.storage
        .from("notification")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      setUploadProgress(80);

      // Get public URL
      const { data } = supabase.storage
        .from("notification")
        .getPublicUrl(filePath);

      setUploadProgress(100);

      if (!data.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading media:", error);
      throw error;
    }
  };

  const handleSendNotification = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      let mediaUrl = null;

      if (mediaFile && mediaType !== "none") {
        toast({
          title: "Uploading media...",
          description: "Please wait while we upload your file",
        });

        mediaUrl = await uploadMedia(mediaFile);
        if (!mediaUrl) {
          throw new Error("Failed to upload media");
        }
      }

      // First, fetch all users to send notifications to
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id")
        .limit(1000); // Reasonable limit to prevent overwhelming the system

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw new Error("Failed to fetch users");
      }

      if (!users || users.length === 0) {
        throw new Error("No users found to send notifications to");
      }

      // Create notification records for each user (notifications don't need sender_id)
      const notificationInserts = users.map((user) => ({
        title: "Admin Notification",
        message: message,
        media_url: mediaUrl,
        media_type: mediaType === "none" ? null : mediaType,
        recipient_id: user.id,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      // Insert notifications in batches to avoid overwhelming the database
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < notificationInserts.length; i += batchSize) {
        const batch = notificationInserts.slice(i, i + batchSize);

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(batch);

        if (notificationError) {
          console.error("Batch notification error:", notificationError);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      if (errorCount > 0) {
        toast({
          title: "Partial Success",
          description: `Notification sent to ${successCount}/${users.length} users. ${errorCount} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: `Notification sent to ${successCount} users${
            mediaUrl ? " with media attachment" : ""
          }`,
        });
      }

      // Reset form
      setMessage("");
      setMediaType("none");
      setMediaFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);

      // Reset file input
      const fileInput = document.getElementById(
        "media-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error: unknown) {
      console.error("Send notification error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setMediaFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    const fileInput = document.getElementById(
      "media-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Send Notification to All Users
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Send notifications with optional media attachments. Files are stored
          securely and notifications appear in user dashboards.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="message">Notification Message *</Label>
          <Textarea
            id="message"
            placeholder="Enter your notification message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length}/500 characters
          </p>
        </div>

        <div>
          <Label>Media Attachment (Optional)</Label>
          <RadioGroup
            value={mediaType}
            onValueChange={(value: "photo" | "video" | "none") => {
              setMediaType(value);
              if (value === "none") {
                removeFile();
              }
            }}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none">No Media</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="photo" id="photo" />
              <Label htmlFor="photo" className="flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                Photo Upload (Max 50MB)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="video" id="video" />
              <Label htmlFor="video" className="flex items-center gap-2">
                <FileVideo className="h-4 w-4" />
                Video Upload (Max 50MB)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {mediaType !== "none" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="media-upload">
                Upload {mediaType === "photo" ? "Photo" : "Video"}
              </Label>
              <Input
                id="media-upload"
                type="file"
                accept={mediaType === "photo" ? "image/*" : "video/*"}
                onChange={handleFileChange}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats:{" "}
                {mediaType === "photo"
                  ? "JPEG, PNG, GIF, WebP"
                  : "MP4, WebM, OGG, AVI, MOV"}
              </p>
            </div>

            {mediaFile && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Selected File:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(2)}{" "}
                  MB)
                </p>

                {previewUrl && mediaType === "photo" && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full h-32 object-cover rounded border"
                  />
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <p>Post Date: {new Date().toLocaleDateString()}</p>
            <p>Time: {new Date().toLocaleTimeString()}</p>
          </div>
          <Button
            onClick={handleSendNotification}
            disabled={
              loading || !message.trim() || (mediaType !== "none" && !mediaFile)
            }
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminNotificationTab;
