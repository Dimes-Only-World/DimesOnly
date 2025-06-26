import React from 'react';

interface HeroSlideProps {
  title: string;
  description: string;
  desktopImage: string;
  mobileImage: string;
  isActive: boolean;
}

const HeroSlide: React.FC<HeroSlideProps> = ({
  title,
  description,
  desktopImage,
  mobileImage,
  isActive
}) => {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Desktop Image */}
      <img
        src={desktopImage}
        alt={title}
        className="hidden md:block w-full h-full object-cover"
      />
      {/* Mobile Image */}
      <img
        src={mobileImage}
        alt={title}
        className="block md:hidden w-full h-full object-cover"
      />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h1 
            className="text-4xl md:text-6xl font-bold mb-4"
            style={{
              textShadow: '0 0 10px #FF0000',
              color: '#FFFFFF'
            }}
          >
            {title}
          </h1>
          <p 
            className="text-lg md:text-2xl"
            style={{
              textShadow: '0 0 10px #FF0000',
              color: '#FFFFFF'
            }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </div>
    </div>
  );
};

export default HeroSlide;