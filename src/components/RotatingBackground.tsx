import React, { useState, useEffect } from 'react';

interface RotatingBackgroundProps {
  images: string[];
  interval?: number;
}

const RotatingBackground: React.FC<RotatingBackgroundProps> = ({ 
  images, 
  interval = 3000 
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (images.length === 0) return;

    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % images.length
      );
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval]);

  if (images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-0">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${image})`,
            backgroundAttachment: 'fixed'
          }}
        />
      ))}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
};

export default RotatingBackground;