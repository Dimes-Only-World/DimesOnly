import React, { useState, useEffect } from 'react';

const images = [
  'https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_ea2691d7-25a7-4cd7-8d4e-cf4826e6c1c3.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/Kennadie+45.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_96184858-4dad-438e-8884-105f6c880251.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/eroticgirl_7dd2dfc3-d1ef-4f54-af34-f5ea901d4125-768x1250.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d83e24cd-671a-4515-94fc-0973bd54ece5.png'
];

const RegistrationImageCarousel: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % images.length
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={image}
            alt={`Carousel ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-purple-500/20 to-blue-600/30" />
    </div>
  );
};

export default RegistrationImageCarousel;