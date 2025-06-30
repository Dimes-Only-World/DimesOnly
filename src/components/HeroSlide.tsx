import React from "react";

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
  isActive,
}) => {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ${
        isActive ? "opacity-100" : "opacity-0"
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
      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4">
        <div className="text-center text-white w-full max-w-4xl mx-auto">
          <h1
            className="text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold mb-2 md:mb-4 leading-tight break-words"
            style={{
              textShadow: "0 0 10px #FF0000",
              color: "#FFFFFF",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              hyphens: "auto",
            }}
          >
            {title}
          </h1>
          <p
            className="text-sm sm:text-base md:text-lg lg:text-2xl leading-relaxed break-words"
            style={{
              textShadow: "0 0 10px #FF0000",
              color: "#FFFFFF",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              hyphens: "auto",
            }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </div>
    </div>
  );
};

export default HeroSlide;
