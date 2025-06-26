import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MediaFile {
  id: string;
  name: string;
  type: 'photo' | 'video' | 'banner' | 'frontpage';
  url: string;
  size: string;
}

interface MediaGridProps {
  files: MediaFile[];
  type: 'photo' | 'video';
  onDelete: (id: string, type: 'photo' | 'video') => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ files, type, onDelete }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {files.map((file) => (
      <div key={file.id} className="relative group bg-white/10 rounded-lg overflow-hidden">
        {type === 'photo' ? (
          <img 
            src={file.url} 
            alt={file.name}
            className="w-full h-32 object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        ) : (
          <video 
            src={file.url}
            className="w-full h-32 object-cover"
            controls={false}
          />
        )}
        
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            onClick={() => onDelete(file.id, type)}
            size="sm"
            variant="destructive"
            className="bg-red-500 hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
          <p className="truncate">{file.name}</p>
          <p>{file.size}</p>
        </div>
      </div>
    ))}
  </div>
);

interface SingleImageUploadProps {
  title: string;
  file: MediaFile | null;
  type: 'banner' | 'frontpage';
  icon: any;
  uploading: boolean;
  uploadProgress: number;
  onUpload: (type: 'banner' | 'frontpage') => void;
  onDelete: (id: string, type: 'banner' | 'frontpage') => void;
}

export const SingleImageUpload: React.FC<SingleImageUploadProps> = ({
  title,
  file,
  type,
  icon: Icon,
  uploading,
  uploadProgress,
  onUpload,
  onDelete
}) => (
  <Card className="bg-white/10 backdrop-blur border-white/20">
    <CardHeader>
      <CardTitle className="text-white flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </span>
        <Button
          onClick={() => onUpload(type)}
          disabled={uploading}
          className="bg-green-600 hover:bg-green-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {uploading && (
        <div className="mb-4">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-gray-400 mt-2">{uploadProgress.toFixed(0)}% uploaded</p>
        </div>
      )}
      {file ? (
        <div className="relative group bg-white/10 rounded-lg overflow-hidden">
          <img 
            src={file.url} 
            alt={file.name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              onClick={() => onDelete(file.id, type)}
              size="sm"
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
            <p className="truncate">{file.name}</p>
            <p>{file.size}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {title.toLowerCase()} uploaded yet. Click "Upload" to add one!</p>
        </div>
      )}
    </CardContent>
  </Card>
);