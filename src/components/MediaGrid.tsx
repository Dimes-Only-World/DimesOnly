import React from "react";
import { Button } from "@/components/ui/button";
import { X, Image, Video, Replace } from "lucide-react";

interface MediaFile {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
  created_at: string;
}

interface MediaGridProps {
  files: MediaFile[];
  onDelete: (id: string) => void;
  onReplace?: (id: string) => void;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  files,
  onDelete,
  onReplace,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {files.map((file) => (
        <div key={file.id} className="relative group">
          {/* Main media container with consistent aspect ratio */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            {file.media_type === "photo" ? (
              <img
                src={file.media_url}
                alt="User media"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            ) : (
              <div className="relative w-full h-full">
                <video
                  src={file.media_url}
                  className="w-full h-full object-cover"
                  controls={false}
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                    <Video className="w-6 h-6 text-gray-700" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overlay controls - improved positioning and styling */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-2">
            <Button
              onClick={() => onDelete(file.id)}
              size="sm"
              variant="destructive"
              className="bg-red-500 hover:bg-red-600 text-white shadow-lg"
            >
              <X className="w-4 h-4" />
            </Button>
            {onReplace && (
              <Button
                onClick={() => onReplace(file.id)}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
              >
                <Replace className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Media type indicator - improved styling */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            {file.media_type === "photo" ? (
              <Image className="w-3 h-3" />
            ) : (
              <Video className="w-3 h-3" />
            )}
            <span className="capitalize font-medium">{file.media_type}</span>
          </div>

          {/* Upload date - optional, can be shown on hover */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(file.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MediaGrid;
