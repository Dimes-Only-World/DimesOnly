import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import UserDashboard from "@/components/UserDashboard";

const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col">
      <UserDashboard />
    </div>
  );
};

export default Dashboard;
