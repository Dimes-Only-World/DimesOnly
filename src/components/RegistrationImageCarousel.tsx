import React, { useState, useEffect } from 'react';

const images = [
  'https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_ea2691d7-25a7-4cd7-8d4e-cf4826e6c1c3.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_1e7aba95-373c-49fd-b90e-b335065488fe.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_c2328b2a-bc64-4eab-82ef-a8af1f237d6e.png'
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