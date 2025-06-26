import React from 'react';
import { Button } from '@/components/ui/button';

interface Photo {
  url: string;
  alt: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  title: string;
  showMoreButton?: boolean;
  onMoreClick?: () => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, title, showMoreButton, onMoreClick }) => {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-yellow-400 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <img
            key={index}
            src={photo.url}
            alt={photo.alt}
            className="w-full h-48 object-cover rounded-lg"
          />
        ))}
      </div>
      {showMoreButton && (
        <div className="text-center mt-4">
          <Button onClick={onMoreClick} className="bg-yellow-400 text-black hover:bg-yellow-500">
            View More Photos
          </Button>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;