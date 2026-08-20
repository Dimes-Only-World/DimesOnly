import React from 'react';
import angelLoaderAsset from '../assets/angel-loader.gif.asset.json';

interface AngelLoaderProps {
  variant?: 'fullscreen' | 'inline';
  className?: string;
}

const AngelLoader: React.FC<AngelLoaderProps> = ({ variant = 'fullscreen', className = '' }) => {
  const gifUrl = angelLoaderAsset.url;

  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={gifUrl}
          alt="Loading..."
          className="w-12 h-12 object-contain"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ${className}`}
    >
      <img
        src={gifUrl}
        alt="Loading..."
        className="w-48 h-48 md:w-64 md:h-64 object-contain"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
};

export default AngelLoader;
