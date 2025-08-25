import React from "react";
import DimesDirectory from "@/components/DimesDirectory";

const DimesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <DimesDirectory />
      </div>
    </div>
  );
};

export default DimesPage;
