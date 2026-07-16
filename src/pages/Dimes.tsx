import React from "react";
import DimesDirectory from "@/components/DimesDirectory";
import HomeProfileButton from "@/components/HomeProfileButton";

const DimesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-start mb-4">
          <HomeProfileButton />
        </div>
        <DimesDirectory />
      </div>
    </div>
  );
};

export default DimesPage;
