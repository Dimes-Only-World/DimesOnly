import React from 'react';

interface RatingGridProps {
  selectedNumber: number | null;
  ratings: {[key: number]: {userId: number, profileName: string, pageId: string}};
  onRate: (number: number) => void;
}

const RatingGrid: React.FC<RatingGridProps> = ({ selectedNumber, ratings, onRate }) => {
  const numbers = Array.from({length: 100}, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-10 gap-2 max-w-4xl mx-auto">
      {numbers.map((number) => {
        const isSelected = selectedNumber === number;
        const isRated = ratings[number];
        const isUsedOnOtherPage = number === 100; // Example
        
        return (
          <button
            key={number}
            onClick={() => onRate(number)}
            className={`
              w-12 h-12 rounded-lg font-bold text-sm transition-all duration-200
              ${isSelected 
                ? 'bg-yellow-400 text-black scale-110 shadow-lg' 
                : isRated
                ? 'bg-green-500 text-white'
                : isUsedOnOtherPage
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
              }
            `}
          >
            {number}
          </button>
        );
      })}
    </div>
  );
};

export default RatingGrid;