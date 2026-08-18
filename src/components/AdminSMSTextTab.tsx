import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminSMSTextTab: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Text</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">SMS text management tools will appear here.</p>
      </CardContent>
    </Card>
  );
};

export default AdminSMSTextTab;
