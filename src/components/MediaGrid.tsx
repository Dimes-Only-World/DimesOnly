import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Image, Video } from 'lucide-react';

interface MediaFile {
  id: string;
  media_url: string;
  media_type: 'photo' | 'video';
  created_at: string;
}

interface MediaGridProps {
  files: MediaFile[];
  onDelete: (id: string) => void;
  onReplace?: (id: string) => void;
}

const MediaGrid: React.FC<MediaGridProps> = ({ files, onDelete, onReplace }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => (
        <div key={file.id} className="relative group bg-white/10 rounded-lg overflow-hidden">
          {file.media_type === 'photo' ? (
            <img 
              src={file.media_url} 
              alt="User media"
              className="w-full h-32 object-cover"
            />
          ) : (
            <video 
              src={file.media_url}
              className="w-full h-32 object-cover"
              controls={false}
            />
          )}
          
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              onClick={() => onDelete(file.id)}
              size="sm"
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
            {onReplace && (
              <Button
                onClick={() => onReplace(file.id)}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                Replace
              </Button>
            )}
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
            <div className="flex items-center gap-1">
              {file.media_type === 'photo' ? (
                <Image className="w-3 h-3" />
              ) : (
                <Video className="w-3 h-3" />
              )}
              <span className="capitalize">{file.media_type}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MediaGrid;