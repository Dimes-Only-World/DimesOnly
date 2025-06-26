import React, { useEffect, useRef } from 'react';

const images = [
  'https://dimesonly.s3.us-east-2.amazonaws.com/eroticgirl_77f16c72-f054-4fcd-a954-208021412fb9-768x1250.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dimes-5-768x1250.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dime-3-768x1250.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dime-4-768x1250.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/home-dime5-768x1250.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dimes-1-768x1250.jpg',
  'https://dimesonly.s3.us-east-2.amazonaws.com/home-dimes2-768x1250.png',
  'https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dimes-2-768x1250.png'
];

interface ImageCarouselProps {
  className?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ className = '' }) => {
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const getRefParam = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref') || 'default';
  };

  const handleImageClick = () => {
    const ref = getRefParam();
    window.open(`/register?ref=${encodeURIComponent(ref)}`, '_blank');
  };

  useEffect(() => {
    const desktopContainer = desktopScrollRef.current;
    if (desktopContainer) {
      let scrollAmount = 0;
      const scrollStep = 0.5;
      const scrollDelay = 16;

      const scroll = () => {
        scrollAmount += scrollStep;
        if (scrollAmount >= desktopContainer.scrollWidth / 2) {
          scrollAmount = 0;
        }
        desktopContainer.scrollLeft = scrollAmount;
      };

      const desktopInterval = setInterval(scroll, scrollDelay);
      return () => clearInterval(desktopInterval);
    }
  }, []);

  useEffect(() => {
    const mobileContainer = mobileScrollRef.current;
    if (mobileContainer) {
      let scrollAmount = 0;
      const scrollStep = 0.3;
      const scrollDelay = 16;

      const scroll = () => {
        scrollAmount += scrollStep;
        if (scrollAmount >= mobileContainer.scrollWidth / 2) {
          scrollAmount = 0;
        }
        mobileContainer.scrollLeft = scrollAmount;
      };

      const mobileInterval = setInterval(scroll, scrollDelay);
      return () => clearInterval(mobileInterval);
    }
  }, []);

  return (
    <div className={`w-full bg-gradient-to-b from-black via-gray-900 to-black py-8 ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-white text-2xl md:text-4xl font-bold mb-2">
          MEET OUR FEATURED MODELS
        </h2>
        <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto rounded-full"></div>
      </div>
      
      {/* Desktop */}
      <div className="hidden md:block overflow-hidden">
        <div 
          ref={desktopScrollRef}
          className="flex overflow-x-hidden scrollbar-hide"
        >
          {[...images, ...images].map((src, index) => (
            <div 
              key={index} 
              className="flex-shrink-0 w-72 h-96 mx-3 group cursor-pointer"
              onClick={handleImageClick}
            >
              <div className="relative w-full h-full overflow-hidden rounded-xl shadow-2xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-pink-500/25">
                <img 
                  src={src} 
                  alt={`Model ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="font-semibold text-lg">Featured Model</p>
                  <p className="text-sm text-gray-200">Click to register</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile */}
      <div className="block md:hidden overflow-hidden">
        <div 
          ref={mobileScrollRef}
          className="flex overflow-x-hidden scrollbar-hide"
        >
          {[...images, ...images].map((src, index) => (
            <div 
              key={index} 
              className="flex-shrink-0 w-56 h-80 mx-2 group cursor-pointer"
              onClick={handleImageClick}
            >
              <div className="relative w-full h-full overflow-hidden rounded-lg shadow-xl transform transition-all duration-300 group-active:scale-95">
                <img 
                  src={src} 
                  alt={`Mobile Model ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ImageCarousel;