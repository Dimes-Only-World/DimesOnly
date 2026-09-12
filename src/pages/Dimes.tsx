import React from "react";
import DimesDirectory from "@/components/DimesDirectory";
import HomeProfileButton from "@/components/HomeProfileButton";

const DimesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070409]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(233,22,209,0.16),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(250,204,21,0.08),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex justify-start">
          <HomeProfileButton />
        </div>
        <DimesDirectory />
      </div>
    </div>
  );
};

export default DimesPage;
