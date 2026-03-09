import React from "react";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import DimesDirectory from "@/components/DimesDirectory";

const DimesPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-start mb-4">
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold"
          >
            <Home className="mr-2 h-4 w-4" /> Home
          </Button>
        </div>
        <DimesDirectory />
      </div>
    </div>
  );
};

export default DimesPage;
