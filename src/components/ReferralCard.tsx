import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  city?: string;
  state?: string;
  created_at: string;
  profile_photo?: string;
  banner_photo?: string;
  front_page_photo?: string;
}

interface MediaFile {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
}

interface ReferralCardProps {
  user: User;
  onImageClick: (imageUrl: string) => void;
  onMessage: (userId: string) => void;
}

const ReferralCard: React.FC<ReferralCardProps> = ({
  user,
  onImageClick,
  onMessage,
}) => {
  const [userMedia, setUserMedia] = useState<MediaFile[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  useEffect(() => {
    fetchUserMedia();
  }, [user.id]);

  const fetchUserMedia = async () => {
    try {
      const { data, error } = await supabase
        .from("user_media")
        .select("id, media_url, media_type")
        .eq("user_id", user.id)
        .eq("media_type", "photo")
        .limit(6)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Media table might not exist yet:", error);
        setUserMedia([]);
      } else {
        setUserMedia((data as unknown as MediaFile[]) || []);
      }
    } catch (error) {
      console.log("Error fetching user media:", error);
      setUserMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Combine profile images and user media
  const allImages = [
    ...(user.profile_photo
      ? [{ type: "profile", url: user.profile_photo }]
      : []),
    ...(user.banner_photo ? [{ type: "banner", url: user.banner_photo }] : []),
    ...(user.front_page_photo
      ? [{ type: "front_page", url: user.front_page_photo }]
      : []),
    ...userMedia.map((media) => ({ type: "media", url: media.media_url })),
  ];

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {allImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {allImages.slice(0, 6).map((image, index) => (
              <div
                key={index}
                className="aspect-square cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onImageClick(image.url)}
              >
                <img
                  src={image.url}
                  alt={`${image.type} photo`}
                  className="w-full h-full object-cover rounded"
                />
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <div className="cursor-pointer" onClick={() => onMessage(user.id)}>
            <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
              {user.username}
            </h3>
            <p className="text-gray-600">
              {user.city}, {user.state}
            </p>
            <p className="text-sm text-gray-500">
              Joined: {formatDate(user.created_at)}
            </p>
            {userMedia.length > 0 && (
              <p className="text-xs text-blue-500">
                {userMedia.length} photos uploaded
              </p>
            )}
          </div>
          <Button
            onClick={() => onMessage(user.id)}
            size="sm"
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
