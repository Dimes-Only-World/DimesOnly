import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Image, Video, Replace, Crown, Star, Lock, Heart, MessageCircle } from "lucide-react";
import MediaLikes from "./MediaLikes";
import MediaComments from "./MediaComments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MediaFile {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
  created_at: string;
  content_tier?: string;
  is_nude?: boolean;
  is_xrated?: boolean;
  upload_date?: string;
}

interface MediaGridProps {
  media: MediaFile[];
  onDelete: (id: string) => void;
  onReplace?: (id: string) => void;
  showContentTier?: boolean;
  currentUserId?: string;
  showLikesAndComments?: boolean;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  media,
  onDelete,
  onReplace,
  showContentTier = false,
  currentUserId,
  showLikesAndComments = false,
}) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [playingMap, setPlayingMap] = useState<Record<string, boolean>>({});
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);

  const getContentTierInfo = (tier: string) => {
    switch (tier) {
      case 'silver':
        return { name: 'Silver', color: 'from-yellow-400 to-yellow-600', icon: Crown };
      case 'gold':
        return { name: 'Gold', color: 'from-yellow-500 to-orange-500', icon: Star };
      default:
        return { name: 'Free', color: 'from-gray-400 to-gray-600', icon: Lock };
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 lg:gap-8">
      {media.map((file) => (
        <div key={file.id} className="relative group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Main media container */}
          <div className="aspect-square bg-gray-100 overflow-hidden relative group">
            {file.media_type === "photo" ? (
              <img
                src={file.media_url}
                alt="User media"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="relative w-full h-full">
                <video
                  src={file.media_url}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  onPlay={() => setPlayingMap((m) => ({ ...m, [file.id]: true }))}
                  onPause={() => setPlayingMap((m) => ({ ...m, [file.id]: false }))}
                />
                <div className={`absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none ${playingMap[file.id] ? 'hidden' : ''}`}>
                  <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center shadow-lg">
                    <Video className="w-8 h-8 text-gray-700" />
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* Delete/Replace overlay - only show on hover */}
            {(onDelete || onReplace) && (
              <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 flex gap-1 z-30">
                <Button
                  onClick={() => onDelete(file.id)}
                  size="sm"
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600 text-white shadow-lg rounded-full w-7 h-7 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
                {onReplace && (
                  <Button
                    onClick={() => onReplace(file.id)}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg rounded-full w-7 h-7 p-0"
                  >
                    <Replace className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}

            {/* Content tier badge - Top Left */}
            {showContentTier && file.content_tier && (
              <div className="absolute top-2 left-2 z-20">
                <Badge 
                  className={`bg-gradient-to-r ${getContentTierInfo(file.content_tier).color} text-white text-xs font-semibold px-2 py-1 flex items-center gap-1 shadow-lg`}
                >
                  {React.createElement(getContentTierInfo(file.content_tier).icon, { className: "w-3 h-3" })}
                  {getContentTierInfo(file.content_tier).name}
                </Badge>
              </div>
            )}

            {/* Content warnings - positioned below tier badge */}
            {(file.is_nude || file.is_xrated) && (
              <div className="absolute top-12 left-2 flex flex-col gap-1 z-20">
                {file.is_nude && (
                  <Badge variant="destructive" className="text-xs px-2 py-1 shadow-lg">
                    ⚠️ Nude
                  </Badge>
                )}
                {file.is_xrated && (
                  <Badge variant="destructive" className="text-xs px-2 py-1 shadow-lg">
                    🔞 18+
                  </Badge>
                )}
              </div>
            )}

            {/* Bottom info bar - simplified */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-1">
                  {file.media_type === "photo" ? (
                    <Image className="w-3 h-3" />
                  ) : (
                    <Video className="w-3 h-3" />
                  )}
                  <span className="text-xs font-medium capitalize">{file.media_type}</span>
                </div>
                <div className="text-xs opacity-75">
                  {file.upload_date 
                    ? new Date(file.upload_date).toLocaleDateString()
                    : new Date(file.created_at).toLocaleDateString()
                  }
                </div>
              </div>
            </div>
          
          {/* Engagement section - clean and accessible */}
          {showLikesAndComments && currentUserId && (
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <MediaLikes
                  mediaId={file.id}
                  currentUserId={currentUserId}
                />
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedia(file);
                    setShowCommentsDialog(true);
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors px-3 py-2 rounded-lg flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Comments</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
      </div>

      {/* Comments Dialog */}
    <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments
            {selectedMedia && (
              <span className="text-sm text-gray-500">
                - {selectedMedia.media_type === 'photo' ? 'Photo' : 'Video'}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh]">
          {selectedMedia && currentUserId && (
            <MediaComments
              mediaId={selectedMedia.id}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default MediaGrid;
