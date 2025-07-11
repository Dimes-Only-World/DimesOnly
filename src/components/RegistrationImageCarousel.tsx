import React, { useState, useEffect } from 'react';

const images = [
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_c50e34bf-23ac-46dd-9dd5-85b5b7279fdd.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_cce445b5-329a-4140-82d0-111f1ba6fc7e.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d49d90de-b2af-4870-9632-41b929d49efe.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d836d056-6ce5-4a36-ba3e-879622fba498.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d83e24cd-671a-4515-94fc-0973bd54ece5.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_c2328b2a-bc64-4eab-82ef-a8af1f237d6e-1320x811.png"
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